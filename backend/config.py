# backend/config.py
import os

# Database configuration
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///family_tree.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Upload folder for media files
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size