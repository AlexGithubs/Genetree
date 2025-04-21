/**
 * Main application logic
 */

// Add error handling for all JavaScript errors
window.addEventListener('error', function(event) {
    console.error('ERROR CAUGHT:', event.error.message, event.error.stack);
    return false;
});

// Global variables
let currentProfile = null;
let familyTree = null;
let profilesManager = null;
let relationshipsManager = null;
let mediaCategoryManager = null;

// Safeguard to ensure tree visibility
function ensureTreeVisibility() {
    const profileContainer = document.getElementById('profile-container');
    const treeContainer = document.getElementById('tree-container');
    
    if (treeContainer && profileContainer) {
        // If profile is hidden, tree should always be visible
        if (profileContainer.classList.contains('hidden')) {
            treeContainer.classList.remove('hidden');
            console.log("DEBUG: Safeguard - Tree container visibility restored");
        }
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: Initializing application...');
    
    try {
        // Initialize the FamilyTree visualization
        console.log('DEBUG: Creating family tree');
        familyTree = new FamilyTreeVisualization();
        window.familyTree = familyTree;
        
        // Initialize the ProfilesManager
        console.log('DEBUG: Creating profiles manager');
        profilesManager = new ProfilesManager();
        window.profilesManager = profilesManager;
        
        // Initialize the RelationshipsManager
        console.log('DEBUG: Creating relationships manager');
        relationshipsManager = new RelationshipsManager();
        window.relationshipsManager = relationshipsManager;
        
        // Initialize the MediaCategoryManager
        console.log('DEBUG: Creating media category manager');
        
        // Check the DOM state for category tabs
        const categoryTabs = document.querySelectorAll('.category-tab');
        console.log(`DEBUG: Found ${categoryTabs.length} category tabs before initialization:`);
        categoryTabs.forEach(tab => {
            console.log(`- Tab: ${tab.textContent}, data-category: ${tab.dataset.category}, classList: ${tab.className}`);
        });
        
        mediaCategoryManager = new MediaCategoryManager();
        window.mediaCategoryManager = mediaCategoryManager;
        
        // Load family tree data
        console.log('DEBUG: Loading tree data');
        familyTree.loadData().then(data => {
            // Run diagnostics if available
            if (window.TreeDiagnostics) {
                console.log("Running automatic tree diagnostics...");
                TreeDiagnostics.runAll().then(results => {
                    console.log("Diagnostics complete.");
                    
                    // If we detect issues, also log raw data
                    if (Object.values(results).some(r => !r.pass)) {
                        console.log("Issues detected. Dumping raw data for further analysis...");
                        TreeDiagnostics.dumpRawData();
                    }
                });
            }
        });
        
        // Set node click callback
        familyTree.setNodeClickCallback((personId) => {
            profilesManager.loadProfile(personId);
        });
        
        // Populate member selector
        updateMemberSelector();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('DEBUG: Application initialized successfully');
        
        // Ensure tree is visible at startup
        ensureTreeVisibility();
    } catch (error) {
        console.error('FATAL ERROR initializing application:', error);
        alert('Failed to initialize the application. Please check the console for details.');
    }
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    console.log('DEBUG: Setting up event listeners');
    
    // Tree controls
    const rootSelector = document.getElementById('tree-root-selector');
    if (rootSelector) {
        rootSelector.addEventListener('change', (e) => {
            const personId = e.target.value;
            if (personId) {
                familyTree.setRoot(personId);
            } else {
                familyTree.loadData();
            }
        });
    }
    
    const zoomIn = document.getElementById('zoom-in');
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            familyTree.zoomIn();
        });
    }
    
    const zoomOut = document.getElementById('zoom-out');
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            familyTree.zoomOut();
        });
    }
    
    const resetZoom = document.getElementById('reset-zoom');
    if (resetZoom) {
        resetZoom.addEventListener('click', () => {
            familyTree.resetZoom();
        });
    }
    
    // Add member button
    const addMemberBtn = document.getElementById('add-member-btn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            showAddMemberModal();
        });
    }
    
    // Fullscreen button setup
    const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
    if (fullscreenBtn) {
        console.log("DEBUG: Setting up fullscreen button handler");
        fullscreenBtn.addEventListener('click', function() {
            console.log("DEBUG: Fullscreen button clicked");
            // Call the global function directly
            toggleFullscreen();
        });
    }
    
    // Close profile button
    const closeProfileBtn = document.getElementById('close-profile');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            if (profilesManager) {
                profilesManager.closeProfile();
                // Add a delayed check for tree visibility after closing profile
                setTimeout(ensureTreeVisibility, 500);
            }
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // Run the tree visibility safeguard on a regular interval
    setInterval(ensureTreeVisibility, 2000);
    
    // Handle clicks outside modals to close them
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Debug existing media modal handlers
    const mediaModal = document.getElementById('media-modal');
    if (mediaModal) {
        console.log('DEBUG: Media modal found');
        const mediaForm = document.getElementById('media-form');
        if (mediaForm) {
            console.log('DEBUG: Media form found');
        } else {
            console.error('ERROR: Media form not found');
        }
    } else {
        console.error('ERROR: Media modal not found');
    }
}

/**
 * Update member selector dropdown
 */
async function updateMemberSelector() {
    console.log('DEBUG: Updating member selector');
    try {
        const selector = document.getElementById('tree-root-selector');
        if (!selector) {
            console.error('ERROR: Tree root selector not found');
            return;
        }

        const members = await api.getAllMembers();
        
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
    console.log('DEBUG: Showing add member modal');
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