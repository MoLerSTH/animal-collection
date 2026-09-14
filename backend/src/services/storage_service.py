import io
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from src.core.config import settings

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


class StorageService:
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        self.s3_client = None
        self.s3_available = False
        self._init_s3()

    def _init_s3(self):
        try:
            boto_config = Config(
                connect_timeout=0.5,
                read_timeout=1,
                retries={"max_attempts": 1}
            )
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name="us-east-1",
                config=boto_config,
            )
        except Exception as e:
            print(f"[Storage] Could not initialize S3 client: {e}. Falling back to local storage.")
            self.s3_client = None

    def ensure_bucket_exists(self):
        """Verify or create the S3 bucket. If S3 fails, prepare local directory."""
        if not self.s3_client:
            self.s3_available = False
            LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            return

        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            self.s3_available = True
            print(f"[Storage] S3 Bucket '{self.bucket_name}' verified.")
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                self.s3_available = True
                print(f"[Storage] Created S3 Bucket '{self.bucket_name}'.")
            except Exception as err:
                print(f"[Storage] Error creating S3 bucket ({err}). Using local fallback.")
                self.s3_available = False
                LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        except Exception as err:
            print(f"[Storage] S3 unreachable ({err}). Using local directory fallback.")
            self.s3_available = False
            LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    def upload_photo(
        self,
        file_bytes: bytes,
        content_type: str = "image/jpeg",
        user_id: Optional[str] = None,
        extension: str = "jpg"
    ) -> str:
        """
        Uploads image file bytes to S3 or local directory.
        Returns a normalized relative API storage path: e.g. 'photos/<filename>'
        """
        file_ext = extension.lstrip(".")
        user_prefix = f"user_{user_id}" if user_id else "general"
        object_name = f"{user_prefix}_{uuid.uuid4().hex[:12]}.{file_ext}"

        # 1. Attempt upload to MinIO S3 if available
        if self.s3_available and self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=object_name,
                    Body=file_bytes,
                    ContentType=content_type,
                )
                print(f"[Storage] Uploaded '{object_name}' to S3 bucket '{self.bucket_name}'.")
                return f"/api/v1/storage/photos/{object_name}"
            except Exception as e:
                print(f"[Storage] S3 upload failed ({e}), switching to local fallback.")
                self.s3_available = False

        # 2. Fallback to local disk storage
        LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        local_path = LOCAL_UPLOAD_DIR / object_name
        local_path.write_bytes(file_bytes)
        print(f"[Storage] Saved '{object_name}' to local disk at {local_path}.")
        return f"/api/v1/storage/photos/{object_name}"

    def get_photo_file(self, object_name: str) -> Optional[Tuple[io.BytesIO, str]]:
        """
        Retrieves image stream and content type.
        """
        # Determine content type from extension
        ext = object_name.split(".")[-1].lower()
        content_type = "image/png" if ext == "png" else "image/jpeg"

        # 1. Try local disk first if exists
        local_path = LOCAL_UPLOAD_DIR / object_name
        if local_path.exists():
            return io.BytesIO(local_path.read_bytes()), content_type

        # 2. Try S3 if available
        if self.s3_available and self.s3_client:
            try:
                resp = self.s3_client.get_object(Bucket=self.bucket_name, Key=object_name)
                stream = io.BytesIO(resp["Body"].read())
                return stream, resp.get("ContentType", content_type)
            except Exception:
                pass

        return None


storage_service = StorageService()
