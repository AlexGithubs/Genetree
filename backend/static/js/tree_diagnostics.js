/**
 * Comprehensive Tree Diagnostics
 * 
 * This tool systematically tests every component involved in tree generation
 * to identify exactly where the issue is occurring.
 */
window.TreeDiagnostics = {
    /**
     * Run all diagnostics and report findings
     */
    runAll: async function() {
        console.log("🔍 RUNNING COMPREHENSIVE TREE DIAGNOSTICS");
        
        // Store test results
        const results = {
            database: await this.testDatabaseRelationships(),
            api: await this.testApiEndpoints(),
            dataTransformation: await this.testDataTransformation(),
            rendering: await this.testRendering(),
            relationshipCycles: await this.testRelationshipCycles()
        };
        
        // Summarize results
        console.log("📊 DIAGNOSTIC SUMMARY:");
        Object.entries(results).forEach(([test, result]) => {
            console.log(`${result.pass ? '✅' : '❌'} ${test}: ${result.message}`);
        });
        
        return results;
    },
    
    /**
     * Test 1: Database Relationships
     * Checks if relationships are correctly stored in the database
     */
    testDatabaseRelationships: async function() {
        console.log("🔍 Testing Database Relationships...");
        try {
            // Fetch all relationships
            const response = await fetch('/api/relationships');
            const relationships = await response.json();
            
            // Get unique person IDs involved in relationships
            const personIds = new Set();
            relationships.forEach(rel => {
                personIds.add(rel.person1_id);
                personIds.add(rel.person2_id);
            });
            
            // Check each relationship type count
            const typeCounts = relationships.reduce((counts, rel) => {
                counts[rel.relationship_type] = (counts[rel.relationship_type] || 0) + 1;
                return counts;
            }, {});
            
            console.log(`- Found ${relationships.length} relationships involving ${personIds.size} people`);
            console.log('- Relationship types:', typeCounts);
            
            // Check for reciprocal relationships
            const reciprocalCheck = relationships.filter(rel => {
                return relationships.some(otherRel => 
                    rel.person1_id === otherRel.person2_id && 
                    rel.person2_id === otherRel.person1_id
                );
            }).length;
            
            console.log(`- ${reciprocalCheck} relationships have reciprocals`);
            
            return {
                pass: relationships.length > 0,
                message: `Found ${relationships.length} relationships in database`,
                details: { typeCounts, reciprocalCheck, personCount: personIds.size }
            };
        } catch (error) {
            console.error("Database relationship test failed:", error);
            return {
                pass: false,
                message: `Error testing database: ${error.message}`,
                error
            };
        }
    },
    
    /**
     * Test 2: API Endpoints
     * Tests if the API endpoints return expected data structure
     */
    testApiEndpoints: async function() {
        console.log("🔍 Testing API Endpoints...");
        try {
            // Test full tree endpoint
            const fullTreeResponse = await fetch('/api/tree');
            const fullTree = await fullTreeResponse.json();
            
            console.log(`- /api/tree: returned ${fullTree.nodes?.length || 0} nodes and ${fullTree.links?.length || 0} links`);
            
            // If we have nodes, test the root endpoint with the first node
            let rootTreeResults = "Not tested (no nodes available)";
            if (fullTree.nodes && fullTree.nodes.length > 0) {
                const firstId = fullTree.nodes[0].id;
                const rootTreeResponse = await fetch(`/api/tree?root=${firstId}`);
                const rootTree = await rootTreeResponse.json();
                
                rootTreeResults = `Returned ${rootTree.nodes?.length || 0} nodes and ${rootTree.links?.length || 0} links`;
                console.log(`- /api/tree?root=${firstId}: ${rootTreeResults}`);
            }
            
            return {
                pass: fullTree.nodes && fullTree.links,
                message: `API endpoints returned expected data structure`,
                details: {
                    fullTree: `${fullTree.nodes?.length || 0} nodes, ${fullTree.links?.length || 0} links`,
                    rootTree: rootTreeResults
                }
            };
        } catch (error) {
            console.error("API endpoint test failed:", error);
            return {
                pass: false,
                message: `Error testing API endpoints: ${error.message}`,
                error
            };
        }
    },
    
    /**
     * Test 3: Data Transformation
     * Tests if the data transformation logic correctly builds the tree structure
     */
    testDataTransformation: async function() {
        console.log("🔍 Testing Data Transformation...");
        try {
            // Get tree data from API
            const response = await fetch('/api/tree');
            const data = await response.json();
            
            if (!data.nodes || !data.links) {
                return {
                    pass: false,
                    message: "Data structure is missing nodes or links",
                    details: data
                };
            }
            
            // Manually transform data like tree.js does
            const nodeMap = {};
            data.nodes.forEach(node => {
                nodeMap[node.id] = {
                    ...node,
                    parents: [],
                    children: [],
                    spouses: [],
                    level: null
                };
            });
            
            // Process links
            let errorDetected = false;
            data.links.forEach(link => {
                const source = nodeMap[link.source];
                const target = nodeMap[link.target];
                
                if (!source || !target) {
                    console.error(`Link references non-existent node: ${link.source} -> ${link.target}`);
                    errorDetected = true;
                    return;
                }
                
                if (link.type === 'parent-child' || link.type === 'child-parent') {
                    // Process parent-child relationship
                    const parent = link.type === 'parent-child' ? source : target;
                    const child = link.type === 'parent-child' ? target : source;
                    
                    if (!parent.children.includes(child.id)) {
                        parent.children.push(child.id);
                    }
                    if (!child.parents.includes(parent.id)) {
                        child.parents.push(parent.id);
                    }
                } else if (link.type === 'spouse') {
                    // Process spouse relationship
                    if (!source.spouses.includes(target.id)) {
                        source.spouses.push(target.id);
                    }
                    if (!target.spouses.includes(source.id)) {
                        target.spouses.push(source.id);
                    }
                }
            });
            
            // Analyze the transformed data
            const rootNodes = Object.values(nodeMap).filter(node => node.parents.length === 0);
            const maxLevel = this.assignLevels(nodeMap, rootNodes);
            
            // Count nodes at each level
            const levelCounts = Object.values(nodeMap).reduce((counts, node) => {
                if (node.level !== null) {
                    counts[node.level] = (counts[node.level] || 0) + 1;
                }
                return counts;
            }, {});
            
            console.log(`- Found ${rootNodes.length} root nodes`);
            console.log(`- Max generation depth: ${maxLevel}`);
            console.log(`- Nodes per level:`, levelCounts);
            
            const nodesWithParents = Object.values(nodeMap).filter(n => n.parents.length > 0).length;
            const nodesWithChildren = Object.values(nodeMap).filter(n => n.children.length > 0).length;
            const nodesWithSpouses = Object.values(nodeMap).filter(n => n.spouses.length > 0).length;
            
            console.log(`- Nodes with parents: ${nodesWithParents}`);
            console.log(`- Nodes with children: ${nodesWithChildren}`);
            console.log(`- Nodes with spouses: ${nodesWithSpouses}`);
            
            return {
                pass: !errorDetected && maxLevel >= 2,
                message: errorDetected ? 
                    "Errors detected during transformation" : 
                    `Data transforms to tree with ${maxLevel + 1} generations`,
                details: {
                    rootNodes: rootNodes.length,
                    maxLevel,
                    levelCounts,
                    nodesWithParents,
                    nodesWithChildren,
                    nodesWithSpouses
                }
            };
        } catch (error) {
            console.error("Data transformation test failed:", error);
            return {
                pass: false,
                message: `Error in data transformation: ${error.message}`,
                error
            };
        }
    },
    
    /**
     * Helper function to assign levels to nodes
     */
    assignLevels: function(nodeMap, rootNodes) {
        // Start with roots at level 0
        const queue = rootNodes.map(node => ({ id: node.id, level: 0 }));
        const visited = new Set();
        let maxLevel = 0;
        
        while (queue.length > 0) {
            const { id, level } = queue.shift();
            const node = nodeMap[id];
            
            // Skip if already visited with a better (lower) level
            if (visited.has(id) && node.level <= level) {
                continue;
            }
            
            // Set node level
            node.level = level;
            visited.add(id);
            maxLevel = Math.max(maxLevel, level);
            
            // Process spouses (same level)
            node.spouses.forEach(spouseId => {
                if (!visited.has(spouseId) || nodeMap[spouseId].level > level) {
                    queue.push({ id: spouseId, level });
                }
            });
            
            // Process children (next level)
            node.children.forEach(childId => {
                queue.push({ id: childId, level: level + 1 });
            });
        }
        
        return maxLevel;
    },
    
    /**
     * Test 4: Rendering Logic
     * Tests if the tree rendering code can handle the data correctly
     */
    testRendering: function() {
        console.log("🔍 Testing Rendering Logic...");
        
        // Create a mock dataset with 3 generations
        const mockData = this.createMockFamilyTree();
        
        // Now check if the rendering code can handle this data
        try {
            // Create a small hidden test container
            const testContainer = document.createElement('div');
            testContainer.id = 'test-tree-container';
            testContainer.style.position = 'fixed';
            testContainer.style.top = '-9999px';
            testContainer.style.width = '800px';
            testContainer.style.height = '600px';
            document.body.appendChild(testContainer);
            
            // Create a test tree instance
            const testTree = new FamilyTreeVisualization('test-tree-container');
            
            // Mock the loadData method to return our test data
            const originalLoadData = testTree.loadData;
            testTree.loadData = async () => {
                testTree.update(mockData);
                return mockData;
            };
            
            // Call loadData
            testTree.loadData();
            
            // Examine the rendering
            const svg = testContainer.querySelector('svg');
            const nodes = svg.querySelectorAll('.node');
            const links = svg.querySelectorAll('.link');
            
            console.log(`- Rendering created ${nodes.length} nodes and ${links.length} links`);
            
            // Count nodes with transform attributes (positioned)
            const positionedNodes = Array.from(nodes).filter(
                node => node.hasAttribute('transform')
            ).length;
            
            console.log(`- ${positionedNodes} nodes have position data`);
            
            // Check at least 3 different y-positions (3 generations)
            const yPositions = new Set();
            Array.from(nodes).forEach(node => {
                const transform = node.getAttribute('transform');
                if (transform) {
                    const yMatch = transform.match(/translate\([^,]+,([^)]+)\)/);
                    if (yMatch && yMatch[1]) {
                        yPositions.add(Math.round(parseFloat(yMatch[1]) / 10) * 10); // Round to nearest 10
                    }
                }
            });
            
            console.log(`- Found ${yPositions.size} distinct vertical levels`);
            
            // Cleanup
            document.body.removeChild(testContainer);
            testTree.loadData = originalLoadData;
            
            return {
                pass: yPositions.size >= 3,
                message: `Rendering logic can handle ${yPositions.size} generations`,
                details: {
                    nodeCount: nodes.length,
                    linkCount: links.length,
                    positionedNodes,
                    verticalLevels: yPositions.size
                }
            };
        } catch (error) {
            console.error("Rendering test failed:", error);
            return {
                pass: false,
                message: `Error in rendering test: ${error.message}`,
                error
            };
        }
    },
    
    /**
     * Create a mock family tree with 3 generations
     */
    createMockFamilyTree: function() {
        return {
            nodes: [
                // Generation 0: Grandparents
                { id: 1, name: "Grandparent 1", gender: "male" },
                { id: 2, name: "Grandparent 2", gender: "female" },
                
                // Generation 1: Parents
                { id: 3, name: "Parent 1", gender: "male" },
                { id: 4, name: "Parent 2", gender: "female" },
                
                // Generation 2: Children
                { id: 5, name: "Child 1", gender: "male" },
                { id: 6, name: "Child 2", gender: "female" }
            ],
            links: [
                // Grandparent relationship
                { source: 1, target: 2, type: "spouse" },
                
                // Parent relationship
                { source: 3, target: 4, type: "spouse" },
                
                // Grandparent to parent
                { source: 1, target: 3, type: "parent-child" },
                { source: 2, target: 3, type: "parent-child" },
                
                // Parent to children
                { source: 3, target: 5, type: "parent-child" },
                { source: 3, target: 6, type: "parent-child" },
                { source: 4, target: 5, type: "parent-child" },
                { source: 4, target: 6, type: "parent-child" }
            ]
        };
    },
    
    /**
     * Test 5: Relationship Cycles
     * Tests if there are circular relationships that could be causing issues
     */
    testRelationshipCycles: async function() {
        console.log("🔍 Testing for Relationship Cycles...");
        try {
            const response = await fetch('/api/tree');
            const data = await response.json();
            
            if (!data.nodes || !data.links) {
                return {
                    pass: false,
                    message: "Data structure is missing nodes or links",
                    details: data
                };
            }
            
            // Find cycles in the relationship graph
            const nodeMap = {};
            data.nodes.forEach(node => {
                nodeMap[node.id] = {
                    ...node,
                    neighbors: new Set()
                };
            });
            
            // Build adjacency list
            data.links.forEach(link => {
                if (nodeMap[link.source] && nodeMap[link.target]) {
                    nodeMap[link.source].neighbors.add(link.target);
                    if (link.type !== 'parent-child' && link.type !== 'child-parent') {
                        // For non-directional relationships, add both directions
                        nodeMap[link.target].neighbors.add(link.source);
                    }
                }
            });
            
            // Helper function for cycle detection
            const hasCycle = (nodeId, visited = new Set(), recursionStack = new Set()) => {
                // Mark current node as visited and add to recursion stack
                visited.add(nodeId);
                recursionStack.add(nodeId);
                
                // Check all neighbors
                const node = nodeMap[nodeId];
                for (const neighborId of node.neighbors) {
                    // If not visited, check if cycle exists from neighbor
                    if (!visited.has(neighborId)) {
                        if (hasCycle(neighborId, visited, recursionStack)) {
                            return true;
                        }
                    } 
                    // If already in recursion stack, there's a cycle
                    else if (recursionStack.has(neighborId)) {
                        return true;
                    }
                }
                
                // Remove from recursion stack
                recursionStack.delete(nodeId);
                return false;
            };
            
            // Check each node for cycles
            const cycles = [];
            for (const nodeId in nodeMap) {
                const visited = new Set();
                const recursionStack = new Set();
                if (hasCycle(parseInt(nodeId), visited, recursionStack)) {
                    cycles.push(nodeId);
                }
            }
            
            console.log(`- Found ${cycles.length} nodes involved in cycles`);
            
            return {
                pass: cycles.length === 0,
                message: cycles.length === 0 ? 
                    "No relationship cycles detected" : 
                    `Found ${cycles.length} nodes involved in relationship cycles`,
                details: { cycleNodes: cycles }
            };
        } catch (error) {
            console.error("Relationship cycle test failed:", error);
            return {
                pass: false,
                message: `Error testing relationship cycles: ${error.message}`,
                error
            };
        }
    },
    
    /**
     * Raw data dump for detailed investigation
     */
    dumpRawData: async function() {
        console.log("📊 Dumping Raw Data for Investigation...");
        
        try {
            // Fetch raw data
            const treeResponse = await fetch('/api/tree');
            const treeData = await treeResponse.json();
            
            const membersResponse = await fetch('/api/persons');
            const membersData = await membersResponse.json();
            
            const relationshipsResponse = await fetch('/api/relationships');
            const relationshipsData = await relationshipsResponse.json();
            
            const dump = {
                tree: treeData,
                members: membersData,
                relationships: relationshipsData
            };
            
            console.log("📊 COMPLETE DATA DUMP:", dump);
            return dump;
        } catch (error) {
            console.error("Failed to dump raw data:", error);
            return null;
        }
    }
};

// Add simple helper to run diagnostics from browser console
window.runTreeTests = function() {
    return TreeDiagnostics.runAll();
};

window.dumpTreeData = function() {
    return TreeDiagnostics.dumpRawData();
};

console.log("💡 Tree diagnostics loaded. Run window.runTreeTests() to diagnose tree issues."); 