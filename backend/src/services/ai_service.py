import io
import base64
import json
import logging
from typing import Dict, Any, Optional, List
import httpx
from PIL import Image, ImageOps

from src.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_ANIMAL_TYPES = {
    "Mammal", "Bird", "Reptile", "Fish", "Amphibian", "Insect", "Invertebrate", "Unknown"
}
ALLOWED_HABITAT_TAGS = {"aquatic", "mountain", "safari"}

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"]


class AIException(Exception):
    """Base exception for AI identification service."""
    def __init__(self, message: str, status_code: int = 502, code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class AIConfigurationError(AIException):
    def __init__(self, message: str = "Animal analysis is not configured yet. Please try again later."):
        super().__init__(message, status_code=503, code="service_not_configured")


class AIRateLimitError(AIException):
    def __init__(self, message: str = "The analysis service is busy. Please wait a moment.", retry_after: int = 30):
        super().__init__(message, status_code=429, code="service_busy")
        self.retry_after = retry_after


class AIServiceUnavailableError(AIException):
    def __init__(self, message: str = "The AI service is unavailable. Please try again later."):
        super().__init__(message, status_code=502, code="service_unavailable")


class AIInvalidImageError(AIException):
    def __init__(self, message: str = "The analysis service could not read this photo. Please take another photo."):
        super().__init__(message, status_code=422, code="invalid_image")


class AIService:
    def __init__(self):
        self.model = settings.GEMINI_MODEL or "gemini-flash-lite-latest"
        self.api_key = settings.GEMINI_API_KEY

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def optimize_image(self, image_bytes: bytes, max_dimension: int = 1024, quality: int = 85) -> bytes:
        """
        Strips EXIF, corrects orientation, resizes, and compresses the image to JPEG.
        Protects user privacy and dramatically reduces network bandwidth and AI latency.
        """
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img = ImageOps.exif_transpose(img) or img

                if img.mode != "RGB":
                    img = img.convert("RGB")

                if img.width > max_dimension or img.height > max_dimension:
                    img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

                output_buffer = io.BytesIO()
                img.save(output_buffer, format="JPEG", quality=quality, optimize=True)
                return output_buffer.getvalue()
        except Exception as e:
            logger.warning(f"[AI Service] Could not optimize image: {e}")
            raise AIInvalidImageError("Could not decode image format.")

    def identify_animal(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Identifies animals in the image using Google Gemini Multimodal Vision API.
        Returns a dictionary conforming to AnimalIdentification schema.
        """
        if not self.is_configured():
            raise AIConfigurationError()

        # 1. Optimize image (resizing + EXIF stripping for privacy & speed)
        optimized_jpeg = self.optimize_image(image_bytes)
        base64_data = base64.b64encode(optimized_jpeg).decode("utf-8")

        prompt = (
            "You are an expert wildlife biologist for an animal photography collection game.\n"
            "Analyze the image carefully to identify any animal, bird, fish, reptile, insect, or domestic pet.\n\n"
            "Rules:\n"
            "1. If an animal is present, return:\n"
            "   - 'found': true\n"
            "   - 'species': common English name (e.g. 'Hippopotamus', 'Red Fox', 'Badger', 'Tiger', 'Goldfish', 'Domestic Cat')\n"
            "   - 'animalType': exactly one of ['Mammal', 'Bird', 'Reptile', 'Fish', 'Amphibian', 'Insect', 'Invertebrate', 'Unknown']\n"
            "   - 'habitatTags': array with any matching items from ['aquatic', 'mountain', 'safari'] (can be empty)\n"
            "   - 'story': an engaging, delightful 1-2 sentence description highlighting this animal's traits\n\n"
            "2. If no animal is clearly visible (scenery only, inanimate object, or humans without animals), return:\n"
            "   - 'found': false\n"
            "   - 'species': ''\n"
            "   - 'animalType': 'Unknown'\n"
            "   - 'habitatTags': []\n"
            "   - 'story': ''\n\n"
            "Respond ONLY with valid JSON."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64_data,
                            }
                        },
                        {"text": prompt},
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        }

        # 2. Try configured model first, fallback to alternate if 503/429
        models_to_try = [self.model]
        for m in FALLBACK_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        last_error = None
        response = None

        with httpx.Client(timeout=30.0) as client:
            for model_name in models_to_try:
                url = f"{GEMINI_API_BASE}/models/{model_name}:generateContent?key={self.api_key}"
                try:
                    res = client.post(url, json=payload)
                    if res.status_code == 200:
                        response = res
                        break
                    elif res.status_code == 429:
                        last_error = AIRateLimitError()
                        continue
                    elif res.status_code in (500, 502, 503, 504):
                        logger.warning(f"[AI Service] Model {model_name} returned {res.status_code}. Trying next...")
                        last_error = AIServiceUnavailableError()
                        continue
                    else:
                        logger.error(f"[AI Service] Gemini error {res.status_code}: {res.text}")
                        last_error = AIServiceUnavailableError()
                except httpx.TimeoutException:
                    logger.warning(f"[AI Service] Model {model_name} timed out. Trying next...")
                    last_error = AIException("Animal analysis took too long. Please try again.", status_code=504)
                except httpx.RequestError as e:
                    logger.error(f"[AI Service] Network error calling Gemini ({model_name}): {e}")
                    last_error = AIServiceUnavailableError()

        if response is None:
            if last_error:
                raise last_error
            raise AIServiceUnavailableError()

        # 3. Parse and validate output
        try:
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini.")

            content_parts = candidates[0].get("content", {}).get("parts", [])
            if not content_parts:
                raise ValueError("No content parts in Gemini candidate.")

            raw_text = content_parts[0].get("text", "").strip()
            parsed = json.loads(raw_text)
            if isinstance(parsed, list):
                parsed = parsed[0] if len(parsed) > 0 and isinstance(parsed[0], dict) else {}
            elif not isinstance(parsed, dict):
                parsed = {}
        except Exception as e:
            logger.error(f"[AI Service] Failed to parse Gemini response: {e}")
            raise AIServiceUnavailableError("The analysis service returned an invalid response. Please try again.")

        # 4. Normalize and sanitize values to match contract
        found = bool(parsed.get("found", False))
        species = str(parsed.get("species", "")).strip() if found else ""
        story = str(parsed.get("story", "")).strip() if found else ""
        raw_type = parsed.get("animalType", "Unknown")
        animal_type = raw_type if raw_type in ALLOWED_ANIMAL_TYPES else "Unknown"

        raw_tags = parsed.get("habitatTags", [])
        habitat_tags = [t for t in raw_tags if t in ALLOWED_HABITAT_TAGS] if isinstance(raw_tags, list) else []

        if found and not species:
            found = False

        return {
            "found": found,
            "species": species,
            "story": story,
            "animalType": animal_type,
            "habitatTags": habitat_tags,
        }


ai_service = AIService()
