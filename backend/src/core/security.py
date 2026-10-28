import re
from pathlib import Path
from typing import Optional


# Allowed filename regex: only alphanumeric, underscores, hyphens, and single dot for extension
SAFE_FILENAME_REGEX = re.compile(r"^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$")


def validate_image_bytes(image_bytes: bytes) -> str:
    """
    Validates image data using file magic signatures (magic bytes) to prevent
    arbitrary file upload, web shells, and script execution disguised as images.
    Returns the detected MIME content type.
    Raises ValueError if the bytes do not match supported image formats.
    """
    if not image_bytes or len(image_bytes) < 12:
        raise ValueError("File is too small or empty to be a valid image.")

    # 1. JPEG: \xFF\xD8\xFF
    if image_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    # 2. PNG: \x89PNG\r\n\x1a\n
    if image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"

    # 3. WebP: Starts with 'RIFF' and has 'WEBP' at offset 8-12
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"

    raise ValueError("Unsupported or invalid image format. Only JPEG, PNG, and WebP are allowed.")


def sanitize_filename(filename: str) -> Optional[str]:
    """
    Sanitizes and validates an object/file name to prevent Path Traversal (LFI).
    Ensures no directory separators, null bytes, or traversal sequences ('..') exist.
    """
    if not filename or "\x00" in filename:
        return None

    # Path(filename).name strips directory prefixes
    clean_name = Path(filename).name
    if clean_name != filename:
        return None

    if ".." in clean_name or "/" in clean_name or "\\" in clean_name:
        return None

    if not SAFE_FILENAME_REGEX.match(clean_name):
        return None

    return clean_name
