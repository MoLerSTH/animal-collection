import pytest
from src.core.security import validate_image_bytes, sanitize_filename
from src.services.storage_service import storage_service


def test_validate_image_bytes_jpeg():
    fake_jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 20
    assert validate_image_bytes(fake_jpeg) == "image/jpeg"


def test_validate_image_bytes_png():
    fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
    assert validate_image_bytes(fake_png) == "image/png"


def test_validate_image_bytes_webp():
    fake_webp = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 20
    assert validate_image_bytes(fake_webp) == "image/webp"


def test_validate_image_bytes_invalid():
    invalid_script = b"<?php echo 'malicious'; ?>"
    with pytest.raises(ValueError, match="Unsupported or invalid image format"):
        validate_image_bytes(invalid_script)


def test_sanitize_filename_valid():
    assert sanitize_filename("photo_123.jpg") == "photo_123.jpg"
    assert sanitize_filename("user-avatar_test-01.png") == "user-avatar_test-01.png"


def test_sanitize_filename_path_traversal():
    assert sanitize_filename("../../etc/passwd") is None
    assert sanitize_filename("../.env") is None
    assert sanitize_filename("/etc/shadow") is None
    assert sanitize_filename("..\\..\\windows\\system32") is None
    assert sanitize_filename("foo/bar.jpg") is None
    assert sanitize_filename("bad\x00null.jpg") is None


def test_storage_service_path_traversal_blocked():
    result = storage_service.get_photo_file("../../.env")
    assert result is None
