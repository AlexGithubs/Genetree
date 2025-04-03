from flask import Blueprint, jsonify
from models.person import Person
from models.relationship import Relationship

family_tree_bp = Blueprint('family_tree', __name__, url_prefix='/api/family_tree')

@family_tree_bp.route('', methods=['GET'])
def get_family_tree():
    # Fetch all persons
    persons = Person.query.all()
    
    # Fetch all relationships
    relationships = Relationship.query.all()
    
    # Format data for the tree visualization
    tree_data = {
        'nodes': [create_node(person) for person in persons],
        'links': [create_link(rel) for rel in relationships]
    }
    
    return jsonify(tree_data)

@family_tree_bp.route('/root/<int:person_id>', methods=['GET'])
def get_family_tree_from_root(person_id):
    # Verify the person exists
    root_person = Person.query.get_or_404(person_id)
    
    # Build tree data recursively
    tree_data = build_tree_from_root(root_person)
    
    return jsonify(tree_data)

def create_node(person):
    """Create a node representation for a person"""
    return {
        'id': person.id,
        'name': f"{person.first_name} {person.last_name}",
        'gender': person.gender,
        'birth_date': person.birth_date.isoformat() if person.birth_date else None,
        'death_date': person.death_date.isoformat() if person.death_date else None,
        'has_profile': True  # Indicates this person has a detailed profile
    }

def create_link(relationship):
    """Create a link representation for a relationship"""
    return {
        'source': relationship.person1_id,
        'target': relationship.person2_id,
        'type': relationship.relationship_type
    }

def build_tree_from_root(root_person, max_depth=3, current_depth=0, visited=None):
    """
    Recursively build a family tree starting from a root person.
    
    Args:
        root_person: The Person object to start from
        max_depth: Maximum depth to traverse (prevent infinite recursion)
        current_depth: Current depth in the recursion
        visited: Set of visited person IDs to prevent cycles
    
    Returns:
        Dict with nodes and links representing the family tree
    """
    if visited is None:
        visited = set()
    
    if current_depth > max_depth or root_person.id in visited:
        return {'nodes': [], 'links': []}
    
    visited.add(root_person.id)
    
    # Start with the root node
    nodes = [create_node(root_person)]
    links = []
    
    # Get all relationships for this person
    relationships = Relationship.query.filter(
        (Relationship.person1_id == root_person.id) | (Relationship.person2_id == root_person.id)
    ).all()
    
    for rel in relationships:
        # Determine the other person in this relationship
        other_person_id = rel.person2_id if rel.person1_id == root_person.id else rel.person1_id
        other_person = Person.query.get(other_person_id)
        
        if other_person and other_person.id not in visited:
            # Add link between root and other person
            links.append(create_link(rel))
            
            # Recursively get the subtree for the other person
            subtree = build_tree_from_root(other_person, max_depth, current_depth + 1, visited)
            
            # Add subtree nodes and links
            nodes.extend(subtree['nodes'])
            links.extend(subtree['links'])
    
    return {'nodes': nodes, 'links': links}