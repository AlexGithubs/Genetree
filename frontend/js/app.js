/**
 * Main application logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    window.familyTree = new FamilyTreeVisualization();
    window.profilesManager = new ProfilesManager();
    window.relationshipsManager = new RelationshipsManager();
    
    // Load family tree data
    familyTree.loadData();
    
    // Set node click callback
    familyTree.setNodeClickCallback((personId) => {
        profilesManager.loadProfile(personId);
    });
    
    // Populate member selector
    updateMemberSelector();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Tree controls
    document.getElementById('tree-root-selector').addEventListener('change', (e) => {
        const personId = e.target.value;
        if (personId) {
            familyTree.setRoot(personId);
        } else {
            familyTree.loadData();
        }
    });
    
    document.getElementById('zoom-in').addEventListener('click', () => {
        familyTree.zoomIn();
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        familyTree.zoomOut();
    });
    
    document.getElementById('reset-zoom').addEventListener('click', () => {
        familyTree.resetZoom();
    });
    
    // Add member button
    document.getElementById('add-member-btn').addEventListener('click', () => {
        showAddMemberModal();
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // Handle clicks outside modals to close them
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

/**
 * Update member selector dropdown
 */
async function updateMemberSelector() {
    try {
        const members = await api.getAllMembers();
        const selector = document.getElementById('tree-root-selector');
        
        // Clear current options except the first one
        while (selector.options.length > 1) {
            selector.remove(1);
        }
        
        // Add members
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.first_name} ${member.last_name}`;
            selector.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading members for selector:', error);
    }
}

/**
 * Show add member modal
 */
function showAddMemberModal() {
    // Set form title
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    
    // Clear form
    document.getElementById('member-id').value = '';
    document.getElementById('first-name').value = '';
    document.getElementById('last-name').value = '';
    document.getElementById('gender').value = 'unknown';
    document.getElementById('birth-date').value = '';
    document.getElementById('death-date').value = '';
    document.getElementById('biography').value = '';
    
    // Clear custom fields
    document.getElementById('custom-fields-editor').innerHTML = '';
    
    // Show the modal
    document.getElementById('member-modal').classList.remove('hidden');
}