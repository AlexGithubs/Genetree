/**
 * Relationships management class
 */
class RelationshipsManager {
    constructor() {
        this.relationshipForm = document.getElementById('relationship-form');
        this.person1Select = document.getElementById('person1');
        this.person2Select = document.getElementById('person2');
        
        // Attach event listeners
        this.relationshipForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRelationship();
        });
        
        document.getElementById('add-relationship-btn').addEventListener('click', () => {
            this.showRelationshipModal();
        });
    }
    
    /**
     * Show the relationship modal
     */
    async showRelationshipModal() {
        try {
            // Fetch all members for populating selects
            const members = await api.getAllMembers();
            
            // Clear and populate person selects
            this.person1Select.innerHTML = '<option value="">-- Select Person --</option>';
            this.person2Select.innerHTML = '<option value="">-- Select Person --</option>';
            
            members.forEach(member => {
                const option1 = document.createElement('option');
                option1.value = member.id;
                option1.textContent = `${member.first_name} ${member.last_name}`;
                
                const option2 = option1.cloneNode(true);
                
                this.person1Select.appendChild(option1);
                this.person2Select.appendChild(option2);
            });
            
            // Reset form
            document.getElementById('relationship-type').value = 'parent-child';
            document.getElementById('relationship-description').value = '';
            
            // Show modal
            document.getElementById('relationship-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Error loading members:', error);
            alert(`Error loading members: ${error.message}`);
        }
    }
    
    /**
     * Save relationship
     */
    async saveRelationship() {
        const person1Id = this.person1Select.value;
        const person2Id = this.person2Select.value;
        const relationshipType = document.getElementById('relationship-type').value;
        const description = document.getElementById('relationship-description').value;
        
        // Validate inputs
        if (!person1Id || !person2Id) {
            alert('Please select both people for the relationship.');
            return;
        }
        
        if (person1Id === person2Id) {
            alert('Cannot create a relationship between the same person.');
            return;
        }
        
        // Create relationship data
        const relationshipData = {
            person1_id: Number(person1Id),
            person2_id: Number(person2Id),
            relationship_type: relationshipType,
            description: description
        };
        
        try {
            await api.createRelationship(relationshipData);
            
            // Hide modal
            document.getElementById('relationship-modal').classList.add('hidden');
            
            // Refresh tree visualization
            if (window.familyTree) {
                window.familyTree.loadData();
            }
            
            // Refresh profile if open
            if (window.profilesManager && window.profilesManager.currentMemberId) {
                window.profilesManager.loadRelationships(window.profilesManager.currentMemberId);
            }
            
            alert('Relationship created successfully.');
        } catch (error) {
            console.error('Error creating relationship:', error);
            alert(`Error creating relationship: ${error.message}`);
        }
    }
}