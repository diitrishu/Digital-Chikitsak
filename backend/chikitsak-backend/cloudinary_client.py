import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

load_dotenv()

# Cloudinary supports config via CLOUDINARY_URL directly
cloudinary_url = os.getenv("CLOUDINARY_URL")
if cloudinary_url:
    cloudinary.config(cloudinary_url=cloudinary_url, secure=True)
else:
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )

def upload_file(file_path_or_bytes, folder="chikitsak", resource_type="auto", public_id=None):
    """Upload a file to Cloudinary. Returns the upload result dict."""
    options = {
        "folder": folder,
        "resource_type": resource_type,
    }
    if public_id:
        options["public_id"] = public_id
    return cloudinary.uploader.upload(file_path_or_bytes, **options)

def upload_health_record(file, patient_id, record_type="report"):
    """Upload a health record file under patient-specific folder."""
    folder = f"chikitsak/health_records/{patient_id}"
    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="auto",
        tags=[record_type, "health_record", patient_id]
    )
    return {
        "public_id": result["public_id"],
        "secure_url": result["secure_url"],
        "resource_type": result["resource_type"],
        "format": result.get("format"),
        "bytes": result.get("bytes"),
        "created_at": result.get("created_at"),
    }

def upload_profile_image(file, patient_id):
    """Upload a profile image with auto face-crop transformation."""
    result = cloudinary.uploader.upload(
        file,
        folder=f"chikitsak/profiles",
        public_id=f"patient_{patient_id}",
        overwrite=True,
        resource_type="image",
        transformation=[
            {"width": 200, "height": 200, "crop": "fill", "gravity": "face"}
        ]
    )
    return result["secure_url"]

def delete_file(public_id, resource_type="image"):
    """Delete a file from Cloudinary by public_id."""
    return cloudinary.uploader.destroy(public_id, resource_type=resource_type)

def get_file_url(public_id, resource_type="image", transformation=None):
    """Get a secure URL for a Cloudinary asset."""
    options = {"secure": True}
    if transformation:
        options["transformation"] = transformation
    return cloudinary.CloudinaryImage(public_id).build_url(**options)
