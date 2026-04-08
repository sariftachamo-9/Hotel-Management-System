import os
import logging
from werkzeug.utils import secure_filename
from datetime import datetime
from utils.validators import validate_file_extension, sanitize_filename

try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional dependency fallback
    Image = None
    logging.getLogger(__name__).warning("Pillow is not installed; uploaded files will not be image-verified.")

def allowed_file(filename, allowed_extensions):
    """Check if file extension is allowed"""
    return validate_file_extension(filename, allowed_extensions)

def save_uploaded_file(file, upload_folder, allowed_extensions):
    """Save uploaded file securely"""
    if not file:
        return None, "No file provided"
    
    if file.filename == '':
        return None, "No file selected"
    
    if not allowed_file(file.filename, allowed_extensions):
        return None, f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"

    if Image is not None:
        try:
            file.stream.seek(0)
            Image.open(file.stream).verify()
            file.stream.seek(0)
        except Exception:
            return None, "Uploaded file is not a valid image."
    
    # Create upload folder if it doesn't exist
    os.makedirs(upload_folder, exist_ok=True)
    
    # Generate unique filename
    original_filename = secure_filename(file.filename)
    filename_parts = original_filename.rsplit('.', 1)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_filename = f"{filename_parts[0]}_{timestamp}.{filename_parts[1]}"
    
    # Save file
    filepath = os.path.join(upload_folder, unique_filename)
    file.save(filepath)
    
    return filepath, None

def delete_file(filepath):
    """Delete file if it exists"""
    try:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
            return True
    except Exception as e:
        print(f"Error deleting file: {e}")
    return False
