from flask import request
from werkzeug.utils import secure_filename
import os
from datetime import datetime

def validate_member_data(data, is_update=False):
    """
    Validate member data
    
    Args:
        data: The request data to validate
        is_update: Whether this is for an update operation
    
    Returns:
        (is_valid, errors): Tuple of boolean and error messages
    """
    errors = []
    
    # Check for required fields if not an update
    if not is_update:
        if not data.get('first_name'):
            errors.append("First name is required")
        if not data.get('last_name'):
            errors.append("Last name is required")
    
    # Validate dates if provided
    if 'birth_date' in data and data['birth_date']:
        try:
            datetime.fromisoformat(data['birth_date'].replace('Z', '+00:00'))
        except ValueError:
            errors.append("Invalid birth date format. Use ISO format (YYYY-MM-DD)")
    
    if 'death_date' in data and data['death_date']:
        try:
            datetime.fromisoformat(data['death_date'].replace('Z', '+00:00'))
        except ValueError:
            errors.append("Invalid death date format. Use ISO format (YYYY-MM-DD)")
    
    # Validate gender if provided
    if 'gender' in data and data['gender']:
        if data['gender'] not in ['male', 'female', 'other', 'unknown']:
            errors.append("Gender must be one of: male, female, other, unknown")
    
    # Validate custom_fields if provided
    if 'custom_fields' in data:
        if not isinstance(data['custom_fields'], list):
            errors.append("custom_fields must be an array")
        else:
            for i, field in enumerate(data['custom_fields']):
                if not isinstance(field, dict):
                    errors.append(f"custom_fields[{i}] must be an object")
                elif 'field_name' not in field:
                    errors.append(f"custom_fields[{i}] is missing field_name")
    
    return (len(errors) == 0, errors)

def validate_relationship_data(data):
    """
    Validate relationship data
    
    Args:
        data: The request data to validate
    
    Returns:
        (is_valid, errors): Tuple of boolean and error messages
    """
    errors = []
    
    # Check for required fields
    if not data.get('person1_id'):
        errors.append("person1_id is required")
    if not data.get('person2_id'):
        errors.append("person2_id is required")
    if not data.get('relationship_type'):
        errors.append("relationship_type is required")
    
    # Validate IDs are different
    if data.get('person1_id') and data.get('person2_id') and data['person1_id'] == data['person2_id']:
        errors.append("person1_id and person2_id must be different")
    
    # Validate relationship type
    if data.get('relationship_type') and data['relationship_type'] not in ['parent-child', 'child-parent', 'spouse', 'sibling', 'other']:
        errors.append("relationship_type must be one of: parent-child, child-parent, spouse, sibling, other")
    
    return (len(errors) == 0, errors)

def allowed_file(filename, allowed_extensions):
    """
    Check if a file has an allowed extension
    
    Args:
        filename: The filename to check
        allowed_extensions: Set of allowed file extensions
    
    Returns:
        Boolean indicating if the file is allowed
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def validate_media_upload(request, allowed_extensions):
    """
    Validate media upload request
    
    Args:
        request: The Flask request object
        allowed_extensions: Set of allowed file extensions
    
    Returns:
        (is_valid, errors, file): Tuple of boolean, error messages, and file object
    """
    errors = []
    
    # Check if the post request has the file part
    if 'file' not in request.files:
        errors.append("No file part in the request")
        return False, errors, None
    
    file = request.files['file']
    
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
        errors.append("No selected file")
        return False, errors, None
    
    if not allowed_file(file.filename, allowed_extensions):
        errors.append(f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}")
        return False, errors, None
    
    return True, [], file