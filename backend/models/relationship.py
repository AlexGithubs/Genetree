from datetime import datetime
from . import db

class Relationship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    person1_id = db.Column(db.Integer, db.ForeignKey('person.id', ondelete='CASCADE'), nullable=False)
    person2_id = db.Column(db.Integer, db.ForeignKey('person.id', ondelete='CASCADE'), nullable=False)
    relationship_type = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # References
    person1 = db.relationship('Person', foreign_keys=[person1_id])
    person2 = db.relationship('Person', foreign_keys=[person2_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'person1_id': self.person1_id,
            'person2_id': self.person2_id,
            'relationship_type': self.relationship_type,
            'description': self.description
        }