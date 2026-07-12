import io
from fastapi import UploadFile
from minio.error import S3Error

from .minio_client import minio_client, minio_external_client, MINIO_BUCKET, ensure_bucket

# Ensure bucket exists at import time
try:
    ensure_bucket()
except S3Error:
    pass


def upload_file(file: UploadFile, folder: str, entity_id: int, label: str) -> str:
    """
    Uploads a file to MinIO under {folder}/{entity_id}_{label}.{ext}.
    Returns the object key (path within the bucket).
    """
    content = file.file.read()
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin"
    object_name = f"{folder}/{entity_id}_{label}.{ext}"

    data = io.BytesIO(content)
    minio_client.put_object(
        MINIO_BUCKET,
        object_name,
        data,
        length=len(content),
        content_type=file.content_type or "application/octet-stream",
    )
    return object_name


def get_file_data(object_key: str) -> tuple[io.BytesIO, str, int]:
    """
    Reads the file fully into memory and returns (data_buffer, content_type, size).
    Raises S3Error if the object does not exist.
    """
    response = minio_client.get_object(MINIO_BUCKET, object_key)
    try:
        content_type = response.headers.get("Content-Type", "application/octet-stream")
        data = io.BytesIO(response.read())
        size = data.getbuffer().nbytes
        data.seek(0)
        return data, content_type, size
    finally:
        response.close()
        response.release_conn()


def get_file_url(object_key: str) -> str:
    """
    Returns a presigned URL signed against the externally reachable MinIO endpoint
    (e.g. localhost:9000) so the browser can follow the redirect.
    Valid for 1 hour by default.
    """
    return minio_external_client.presigned_get_object(MINIO_BUCKET, object_key)


def delete_file(object_key: str) -> None:
    """Removes an object from the bucket."""
    try:
        minio_client.remove_object(MINIO_BUCKET, object_key)
    except S3Error:
        pass
