from datetime import datetime
from . import db

class Media(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id', ondelete='CASCADE'), nullable=False)
    media_type = db.Column(db.String(10), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    title = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'media_type': self.media_type,
            'file_path': self.file_path,
            'title': self.title,
            'description': self.description
        }