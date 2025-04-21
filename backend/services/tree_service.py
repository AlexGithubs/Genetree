#tree_service.py
from models.person import Person
from models.relationship import Relationship
import json

class TreeService:
    @staticmethod
    def get_full_tree():
        """Get the complete family tree with all persons and relationships."""
        print("DEBUG: TreeService.get_full_tree called")

        # Fetch all persons and relationships
        persons = Person.query.all()
        relationships = Relationship.query.all()
        
        print(f"DEBUG: Found {len(persons)} persons and {len(relationships)} relationships")
        
        # Initialize tree data structure
        tree_data = TreeService._compile_tree_data(persons, relationships)
        
        print(f"DEBUG: Final tree has {len(tree_data['nodes'])} nodes and {len(tree_data['links'])} links")
        print(f"DEBUG: Node IDs: {[node['id'] for node in tree_data['nodes']]}")
        
        return tree_data
    
    @staticmethod
    def get_tree_from_root(person_id):
        """Get the family tree starting from a root person."""
        print(f"DEBUG: TreeService.get_tree_from_root called with person_id={person_id}")
        
        # Verify person exists
        root_person = Person.query.get(person_id)
        if not root_person:
            print(f"DEBUG: Person with ID {person_id} not found")
            return {'nodes': [], 'links': []}
        
        print(f"DEBUG: Root person found: {root_person.first_name} {root_person.last_name}")
        
        # Collect all related persons and relationships recursively
        collected_persons = []
        collected_relationships = []
        visited = set()
        
        TreeService._collect_related(root_person, collected_persons, collected_relationships, visited, max_depth=3)
        
        print(f"DEBUG: Collected {len(collected_persons)} persons and {len(collected_relationships)} relationships")
        
        # Compile tree data from collected items
        tree_data = TreeService._compile_tree_data(collected_persons, collected_relationships)
        
        print(f"DEBUG: Final tree has {len(tree_data['nodes'])} nodes and {len(tree_data['links'])} links")
        print(f"DEBUG: Node IDs: {[node['id'] for node in tree_data['nodes']]}")
        
        return tree_data
    
    @staticmethod
    def _collect_related(person, persons_list, relationships_list, visited, current_depth=0, max_depth=3):
        """Recursively collect related persons and relationships."""
        if current_depth > max_depth or person.id in visited:
            return
        
        # Mark as visited and add to collection
        visited.add(person.id)
        persons_list.append(person)
        
        # Find all relationships for this person
        relationships = Relationship.query.filter(
            (Relationship.person1_id == person.id) | (Relationship.person2_id == person.id)
        ).all()
        
        for rel in relationships:
            # Add relationship to collection if not already there
            if rel not in relationships_list:
                relationships_list.append(rel)
            
            # Determine the other person in this relationship
            other_person_id = rel.person2_id if rel.person1_id == person.id else rel.person1_id
            other_person = Person.query.get(other_person_id)
            
            if other_person and other_person.id not in visited:
                # Recursively collect related persons
                TreeService._collect_related(
                    other_person, 
                    persons_list, 
                    relationships_list, 
                    visited, 
                    current_depth + 1, 
                    max_depth
                )
    
    @staticmethod
    def _compile_tree_data(persons, relationships):
        """Compile tree data structure from persons and relationships."""
        # Use dictionaries to ensure uniqueness
        nodes_dict = {}
        links_dict = {}
        
        # Create nodes for each person
        for person in persons:
            person_id = person.id
            if person_id not in nodes_dict:
                nodes_dict[person_id] = TreeService._create_node(person)
        
        # Create links for each relationship
        for rel in relationships:
            # Create a unique key for this relationship
            rel_key = f"{min(rel.person1_id, rel.person2_id)}-{max(rel.person1_id, rel.person2_id)}-{rel.relationship_type}"
            
            if rel_key not in links_dict:
                links_dict[rel_key] = TreeService._create_link(rel)
        
        # Return compiled tree data
        return {
            'nodes': list(nodes_dict.values()),
            'links': list(links_dict.values())
        }
    
    @staticmethod
    def _create_node(person):
        """Create a node representation for a person."""
        return {
            'id': person.id,
            'name': f"{person.first_name} {person.last_name}",
            'gender': person.gender,
            'birth_date': person.birth_date.isoformat() if person.birth_date else None,
            'death_date': person.death_date.isoformat() if person.death_date else None,
            'has_profile': True  # Indicates this person has a detailed profile
        }
    
    @staticmethod
    def _create_link(relationship):
        """Create a link representation for a relationship."""
        return {
            'source': relationship.person1_id,
            'target': relationship.person2_id,
            'type': relationship.relationship_type
        }