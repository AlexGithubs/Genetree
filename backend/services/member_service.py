#member_service.py
from models import db
from models.person import Person
from models.custom_field import CustomField
from models.media import Media
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from flask import current_app

class MemberService:
    @staticmethod
    def get_all_members():
        """Get all members from the database"""
        return Person.query.all()
    
    @staticmethod
    def get_member_by_id(member_id):
        """Get a member by ID"""
        return Person.query.get(member_id)
    
    @staticmethod
    def create_member(data):
        """Create a new member"""
        # Parse dates if provided
        birth_date = None
        death_date = None
        
        if 'birth_date' in data and data['birth_date']:
            try:
                birth_date = datetime.fromisoformat(data['birth_date'].replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid birth date format')
        
        if 'death_date' in data and data['death_date']:
            try:
                death_date = datetime.fromisoformat(data['death_date'].replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid death date format')
        
        # Create new person
        new_person = Person(
            first_name=data['first_name'],
            last_name=data['last_name'],
            gender=data.get('gender'),
            birth_date=birth_date,
            death_date=death_date,
            biography=data.get('biography')
        )
        
        db.session.add(new_person)
        db.session.flush()  # Get the ID without committing
        
        # Add custom fields if provided
        if 'custom_fields' in data and isinstance(data['custom_fields'], list):
            for field_data in data['custom_fields']:
                if 'field_name' in field_data and 'field_value' in field_data:
                    custom_field = CustomField(
                        person_id=new_person.id,
                        field_name=field_data['field_name'],
                        field_value=field_data['field_value']
                    )
                    db.session.add(custom_field)
        
        db.session.commit()
        return new_person
    
    @staticmethod
    def update_member(member_id, data):
        """Update an existing member"""
        member = Person.query.get(member_id)
        
        if not member:
            raise ValueError(f"Member with ID {member_id} not found")
        
        # Update basic info
        if 'first_name' in data:
            member.first_name = data['first_name']
        if 'last_name' in data:
            member.last_name = data['last_name']
        if 'gender' in data:
            member.gender = data['gender']
        if 'biography' in data:
            member.biography = data['biography']
        
        # Parse dates if provided
        if 'birth_date' in data:
            if data['birth_date']:
                try:
                    member.birth_date = datetime.fromisoformat(data['birth_date'].replace('Z', '+00:00'))
                except ValueError:
                    raise ValueError('Invalid birth date format')
            else:
                member.birth_date = None
        
        if 'death_date' in data:
            if data['death_date']:
                try:
                    member.death_date = datetime.fromisoformat(data['death_date'].replace('Z', '+00:00'))
                except ValueError:
                    raise ValueError('Invalid death date format')
            else:
                member.death_date = None
        
        # Update custom fields if provided
        if 'custom_fields' in data and isinstance(data['custom_fields'], list):
            # Remove existing custom fields
            CustomField.query.filter_by(person_id=member.id).delete()
            
            # Add new custom fields
            for field_data in data['custom_fields']:
                if 'field_name' in field_data and 'field_value' in field_data:
                    custom_field = CustomField(
                        person_id=member.id,
                        field_name=field_data['field_name'],
                        field_value=field_data['field_value']
                    )
                    db.session.add(custom_field)
        
        db.session.commit()
        return member
    
    @staticmethod
    def delete_member(member_id):
        """Delete a member"""
        member = Person.query.get(member_id)
        
        if not member:
            raise ValueError(f"Member with ID {member_id} not found")
        
        db.session.delete(member)
        db.session.commit()
        return True
    
    @staticmethod
    def save_media(member_id, file, title, description):
        """Save media file for a member"""
        # Check if the member exists
        member = Person.query.get(member_id)
        
        if not member:
            raise ValueError(f"Member with ID {member_id} not found")
        
        filename = secure_filename(file.filename)
        
        # Make sure the upload folder exists
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        # Create a folder for this member if it doesn't exist
        member_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], str(member_id))
        os.makedirs(member_folder, exist_ok=True)
        
        file_path = os.path.join(member_folder, filename)
        file.save(file_path)
        
        # Determine media type based on file extension
        media_type = 'photo'
        if filename.rsplit('.', 1)[1].lower() in {'mp4', 'mov'}:
            media_type = 'video'
        
        # Create a new media record
        new_media = Media(
            person_id=member_id,
            media_type=media_type,
            file_path=os.path.join(str(member_id), filename),  # Store relative path
            title=title or '',
            description=description or ''
        )
        
        db.session.add(new_media)
        db.session.commit()
        
        return new_media
    
    @staticmethod
    def delete_media(media_id, member_id=None):
        """Delete media for a member"""
        media = Media.query.get(media_id)
        
        if not media:
            raise ValueError(f"Media with ID {media_id} not found")
        
        # Verify the media belongs to the specified member if provided
        if member_id and media.person_id != member_id:
            raise ValueError(f"Media does not belong to member with ID {member_id}")
        
        # Delete the file from the filesystem
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], media.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete the database record
        db.session.delete(media)
        db.session.commit()
        
        return True