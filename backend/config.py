# backend/config.py
import os

# Database configuration
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///family_tree.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Upload folder for media files
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {
    # Images
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'tiff', 'webp',
    # Videos
    'mp4', 'mov', 'avi', 'wmv', 'mkv',
    # Documents
    'pdf', 'txt', 'doc', 'docx', 'rtf', 'odt',
    # Audio
    'mp3', 'wav', 'ogg', 'm4a'
}
MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32MB max upload size