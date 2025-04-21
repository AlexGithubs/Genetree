/**
 * Relationships management class
 */
class RelationshipsManager {
    constructor() {
        this.relationshipForm = document.getElementById('relationship-form');
        this.allMembers = []; // Store fetched members
        
        // Attach event listeners
        this.relationshipForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRelationship();
        });
        
        document.getElementById('add-relationship-btn').addEventListener('click', () => {
            this.showRelationshipModal();
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.search-results-list').forEach(list => {
                const container = list.closest('.filterable-select-container');
                if (container && !container.contains(e.target)) {
                    list.style.display = 'none';
                }
            });
        });
    }
    
    /**
     * Show the relationship modal
     */
    async showRelationshipModal() {
        try {
            // Fetch all members if not already fetched or if cache needs refresh
            // For simplicity, fetching every time now. Could be optimized later.
            this.allMembers = await api.getAllMembers();
            
            // Setup searchable inputs
            this.setupSearchablePersonInput('person1-container');
            this.setupSearchablePersonInput('person2-container');
            
            // Reset form specific elements
            document.getElementById('relationship-type').value = 'parent-child';
            document.getElementById('relationship-description').value = '';
            
            // Reset search inputs and hidden fields
            document.querySelectorAll('.person-search-input').forEach(input => input.value = '');
            document.querySelectorAll('.person-id-input').forEach(input => input.value = '');
            document.querySelectorAll('.search-results-list').forEach(list => list.innerHTML = '');
            
            // Show modal
            document.getElementById('relationship-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Error loading members:', error);
            alert(`Error loading members: ${error.message}`);
        }
    }
    
    /**
     * Sets up the searchable input field for selecting a person.
     * @param {string} containerId - The ID of the container element (e.g., 'person1-container').
     */
    setupSearchablePersonInput(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const searchInput = container.querySelector('.person-search-input');
        const resultsList = container.querySelector('.search-results-list');
        const idInput = container.querySelector('.person-id-input');
        
        if (!searchInput || !resultsList || !idInput) {
            console.error(`Missing elements within container ${containerId}`);
            return;
        }
        
        const populateResults = (membersToShow, searchTerm = '') => {
            resultsList.innerHTML = ''; // Clear previous results
            if (membersToShow.length === 0) {
                resultsList.style.display = 'none';
                return;
            }
            
            membersToShow.forEach(member => {
                const item = document.createElement('div');
                item.className = 'result-item';
                const fullName = `${member.first_name} ${member.last_name}`; // Adjust as needed
                item.dataset.id = member.id;

                if (searchTerm && searchTerm.length > 0) {
                    const index = fullName.toLowerCase().indexOf(searchTerm.toLowerCase());
                    if (index !== -1) {
                        const before = fullName.substring(0, index);
                        const match = fullName.substring(index, index + searchTerm.length);
                        const after = fullName.substring(index + searchTerm.length);
                        item.innerHTML = `${before}<strong>${match}</strong>${after}`;
                    } else {
                        item.textContent = fullName; // Fallback if no match (shouldn't happen with filter)
                    }
                } else {
                    item.textContent = fullName; // No search term, display normally
                }

                item.addEventListener('click', () => {
                    searchInput.value = item.textContent; // Set input display value
                    idInput.value = member.id;          // Set hidden input ID
                    resultsList.style.display = 'none'; // Hide results
                    resultsList.innerHTML = '';         // Clear results
                });
                resultsList.appendChild(item);
            });
            resultsList.style.display = 'block'; // Show results
        };
        
        searchInput.addEventListener('focus', () => {
            // Show all members when focused (and input is empty or just whitespace)
            const currentSearchTerm = searchInput.value.trim();
            if (!currentSearchTerm) {
                 populateResults(this.allMembers); // No search term passed
            }
        });
        
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            if (searchTerm === '') {
                idInput.value = ''; // Clear hidden ID if input is cleared
                 populateResults(this.allMembers); // No search term passed
                return;
            }
            
            const filteredMembers = this.allMembers.filter(member => {
                const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
                return fullName.includes(searchTerm);
            });
            populateResults(filteredMembers, searchTerm); // Pass search term here
        });
        
        // Optional: Hide results on blur, with a delay to allow clicks
        // searchInput.addEventListener('blur', () => {
        //     setTimeout(() => {
        //         resultsList.style.display = 'none';
        //     }, 150); // Delay to allow click event on items
        // });
    }
    
    /**
     * Save relationship
     */
    async saveRelationship() {
        // Get IDs from the hidden input fields
        const person1Id = document.getElementById('person1_id').value;
        const person2Id = document.getElementById('person2_id').value;
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
                console.log("DEBUG: Clearing family tree cache after relationship creation");
                window.familyTree.clearCache();
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