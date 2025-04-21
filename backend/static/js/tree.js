/**
 * Tree visualization using D3.js
 * Completely redesigned for more reliable performance
 */
class FamilyTreeVisualization {
    constructor(containerId = 'tree-visualization') {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.data = null;
        this.nodeClickCallback = null;
        this.isLoading = false; // Add instance variable for loading state
        
        // Create SVG element
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr('preserveAspectRatio', 'xMidYMid meet');
            
        // Create group for the tree
        this.g = this.svg.append('g');
        
        // Setup zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
            
        this.svg.call(this.zoom);
        
        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        this.svg.attr('viewBox', [0, 0, this.width, this.height]);
        
        if (this.data) {
            this.update(this.data);
        }
    }
    
    /**
     * Set callback for node click events
     */
    setNodeClickCallback(callback) {
        this.nodeClickCallback = (personId) => {
            try {
                console.log("DEBUG: Node clicked with person ID:", personId);
                callback(personId);
            } catch (error) {
                console.error("ERROR in node click callback:", error);
                alert("There was an error loading this profile. Please try again.");
            }
        };
    }
    
    /**
     * Load data from the API and update the tree
     */
    async loadData(rootPersonId = null) {
        // Prevent multiple concurrent requests
        if (this.isLoading) {
            console.warn("DEBUG: BLOCKING duplicate tree data request - already loading");
            return null;
        }

        this.isLoading = true;
        console.log(`DEBUG: loadData called, isLoading set to true. rootPersonId=${rootPersonId}`);

        try {
            console.log("DEBUG: Fetching new tree data...");
            let data;
            if (rootPersonId) {
                data = await api.getFamilyTreeFromRoot(rootPersonId);
            } else {
                data = await api.getFamilyTree();
            }
            
            // Log raw data
            console.log("Raw API response:", JSON.parse(JSON.stringify(data)));
            
            // Check for valid data
            if (!data || !data.nodes) {
                console.error("Invalid tree data returned from API");
                return null; // isLoading will be reset in finally
            }
                            
            console.log(`Processing tree data with ${data.nodes.length} nodes and ${data.links.length} links`);
            this.data = data;
            this.update(data);
                            
            return data;
        } catch (error) {
            console.error('Error loading family tree data:', error);
            this.container.innerHTML = `<div class="error-message">
                <p>Error loading family tree: ${error.message}</p>
            </div>`;
            return null;
        } finally {
            // Ensure isLoading is always reset
            console.log("DEBUG: loadData finished, setting isLoading to false.");
            this.isLoading = false; 
        }
    }
    
    /**
     * Update tree visualization with new data
     */
    update(data) {
        // Clear existing tree
        this.g.selectAll('*').remove();
        
        // Log incoming data for debugging
        console.log("Updating tree with data:", JSON.parse(JSON.stringify(data)));
            
        // If no data or empty data, show message
        if (!data || !data.nodes || data.nodes.length === 0) {
            this.g.append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .attr('text-anchor', 'middle')
                .text('No family tree data available. Add members to get started.');
            return;
        }
        
        // AGGRESSIVE DUPLICATE NODE REMOVAL
        console.log(`BEFORE deduplication: ${data.nodes.length} nodes`);
        
        // Create a map of existing nodes by ID for deduplication
        const uniqueNodeMap = new Map();
        data.nodes.forEach(node => {
            // Skip the "Family" node
            if (node.name === "Family" && node.id !== 'virtual-root') {
                return;
            }
            
            // Only keep the first occurrence of each node ID
            if (!uniqueNodeMap.has(node.id)) {
                uniqueNodeMap.set(node.id, node);
            }
        });
        
        // Replace nodes array with deduplicated array
        data.nodes = Array.from(uniqueNodeMap.values());
        
        // AGGRESSIVE DUPLICATE LINK REMOVAL
        console.log(`BEFORE deduplication: ${data.links.length} links`);
        
        // Create a map of existing links
        const uniqueLinkMap = new Map();
        data.links.forEach(link => {
            // Create a unique key for the link
            const linkKey = `${Math.min(link.source, link.target)}-${Math.max(link.source, link.target)}-${link.type}`;
            
            // Only keep the first occurrence of each link
            if (!uniqueLinkMap.has(linkKey)) {
                uniqueLinkMap.set(linkKey, link);
            }
        });
        
        // Replace links array with deduplicated array
        data.links = Array.from(uniqueLinkMap.values());
        
        console.log(`AFTER deduplication: ${data.nodes.length} nodes, ${data.links.length} links`);
        
        // Process data to create a correct hierarchical structure
        const processedData = this.processData(data);
        
        // Extract root and process the tree
        const root = processedData.root;
        
        // Create a custom tree layout
        const treeLayout = (root) => {
            // First, assign initial y values based on depth
            const nodeList = root.descendants();
            const maxDepth = Math.max(...nodeList.map(n => n.depth));
            const verticalSpacing = 450; // Increased vertical spacing between generations (was 380)
            
            // Calculate vertical positions strictly by generation
            nodeList.forEach(node => {
                node.y = node.depth * verticalSpacing;
            });
            
            // For each generation level, position nodes horizontally
            const nodesByGeneration = {};
            nodeList.forEach(node => {
                if (!nodesByGeneration[node.depth]) {
                    nodesByGeneration[node.depth] = [];
                }
                nodesByGeneration[node.depth].push(node);
            });
            
            // Create a map to track nodes already positioned at each generation level
            const positionedNodesById = new Map();
            
            // Position nodes horizontally within each generation
            Object.entries(nodesByGeneration).forEach(([generation, nodes]) => {
                // Create a list for keeping track of nodes to be positioned
                const nodesToPosition = [...nodes];
                
                // Calculate a proper spacing for nodes
                // Ensure minimum width and adjust spacing more dynamically
                const minGenerationWidth = 2500; // Ensure a minimum width for spacing (was 2000)
                const calculatedWidth = Math.max(this.width - 100, 280 * nodesToPosition.length); // Increased from 220
                const generationWidth = Math.max(minGenerationWidth, calculatedWidth);
                
                // Calculate node Spacing - ensure minimum space
                const minNodeSpacing = 400; // Increased from 300
                let nodeSpacing = generationWidth / (nodesToPosition.length + 1);
                if (nodesToPosition.length > 1) { // Avoid huge spacing for single nodes
                   nodeSpacing = Math.max(minNodeSpacing, nodeSpacing); 
                }
                
                // Recalculate effective width and starting position based on potentially adjusted spacing
                const effectiveWidth = nodeSpacing * (nodesToPosition.length + 1);
                const startX = (this.width - effectiveWidth) / 2 + nodeSpacing;
                
                // First identify spouses
                const spouseGroups = {};
                nodesToPosition.forEach(node => {
                    if (node.isSpouse && node.parent) {
                        const partnerId = node.parent.data.id;
                        if (!spouseGroups[partnerId]) {
                            spouseGroups[partnerId] = [];
                        }
                        spouseGroups[partnerId].push(node);
                    }
                });
                
                // Sort nodes: regular nodes first, then spouse nodes
                const regularNodes = nodesToPosition.filter(n => !n.isSpouse);
                regularNodes.sort((a, b) => {
                    // Sort by family groups if possible
                    if (a.parent && b.parent) {
                        if (a.parent.data.id === b.parent.data.id) return 0;
                        return a.parent.data.id - b.parent.data.id;
                    }
                    return (a.data.id || 0) - (b.data.id || 0);
                });
                
                // Position regular nodes first with more consistent spacing
                let xPosition = startX;
                regularNodes.forEach((node, i) => {
                    // Skip if this node has already been positioned
                    if (positionedNodesById.has(node.data.id)) {
                        return;
                    }
                    
                    // Mark node as positioned to avoid duplicates
                    positionedNodesById.set(node.data.id, true);
                    
                    // Position the node
                    node.x = xPosition;
                    xPosition += nodeSpacing;
                    
                    // If this node has spouses, position them next to it
                    if (spouseGroups[node.data.id]) {
                        spouseGroups[node.data.id].forEach(spouse => {
                            // Skip if spouse has already been positioned
                            if (positionedNodesById.has(spouse.data.id)) {
                                return;
                            }
                            
                            // Position the spouse and mark as positioned
                            spouse.x = xPosition;
                            positionedNodesById.set(spouse.data.id, true);
                            xPosition += nodeSpacing;
                        });
                    }
                });
            });
            
            return root;
        };
        
        // Apply our custom layout
        const rootWithPositions = treeLayout(root);
        
        // Ensure each node appears only once
        const uniqueNodes = [];
        const seenNodeIds = new Set();
        
        rootWithPositions.descendants().forEach(node => {
            if (!node.data.id || node.data.id === 'virtual-root') {
                // Always include virtual nodes
                uniqueNodes.push(node);
            } else if (!seenNodeIds.has(node.data.id)) {
                // Only include each real node once
                seenNodeIds.add(node.data.id);
                uniqueNodes.push(node);
            }
        });
        
        const nodes = uniqueNodes;
        const treeLinks = rootWithPositions.links();
        
        // Create family connectors (midpoints between spouses)
        const spousePairs = [];
        
        // First identify all spouse relationships from the original data links
        const spouseRelationships = data.links.filter(link => link.type === 'spouse');
        
        // Create a map of node objects by ID
        const nodeById = {};
        nodes.forEach(node => {
            if (node.data.id) {
            nodeById[node.data.id] = node;
            }
        });
        
        // First add the spouse pairs from the hierarchy
        nodes.forEach(node => {
            if (node.isSpouse && node.parent && node.data.id && node.parent.data.id) {
                // Skip if we've already processed this pair
                const pairId = [node.data.id, node.parent.data.id].sort().join('-');
                const pairExists = spousePairs.some(pair => 
                    pair.id === `connector-${pairId}` || 
                    pair.id === `connector-${node.parent.data.id}-${node.data.id}` ||
                    pair.id === `connector-${node.data.id}-${node.parent.data.id}`
                );
                
                if (pairExists) {
                    return;
                }
                
                // Create a connector between this spouse and its partner
                spousePairs.push({
                    id: `connector-${node.parent.data.id}-${node.data.id}`,
                    x: (node.x + node.parent.x) / 2,
                    y: node.y,
                    partner1: node.parent,
                    partner2: node,
                    children: []
                });
            }
        });
        
        // Then add spouse pairs from the original data links that might be missing
        spouseRelationships.forEach(link => {
            const sourceNode = nodeById[link.source];
            const targetNode = nodeById[link.target];
            
            if (sourceNode && targetNode) {
                // Check if this pair is already added
                const pairId = [link.source, link.target].sort().join('-');
                const pairExists = spousePairs.some(pair => 
                    pair.id === `connector-${pairId}` || 
                    pair.id === `connector-${link.source}-${link.target}` ||
                    pair.id === `connector-${link.target}-${link.source}` ||
                    (pair.partner1.data.id === sourceNode.data.id && pair.partner2.data.id === targetNode.data.id) || 
                    (pair.partner1.data.id === targetNode.data.id && pair.partner2.data.id === sourceNode.data.id)
                );
                
                if (!pairExists) {
                    spousePairs.push({
                        id: `connector-${link.source}-${link.target}`,
                        x: (sourceNode.x + targetNode.x) / 2,
                        y: sourceNode.y, // Assume same level for spouses
                        partner1: sourceNode,
                        partner2: targetNode,
                        children: []
                    });
                }
            }
        });
        
        // For each spouse pair, find their children
        spousePairs.forEach(pair => {
            // Find common children of both partners
            const partner1Children = pair.partner1.children || [];
            const partner2Children = pair.partner2.children || [];
            
            // Find common children by ID
            const partner1ChildIds = partner1Children.map(c => c.data.id);
            const commonChildren = partner2Children.filter(c => partner1ChildIds.includes(c.data.id));
            
            // Also include children that have either partner as an additional parent
            nodes.forEach(node => {
                if (node.allParents && node.allParents.length > 0) {
                    const parentIds = node.allParents.map(p => p.data.id);
                    if ((parentIds.includes(pair.partner1.data.id) && 
                         (node.parent === pair.partner2 || parentIds.includes(pair.partner2.data.id))) ||
                        (parentIds.includes(pair.partner2.data.id) && 
                         (node.parent === pair.partner1 || parentIds.includes(pair.partner1.data.id)))) {
                        if (!commonChildren.includes(node)) {
                            commonChildren.push(node);
                        }
                }
            }
        });
        
            pair.children = commonChildren;
        });
        
        // Create a map to track which connections are already covered by spouse connectors
        // This prevents redundant additional parent links
        const coveredConnections = new Map();
        
        // First mark connections from spouse pairs to children as covered
        spousePairs.forEach(pair => {
            if (pair.children && pair.children.length > 0) {
                pair.children.forEach(child => {
                    // Mark connection from both partners to this child as covered
                    coveredConnections.set(`${pair.partner1.data.id}-${child.data.id}`, true);
                    coveredConnections.set(`${pair.partner2.data.id}-${child.data.id}`, true);
                });
            }
        });
        
        // Draw links
        // First draw parent-child links (vertical connections)
        const linkGroup = this.g.append('g').attr('class', 'links');
        
        // Draw links from parent to connector
        linkGroup.selectAll('.link-connector')
            .data(spousePairs)
            .enter()
            .filter(d => d.children && d.children.length > 0)
            .append('path')
            .attr('class', 'link-connector')
            .attr('d', d => {
                let path = '';
                d.children.forEach(child => {
                    const startX = d.x;
                    const startY = d.y;
                    const endX = child.x;
                    const endY = child.y;
                    const midY = (startY + endY) / 2;
                    
                    // Control points to create a more pronounced vertical curve
                    // Pushing control points slightly horizontally can help avoid nodes
                    const controlXOffset = Math.abs(endX - startX) > 50 ? (endX > startX ? 50 : -50) : 0; // Increased offset (was 30)
                    const controlX1 = startX + controlXOffset; 
                    const controlY1 = midY;
                    const controlX2 = endX - controlXOffset;
                    const controlY2 = midY;
                    
                    path += `M${startX},${startY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
                });
                return path;
            })
            .attr('fill', 'none')
            .attr('stroke', '#6c67ce')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
        
        // DEBUG: Track which links should be drawn as direct links vs purple connector links
        console.log("DEBUG: Processing links to determine correct styling");
        
        // BUGFIX: Store which nodes are children of spouse pairs to avoid incorrect styling
        const childrenOfSpousePairs = new Set();
        spousePairs.forEach(pair => {
            if (pair.children && pair.children.length > 0) {
                pair.children.forEach(child => {
                    childrenOfSpousePairs.add(child.data.id);
                    console.log(`DEBUG: Marked ${child.data.name} (ID: ${child.data.id}) as child of spouse pair`);
                });
            }
        });
        
        // Draw direct parent-child links that are not through spouse connectors
        linkGroup.selectAll('.link-direct')
            .data(treeLinks.filter(link => {
                // Skip spouse links
                if (link.target.isSpouse) return false;
                
                // Skip additional parent links
                if (link.isAdditionalParent) return false;
                
                // Check if this is a normal parent-child link
                return true;
            }))
            .enter()
            .append('path')
            .attr('class', 'link-direct')
            .attr('d', d => {
                if (d.source.data.id === 'virtual-root') return '';
                
                // Skip drawing if this connection is from a spouse connector
                const isSpouseConnector = spousePairs.some(pair => 
                    (pair.partner1.data.id === d.source.data.id || pair.partner2.data.id === d.source.data.id) &&
                    pair.children && pair.children.some(child => child.data.id === d.target.data.id) &&
                    d.target.allParents && d.target.allParents.length > 1 // Only if child has multiple parents
                );
                
                if (isSpouseConnector) {
                    console.log(`DEBUG: Skipping spouse connector link from ${d.source.data.name} to ${d.target.data.name}`);
                    return '';
                }
                
                // Check if connection is already tracked
                const connectionKey = `${d.source.data.id}-${d.target.data.id}`;
                if (coveredConnections.has(connectionKey)) return '';
                coveredConnections.set(connectionKey, true);
                
                // Special case log for Parent 3
                if (d.target.data.name === "Parent 3") {
                    console.log(`DEBUG: Drawing direct link to Parent 3 from ${d.source.data.name}`);
                }
                
                const startX = d.source.x;
                const startY = d.source.y;
                const endX = d.target.x;
                const endY = d.target.y;
                const midY = (startY + endY) / 2;
                
                // Enhanced control points for smoother, node-avoiding curves
                const controlXOffset = Math.abs(endX - startX) > 50 ? (endX > startX ? 60 : -60) : (endX - startX) * 0.2; // Increased offset (was 40)
                const controlX1 = startX + controlXOffset;
                const controlY1 = midY;
                const controlX2 = endX - controlXOffset;
                const controlY2 = midY;
                
                return `M${startX},${startY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
            })
            .attr('fill', 'none')
            .attr('stroke', '#6c67ce')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
        
        // Only draw additional parent links that aren't already covered
        const additionalParentLinks = treeLinks.filter(link => {
            if (!link.isAdditionalParent) return false;
            
            // Check if this connection is already covered by other links
            const connectionKey = `${link.source.data.id}-${link.target.data.id}`;
            
            // Verify that both source and target nodes still exist in the tree
            // This fixes the "ghost lines" bug where lines remain after a node is deleted
            if (!link.source || !link.source.data || !link.source.data.id || 
                !link.target || !link.target.data || !link.target.data.id) {
                console.log("DEBUG: Filtered out invalid additional parent link - missing endpoint");
                return false;
            }
            
            // Check if the source or target is valid in our current node set
            const sourceExists = seenNodeIds.has(link.source.data.id);
            const targetExists = seenNodeIds.has(link.target.data.id);
            if (!sourceExists || !targetExists) {
                console.log(`DEBUG: Filtered out orphaned additional parent link - endpoint not in tree: ${link.source.data.id} -> ${link.target.data.id}`);
                return false;
            }
            
            return !coveredConnections.has(connectionKey);
        });
        
        // Draw additional parent links with different style
        linkGroup.selectAll('.link-additional-parent')
            .data(additionalParentLinks) // Use pre-filtered links
            .enter()
            .append('path')
            .attr('class', 'link-additional-parent')
            .attr('d', d => {
                const startX = d.source.x;
                const startY = d.source.y;
                const endX = d.target.x;
                const endY = d.target.y;
                
                // Mark this connection as covered (important for additional parents too)
                coveredConnections.set(`${d.source.data.id}-${d.target.data.id}`, true);

                // Control points for a distinct but less extreme arc
                const horizontalDist = endX - startX;
                const verticalDist = endY - startY;

                // Increase the horizontal offset multiplier for a wider arc
                const controlXOffset = (Math.abs(horizontalDist) < 100 ? 90 : Math.abs(horizontalDist) * 0.6) * (horizontalDist > 0 ? 1 : -1); // Increased (was 60/0.4)
                
                // Keep vertical control points closer to the vertical center 
                // to prevent high arcing over intermediate generations
                const controlY1 = startY + verticalDist * 0.4;
                const controlY2 = endY - verticalDist * 0.4;
                
                // Calculate control points using the offset
                const controlX1 = startX + controlXOffset;
                const controlX2 = endX - controlXOffset; 
                
                return `M${startX},${startY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
            })
            .attr('fill', 'none')
            .attr('stroke', '#ffb74d') 
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,3') 
            .attr('opacity', 0.7);
        
        // Draw spouse links (horizontal connections)
        linkGroup.selectAll('.link-spouse')
            .data(spousePairs)
            .enter()
            .append('path')
            .attr('class', 'link-spouse')
            .attr('d', d => {
                return `M${d.partner1.x},${d.partner1.y} L${d.partner2.x},${d.partner2.y}`;
            })
            .attr('fill', 'none')
            .attr('stroke', '#e57373')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
        
        // Add connectors for spouse pairs that have children
        const connectorGroup = this.g.append('g').attr('class', 'connectors');
        
        connectorGroup.selectAll('.connector')
            .data(spousePairs.filter(pair => pair.children && pair.children.length > 0))
            .enter()
            .append('circle')
            .attr('class', 'connector')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 5)
            .attr('fill', '#e57373');
        
        // Draw nodes
        const nodeGroup = this.g.append('g').attr('class', 'nodes');
        
        const nodeElements = nodeGroup.selectAll('.node')
            .data(nodes.filter(d => d.data.id !== 'virtual-root'))
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .attr('data-id', d => d.data.id)
            .style('cursor', 'pointer');
            
        // Add generation label as a CSS attribute
        nodeElements.attr('data-generation', d => `G${d.depth}`);
            
        // Add node circles
        const nodeRadius = 35; // Increased from 30 for larger nodes
        
        // Define color scheme based on generation for border
        const generationColors = [
            '#ffb74d', // Orange (G0) - Great-Grandparents
            '#4fc3f7', // Blue (G1) - Grandparents
            '#81c784', // Green (G2) - Parents
            '#ba68c8'  // Purple (G3) - Children
        ];
        
        // Add genders
        const genderColors = {
            'male': '#4fc3f7',    // Blue
            'female': '#f06292',  // Pink
            'other': '#9575cd',   // Purple
            'unknown': '#90a4ae'  // Gray
        };
        
        // Add background circles
        nodeElements.append('circle')
            .attr('r', nodeRadius + 1)
            .attr('fill', '#2c3e50')
            .attr('stroke', d => generationColors[d.depth % generationColors.length])
            .attr('stroke-width', 3);
        
        // Add inner circles
        nodeElements.append('circle')
            .attr('r', nodeRadius - 1)
            .attr('fill', d => genderColors[d.data.gender] || genderColors.unknown)
            .attr('opacity', 0.3);
        
        // Add node icons (placeholder)
        nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 10)
            .attr('class', 'node-icon')
            .text(d => d.data.gender === 'female' ? '♀' : d.data.gender === 'male' ? '♂' : '?')
            .attr('font-size', 24)
            .attr('fill', 'white');
        
        // Add node labels underneath
        nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', nodeRadius + 15)
            .text(d => d.data.name)
            .attr('class', 'node-name')
            .attr('fill', 'white')
            .attr('font-size', 14);
            
        // Add generation labels inside each node
        nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', -10)
            .attr('fill', 'white')
            .attr('font-size', 10)
            .attr('opacity', 0.8)
            .text(d => `G${d.depth}`);
        
        // Add click handler
        if (this.nodeClickCallback) {
            nodeElements.on('click', (event, d) => {
                this.nodeClickCallback(d.data.id);
            });
        }
        
        // Center the view
        this.centerTree();

        // After all other generation placement logic
        console.log("DEBUG: Final parent-child generation verification...");
        let finalAdjustments = true;
        let finalIterations = 0;
        
        // Create a node map for quick lookups
        const nodeMap = {};
        data.nodes.forEach(node => {
            nodeMap[node.id] = node;
        });
        
        while (finalAdjustments && finalIterations < 5) {
            finalIterations++;
            finalAdjustments = false;
            
            // Check all parent-child relationships
            data.links.forEach(link => {
                if (link.type === 'parent-child' || link.type === 'child-parent') {
                    let parentId, childId;
                    
                    if (link.type === 'parent-child') {
                        parentId = link.source;
                        childId = link.target;
                    } else { // child-parent
                        parentId = link.target;
                        childId = link.source;
                    }
                    
                    const parent = nodeMap[parentId];
                    const child = nodeMap[childId];
                    
                    if (parent && child && 
                        parent.generation !== null && child.generation !== null) {
                        
                        // Parent must be at least one generation above child
                        if (parent.generation >= child.generation) {
                            const newParentGen = child.generation - 1;
                            console.log(`DEBUG: FINAL FIX - Adjusting parent ${parent.name} (ID: ${parent.id}) from gen ${parent.generation} to ${newParentGen}`);
                            parent.generation = newParentGen;
                            finalAdjustments = true;
                            
                            // If this is Parent 3, add extra debug
                            if (parent.name === "Parent 3") {
                                console.log(`DEBUG: FINAL FIX FOR PARENT 3 - Generation now ${newParentGen}`);
                            }
                        }
                    }
                }
            });
        }
        
        if (finalIterations > 1) {
            console.log(`DEBUG: Made final parent-child adjustments in ${finalIterations} iterations`);
        }
    }
    
    /**
     * Process the data to create a correct tree structure
     */
    processData(data) {
        // Deep copy to avoid modifying the original
        const nodes = JSON.parse(JSON.stringify(data.nodes || []));
        const links = JSON.parse(JSON.stringify(data.links || []));
        
        console.log(`Processing ${nodes.length} nodes and ${links.length} links`);
        
        // Create a node lookup map
        const nodeMap = {};
        nodes.forEach(node => {
            // Skip the "Family" node to avoid confusing the visualization
            if (node.name === "Family") {
                console.log("Skipping 'Family' node for cleaner visualization");
                return;
            }
            
            nodeMap[node.id] = {
                ...node,
                children: [],
                parents: [],  // Track parents
                spouses: [],  // Track spouse relationships
                generation: null, // Will be calculated
                allChildren: [], // Track all children for additional parent-child relationships
                allParents: []   // Track all parents including additional parents
            };
        });
        
        // Process all links to build relationships
        links.forEach(link => {
            const source = nodeMap[link.source];
            const target = nodeMap[link.target];
            
            if (!source || !target) {
                console.warn(`Skipping link with missing endpoint: ${link.source} -> ${link.target} (${link.type})`);
                return;
            }
            
            // Additional validation - if either endpoint has been deleted/invalid, skip
            if (!nodes.some(n => n.id === link.source) || !nodes.some(n => n.id === link.target)) {
                console.warn(`Skipping link with invalid/deleted endpoint: ${link.source} -> ${link.target} (${link.type})`);
                return;
            }
            
            // Log each relationship being processed for debugging
            console.log(`Processing ${link.type} relationship: ${source.name} -> ${target.name}`);
            
            if (link.type === 'parent-child') {
                // Parent -> Child: source is parent, target is child
                if (!source.children) source.children = [];
                if (!source.children.some(child => child.id === target.id)) {
                    source.children.push(target);
                }
                
                // Also track parents for generation calculation
                if (!target.parents) target.parents = [];
                if (!target.parents.some(parent => parent.id === source.id)) {
                    target.parents.push(source);
                }
                
                // Add to allChildren array for additional parent-child tracking
                if (!source.allChildren) source.allChildren = [];
                if (!source.allChildren.some(child => child.id === target.id)) {
                    source.allChildren.push(target);
                    console.log(`DEBUG: Added to allChildren: ${source.name} -> ${target.name} (parent-child)`);
                }
                
                // Add to allParents array for bottom-up calculations
                if (!target.allParents) target.allParents = [];
                if (!target.allParents.some(parent => parent.id === source.id)) {
                    target.allParents.push(source);
                    console.log(`DEBUG: Added to allParents: ${target.name} -> ${source.name} (parent-child)`);
                }
            } else if (link.type === 'child-parent') {
                // Child -> Parent: target is parent, source is child
                if (!target.children) target.children = [];
                if (!target.children.some(child => child.id === source.id)) {
                    target.children.push(source);
                }
                
                // Also track parents for generation calculation
                if (!source.parents) source.parents = [];
                if (!source.parents.some(parent => parent.id === target.id)) {
                    source.parents.push(target);
                }
                
                // Add to allChildren array for additional parent-child tracking
                if (!target.allChildren) target.allChildren = [];
                if (!target.allChildren.some(child => child.id === source.id)) {
                    target.allChildren.push(source);
                    console.log(`DEBUG: Added to allChildren: ${target.name} -> ${source.name} (child-parent)`);
                }
                
                // Add to allParents array for bottom-up calculations
                if (!source.allParents) source.allParents = [];
                if (!source.allParents.some(parent => parent.id === target.id)) {
                    source.allParents.push(target);
                    console.log(`DEBUG: Added to allParents: ${source.name} -> ${target.name} (child-parent)`);
                }
            } else if (link.type === 'spouse') {
                // Track spouse relationship
                if (!source.spouses) source.spouses = [];
                if (!source.spouses.includes(target.id)) {
                    source.spouses.push(target.id);
                }
                if (!target.spouses) target.spouses = [];
                if (!target.spouses.includes(source.id)) {
                    target.spouses.push(source.id);
                }
            } else if (link.type === 'additional-parent') {
                // Additional parent relationship (yellow dotted line)
                // Assuming source is parent, target is child
                if (!source.allChildren) source.allChildren = [];
                if (!source.allChildren.some(child => child.id === target.id)) {
                    source.allChildren.push(target);
                    console.log(`DEBUG: Added to allChildren: ${source.name} -> ${target.name} (additional-parent)`);
                }
                
                // Add to allParents array for bottom-up calculations
                if (!target.allParents) target.allParents = [];
                if (!target.allParents.some(parent => parent.id === source.id)) {
                    target.allParents.push(source);
                    console.log(`DEBUG: Added to allParents: ${target.name} -> ${source.name} (additional-parent)`);
                }
            }
        });
        
        // --- NEW GENERATION ASSIGNMENT LOGIC ---
        console.log("DEBUG: Starting NEW generation assignment logic (moving kids down)...");
        
        // Initialize all nodes at generation 0
        Object.values(nodeMap).forEach(node => {
            node.generation = 0;
            console.log(`DEBUG: Initialized ${node.name} (ID: ${node.id}) to generation 0`);
        });
        
        // Identify root nodes (nodes without parents)
        const rootNodes = Object.values(nodeMap).filter(node => 
            !node.allParents || node.allParents.length === 0
        );
        
        console.log(`DEBUG: Found ${rootNodes.length} root nodes - keeping at generation 0`);
        
        // Process each relationship to identify parent-child pairs
        const parentChildPairs = [];
        
        links.forEach(link => {
            if (link.type === 'parent-child' || link.type === 'child-parent' || link.type === 'additional-parent') {
                let parentId, childId;
                
                if (link.type === 'parent-child') {
                    parentId = link.source;
                    childId = link.target;
                } else if (link.type === 'child-parent') {
                    parentId = link.target;
                    childId = link.source;
                } else if (link.type === 'additional-parent') {
                    parentId = link.source;
                    childId = link.target;
                }
                
                const parent = nodeMap[parentId];
                const child = nodeMap[childId];
                
                if (parent && child) {
                    // Add to our parent-child pairs for processing
                    parentChildPairs.push({ parent, child });
                }
            }
        });
        
        console.log(`DEBUG: Identified ${parentChildPairs.length} parent-child relationships`);
        
        // Function to get all descendants of a node
        const getAllDescendants = (node, visited = new Set()) => {
            if (visited.has(node.id)) {
                return [];
            }
            
            visited.add(node.id);
            const descendants = [];
            
            // Get direct children
            const directChildren = parentChildPairs
                .filter(pair => pair.parent.id === node.id)
                .map(pair => pair.child);
                
            // Add direct children to descendants
            directChildren.forEach(child => {
                if (!visited.has(child.id)) {
                    descendants.push(child);
                }
            });
            
            // Recursively get descendants of each child
            directChildren.forEach(child => {
                const childDescendants = getAllDescendants(child, visited);
                childDescendants.forEach(descendant => {
                    if (!descendants.includes(descendant)) {
                        descendants.push(descendant);
                    }
                });
            });
            
            return descendants;
        };
        
        // First, determine which generation level each node should be at
        // Start from root nodes (gen 0) and propagate downward
        let maxGeneration = 0;
        const nodesToProcess = [...rootNodes];
        const processedNodes = new Set();
        
        // Keep track of the depth of each node
        const nodeDepth = {};
        rootNodes.forEach(node => {
            nodeDepth[node.id] = 0;
        });
        
        // Use a breadth-first traversal to determine the maximum possible generation
        // for each node (based on its furthest distance from a root)
        while (nodesToProcess.length > 0) {
            const node = nodesToProcess.shift();
            
            if (processedNodes.has(node.id)) {
                continue;
            }
            
            processedNodes.add(node.id);
            const currentDepth = nodeDepth[node.id] || 0;
            maxGeneration = Math.max(maxGeneration, currentDepth);
            
            // Find all children of this node
            const children = parentChildPairs
                .filter(pair => pair.parent.id === node.id)
                .map(pair => pair.child);
                
            // Process each child
            children.forEach(child => {
                // Update child's depth to be one more than parent's depth
                const childDepth = (nodeDepth[child.id] || 0);
                nodeDepth[child.id] = Math.max(childDepth, currentDepth + 1);
                
                if (!processedNodes.has(child.id)) {
                    nodesToProcess.push(child);
                }
            });
        }
        
        console.log(`DEBUG: Maximum generation depth found: ${maxGeneration}`);
        
        // Set generations based on calculated depths
        Object.keys(nodeDepth).forEach(nodeId => {
            const node = nodeMap[nodeId];
            if (node) {
                node.generation = nodeDepth[nodeId];
                console.log(`DEBUG: Setting ${node.name} (ID: ${node.id}) to generation ${node.generation}`);
            }
        });
        
        // Special case for Parent 3 - log its generation
        const parent3_special = Object.values(nodeMap).find(node => node.name === "Parent 3");
        if (parent3_special) {
            console.log(`DEBUG: Parent 3 generation set to: ${parent3_special.generation}`);
        }
        
        // Sync spouse generations - make sure spouses are at the same level
        Object.values(nodeMap).forEach(node => {
            if (node.spouses && node.spouses.length > 0) {
                node.spouses.forEach(spouseId => {
                    const spouse = nodeMap[spouseId];
                    if (spouse && spouse.generation !== node.generation) {
                        console.log(`DEBUG: Syncing spouse generations - ${node.name} (${node.generation}) and ${spouse.name} (${spouse.generation}) to ${node.generation}`);
                        spouse.generation = node.generation;
                    }
                });
            }
        });
        
        // --- END NEW GENERATION ASSIGNMENT LOGIC ---
        
        // Group spouses together in the hierarchy
        // We'll choose one spouse as the "primary" and attach the others as virtual children
        // with a special spouse marker
        const processedSpouses = new Set();
        
        Object.values(nodeMap).forEach(node => {
            if (node.spouses && node.spouses.length > 0) {
                node.spouses.forEach(spouseId => {
                    // Create a unique pair ID to avoid processing the same pair twice
                    const pairId = [node.id, spouseId].sort().join('-');
                    if (!processedSpouses.has(pairId)) {
                        processedSpouses.add(pairId);
                        
                        // Mark this spouse to be positioned at the same level
                        const spouse = nodeMap[spouseId];
                        if (spouse) {
                            // We'll handle these special nodes during hierarchy creation
                            if (!node._spouseNodes) node._spouseNodes = [];
                            node._spouseNodes.push(spouse);
                        }
                    }
                });
            }
        });
        
        // Create a processedParentChild set to track which parent-child links we've processed
        const processedParentChild = new Set();
        
        // Find nodes without parents (roots)
        const hierarchyRootNodes = nodes.filter(node => {
            // Skip the Family node when finding roots
            if (node.name === "Family") return false;
            
            return !links.some(link => 
                (link.type === 'parent-child' && link.target === node.id) || 
                (link.type === 'child-parent' && link.source === node.id)
            );
        });
        
        console.log(`Found ${hierarchyRootNodes.length} root nodes`);
        
        // Create a hierarchical structure for D3 tree layout
        let rootNode;
        
        if (hierarchyRootNodes.length === 0) {
            // If no clear roots, use the first node
            rootNode = nodeMap[nodes[0].id];
        } else if (hierarchyRootNodes.length === 1) {
            // Single root case
            rootNode = nodeMap[hierarchyRootNodes[0].id];
        } else {
            // Multiple roots - create a virtual parent
            rootNode = {
                id: 'virtual-root',
                name: 'Family',
                children: hierarchyRootNodes.map(node => nodeMap[node.id]).filter(Boolean), // Filter out any undefined nodes
                generation: -1 // Virtual root is above generation 0
            };
        }
        
        // Now create a custom hierarchy that handles spouses and multiple parents properly
        const createHierarchy = (node, processedNodes = new Set(), parentLinks = new Map()) => {
            if (!node || processedNodes.has(node.id)) {
                // If we've already processed this node, return the existing hierarchy node
                return parentLinks.get(node.id) || null;
            }
            
            // Create the hierarchy node
            const hierarchyNode = {
                data: node,
                depth: node.generation || 0, // Use the true generation as depth
                height: 0,
                parent: null,
                children: [],
                allParents: [] // Track all parents for multiple parent connections
            };
            
            // Mark this node as processed
            if (node.id) {
                processedNodes.add(node.id);
                // Store this hierarchy node in the map for later reference
                parentLinks.set(node.id, hierarchyNode);
            }
            
            // Process regular children
            if (node.children && node.children.length > 0) {
                const childNodes = [];
                
                node.children.forEach(child => {
                    // Create a unique parent-child identifier
                    const parentChildId = `${node.id}-${child.id}`;
                    
                    // Check if we've already processed this parent-child relationship
                    if (!processedParentChild.has(parentChildId)) {
                        processedParentChild.add(parentChildId);
                        
                        // Get or create the child hierarchy node
                        let childHierarchy = parentLinks.get(child.id);
                        
                        if (!childHierarchy) {
                            childHierarchy = createHierarchy(child, processedNodes, parentLinks);
                        }
                        
                        if (childHierarchy) {
                            // Set parent if not yet assigned, otherwise add to allParents
                            if (!childHierarchy.parent) {
                            childHierarchy.parent = hierarchyNode;
                            childNodes.push(childHierarchy);
                            } else {
                                // This child already has a primary parent, add this as additional parent
                                if (!childHierarchy.allParents.includes(hierarchyNode)) {
                                    childHierarchy.allParents.push(hierarchyNode);
                                }
                            }
                        }
                    }
                });
                
                hierarchyNode.children = childNodes;
                hierarchyNode.height = childNodes.length > 0 ? 
                    Math.max(...childNodes.map(c => c.height)) + 1 : 0;
            }
            
            // Add spouse nodes as special "spouse" children that will be positioned horizontally
            if (node._spouseNodes && node._spouseNodes.length > 0) {
                node._spouseNodes.forEach(spouse => {
                    // Create a special spouse node
                    let spouseNode = parentLinks.get(spouse.id);
                    
                    if (!spouseNode) {
                    // Mark spouse as processed
                    processedNodes.add(spouse.id);
                    
                        spouseNode = {
                        data: spouse,
                        depth: spouse.generation || node.generation || 0, // Same generation as partner
                        height: 0,
                        parent: hierarchyNode,
                        children: [],
                            allParents: [], // Track all parents for multiple parent connections
                        isSpouse: true // Mark as spouse for special handling
                    };
                        
                        parentLinks.set(spouse.id, spouseNode);
                    
                    // Process spouse's children
                    if (spouse.children && spouse.children.length > 0) {
                        const spouseChildNodes = [];
                        
                        spouse.children.forEach(child => {
                                // Create a unique parent-child identifier
                                const parentChildId = `${spouse.id}-${child.id}`;
                                
                                // Check if we've already processed this parent-child relationship
                                if (!processedParentChild.has(parentChildId)) {
                                    processedParentChild.add(parentChildId);
                                    
                                    // Get or create the child hierarchy node
                                    let childHierarchy = parentLinks.get(child.id);
                                    
                                    if (!childHierarchy) {
                                        childHierarchy = createHierarchy(child, processedNodes, parentLinks);
                                    }
                                    
                                if (childHierarchy) {
                                        // Set parent if not yet assigned, otherwise add to allParents
                                        if (!childHierarchy.parent) {
                                    childHierarchy.parent = spouseNode;
                                    spouseChildNodes.push(childHierarchy);
                                        } else {
                                            // This child already has a primary parent, add this as additional parent
                                            if (!childHierarchy.allParents.includes(spouseNode)) {
                                                childHierarchy.allParents.push(spouseNode);
                                            }
                                        }
                                }
                            }
                        });
                        
                        spouseNode.children = spouseChildNodes;
                        spouseNode.height = spouseChildNodes.length > 0 ? 
                            Math.max(...spouseChildNodes.map(c => c.height)) + 1 : 0;
                    }
                    
                    // Add to parent's children
                    hierarchyNode.children.push(spouseNode);
                    
                    // Update parent's height if needed
                    hierarchyNode.height = Math.max(hierarchyNode.height, spouseNode.height + 1);
                    }
                });
            }
            
            return hierarchyNode;
        };
        
        // Create custom hierarchy starting from root
        const parentLinks = new Map();
        const hierarchyRoot = createHierarchy(rootNode, new Set(), parentLinks);
        
        // Add descendants and links methods to mimic d3.hierarchy
        const addHierarchyMethods = (node) => {
            node.descendants = function() {
                const result = [node];
                if (node.children) {
                    node.children.forEach(child => {
                        result.push(...child.descendants());
                    });
                }
                return result;
            };
            
            node.links = function() {
                const result = [];
                if (node.children) {
                    node.children.forEach(child => {
                        result.push({ source: node, target: child });
                        result.push(...child.links());
                    });
                }
                
                // Add links from additional parents
                const allNodes = this.descendants();
                allNodes.forEach(descendant => {
                    if (descendant.allParents && descendant.allParents.length > 0) {
                        descendant.allParents.forEach(parent => {
                            result.push({ 
                                source: parent, 
                                target: descendant,
                                isAdditionalParent: true // Mark as additional parent for styling
                            });
                        });
                    }
                });
                
                return result;
            };
            
            if (node.children) {
                node.children.forEach(addHierarchyMethods);
            }
        };
        
        addHierarchyMethods(hierarchyRoot);
        
        // Collect spouse links for separate rendering
        const spouseLinks = [];
        links.filter(link => link.type === 'spouse').forEach(link => {
            const source = nodeMap[link.source];
            const target = nodeMap[link.target];
            
            if (source && target) {
                spouseLinks.push({ source, target, type: 'spouse' });
            }
        });
        
        return { 
            root: hierarchyRoot, 
            links: spouseLinks,
            processedNodes: Object.values(nodeMap)
        };
    }
    
    /**
     * Center the tree visualization
     */
    centerTree() {
        // Get bounds of the tree
        const bounds = this.g.node().getBBox();
        
        // Add padding
        const padding = 50;
        const width = bounds.width + padding * 2;
        const height = bounds.height + padding * 2;
        
        // Calculate scale to fit
        const scale = Math.min(
            this.width / width,
            this.height / height,
            0.9
        );
        
        // Calculate translation to center
        const translateX = (this.width - bounds.width * scale) / 2 - bounds.x * scale;
        const translateY = (this.height - bounds.height * scale) / 2 - bounds.y * scale;
        
        // Apply transform with transition
        this.svg.transition().duration(750)
            .call(this.zoom.transform, d3.zoomIdentity
                .translate(translateX, translateY)
                .scale(scale));
    }
    
    /**
     * Set root node for the tree
     */
    setRoot(personId) {
        this.loadData(personId);
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        this.svg.transition().duration(300)
            .call(this.zoom.scaleBy, 1.2);
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        this.svg.transition().duration(300)
            .call(this.zoom.scaleBy, 0.8);
    }
    
    /**
     * Reset zoom level
     */
    resetZoom() {
        this.centerTree();
    }
    
    /**
     * Force a fresh load of tree data by clearing the cache state
     */
    clearCache() {
        console.log("DEBUG: Clearing tree data cache state (resetting isLoading)");
        // Reset loading state in case a request failed midway
        this.isLoading = false;
        // NOTE: We removed server-side caching logic here, rely on fresh fetches.
    }
}