import re
from datetime import date

def validate_phone(phone):
    """Validate phone number format"""
    # Basic phone validation (adjust pattern as needed)
    pattern = r'^\+?[1-9]\d{1,14}$'
    return bool(re.match(pattern, phone))

def validate_id_number(id_type, id_number):
    """Validate ID number based on type"""
    if id_type == 'citizenship':
        # Nepal citizenship format validation (adjust as needed)
        return len(id_number) >= 5 and len(id_number) <= 20
    elif id_type == 'passport':
        # Passport format validation (adjust as needed)
        return len(id_number) >= 6 and len(id_number) <= 20
    return False

def validate_date_range(check_in, check_out):
    """Validate check-in and check-out dates"""
    if not isinstance(check_in, date) or not isinstance(check_out, date):
        return False, "Invalid date format"
    
    if check_in >= check_out:
        return False, "Check-out date must be after check-in date"
    
    if check_in < date.today():
        return False, "Check-in date cannot be in the past"
    
    return True, None

def validate_file_extension(filename, allowed_extensions):
    """Validate file extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def sanitize_filename(filename):
    """Sanitize filename to prevent security issues"""
    # Remove path components
    filename = filename.replace('/', '').replace('\\', '')
    # Remove potentially dangerous characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    return filename
