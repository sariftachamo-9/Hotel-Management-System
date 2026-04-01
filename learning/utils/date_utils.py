from datetime import datetime, date, timedelta

def calculate_nights(check_in, check_out):
    """Calculate number of nights between check-in and check-out"""
    if isinstance(check_in, datetime):
        check_in = check_in.date()
    if isinstance(check_out, datetime):
        check_out = check_out.date()
    
    delta = check_out - check_in
    return delta.days

def check_date_conflict(check_in, check_out, existing_check_in, existing_check_out):
    """Check if two date ranges conflict"""
    if isinstance(check_in, datetime):
        check_in = check_in.date()
    if isinstance(check_out, datetime):
        check_out = check_out.date()
    if isinstance(existing_check_in, datetime):
        existing_check_in = existing_check_in.date()
    if isinstance(existing_check_out, datetime):
        existing_check_out = existing_check_out.date()
    
    # Check if dates overlap
    return not (check_out <= existing_check_in or check_in >= existing_check_out)

def format_date(date_obj):
    """Format date for display"""
    if isinstance(date_obj, datetime):
        return date_obj.strftime('%Y-%m-%d %H:%M:%S')
    elif isinstance(date_obj, date):
        return date_obj.strftime('%Y-%m-%d')
    return str(date_obj)

def parse_date(date_string):
    """Parse date string to date object"""
    try:
        return datetime.strptime(date_string, '%Y-%m-%d').date()
    except:
        return None
