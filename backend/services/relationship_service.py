#relationship_service.py
from models import db
from models.relationship import Relationship
from models.person import Person

class RelationshipService:
    @staticmethod
    def get_all_relationships():
        """Get all relationships"""
        return Relationship.query.all()
    
    @staticmethod
    def get_relationship_by_id(relationship_id):
        """Get a relationship by ID"""
        return Relationship.query.get(relationship_id)
    
    @staticmethod
    def get_person_relationships(person_id):
        """Get all relationships for a person"""
        return Relationship.query.filter(
            (Relationship.person1_id == person_id) | (Relationship.person2_id == person_id)
        ).all()
    
    @staticmethod
    def create_relationship(data):
        """Create a new relationship"""
        # Verify both persons exist
        person1 = Person.query.get(data['person1_id'])
        person2 = Person.query.get(data['person2_id'])
        
        if not person1 or not person2:
            raise ValueError("One or both persons do not exist")
        
        # Check if relationship already exists between these two persons
        existing_relationship = Relationship.query.filter_by(
            person1_id=data['person1_id'],
            person2_id=data['person2_id'],
            relationship_type=data['relationship_type']
        ).first()
        
        if existing_relationship:
            # Relationship already exists, return it instead of creating a duplicate
            return existing_relationship
        
        # Create the relationship
        new_relationship = Relationship(
            person1_id=data['person1_id'],
            person2_id=data['person2_id'],
            relationship_type=data['relationship_type'],
            description=data.get('description')
        )
        
        db.session.add(new_relationship)
        
        # For parent-child relationships, create the reciprocal relationship automatically
        if data['relationship_type'] == 'parent-child':
            # Check if reciprocal relationship already exists
            existing_reciprocal = Relationship.query.filter_by(
                person1_id=data['person2_id'],  # Child
                person2_id=data['person1_id'],  # Parent
                relationship_type='child-parent'
            ).first()
            
            if not existing_reciprocal:
                # Add the reciprocal relationship (from child to parent)
                reciprocal = Relationship(
                    person1_id=data['person2_id'],  # Child
                    person2_id=data['person1_id'],  # Parent
                    relationship_type='child-parent',
                    description=data.get('description')
                )
                db.session.add(reciprocal)
        
        # For spouse relationships, create the reciprocal relationship automatically
        elif data['relationship_type'] == 'spouse':
            # Check if reciprocal relationship already exists
            existing_reciprocal = Relationship.query.filter_by(
                person1_id=data['person2_id'],
                person2_id=data['person1_id'],
                relationship_type='spouse'
            ).first()
            
            if not existing_reciprocal:
                # Add the reciprocal relationship (spouse works both ways)
                reciprocal = Relationship(
                    person1_id=data['person2_id'],
                    person2_id=data['person1_id'],
                    relationship_type='spouse',
                    description=data.get('description')
                )
                db.session.add(reciprocal)
        
        # For sibling relationships, create the reciprocal relationship automatically
        elif data['relationship_type'] == 'sibling':
            # Check if reciprocal relationship already exists
            existing_reciprocal = Relationship.query.filter_by(
                person1_id=data['person2_id'],
                person2_id=data['person1_id'],
                relationship_type='sibling'
            ).first()
            
            if not existing_reciprocal:
                # Add the reciprocal relationship (sibling works both ways)
                reciprocal = Relationship(
                    person1_id=data['person2_id'],
                    person2_id=data['person1_id'],
                    relationship_type='sibling',
                    description=data.get('description')
                )
                db.session.add(reciprocal)
        
        db.session.commit()
        return new_relationship
    
    @staticmethod
    def update_relationship(relationship_id, data):
        """Update an existing relationship"""
        relationship = Relationship.query.get(relationship_id)
        
        if not relationship:
            raise ValueError(f"Relationship with ID {relationship_id} not found")
        
        # Update fields
        if 'relationship_type' in data:
            relationship.relationship_type = data['relationship_type']
        if 'description' in data:
            relationship.description = data['description']
        
        db.session.commit()
        return relationship
    
    @staticmethod
    def delete_relationship(relationship_id):
        """Delete a relationship and its reciprocal if it exists"""
        relationship = Relationship.query.get(relationship_id)
        
        if not relationship:
            raise ValueError(f"Relationship with ID {relationship_id} not found")
        
        # Find and delete reciprocal relationship if it exists
        reciprocal = Relationship.query.filter_by(
            person1_id=relationship.person2_id,
            person2_id=relationship.person1_id
        ).first()
        
        if reciprocal:
            db.session.delete(reciprocal)
        
        db.session.delete(relationship)
        db.session.commit()
        return True
