import os
from urllib.parse import urlparse
from minio import Minio
from minio.error import S3Error

MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "transitops-documents")

# Internal client for actual S3 operations (talks to minio:9000 inside Docker)
minio_client = Minio(
    os.getenv("MINIO_ENDPOINT", "localhost:9000"),
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)

# External client used only for generating presigned URLs the browser can reach
_external_raw = os.getenv("MINIO_EXTERNAL_URL", "http://localhost:9000")
_external_parsed = urlparse(_external_raw)
minio_external_client = Minio(
    _external_parsed.netloc,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=_external_parsed.scheme == "https",
)


def ensure_bucket() -> None:
    """Creates the default bucket if it does not already exist."""
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)
