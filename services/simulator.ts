
import { CircuitData } from '../types';

/**
 * A simple connectivity simulator.
 * 
 * Logic:
 * 1. Find all Source nodes.
 * 2. Perform a graph traversal (BFS) to find all nodes reachable from sources.
 *    - Switches act as gates: if value is 'open', traversal stops at that node.
 * 3. Find all Ground nodes.
 * 4. Perform a backward graph traversal from Grounds to find all nodes that have a return path.
 * 5. Any node that is both reachable from Source and has a path to Ground is considered "Powered".
 */
export const runSimulation = (data: CircuitData): Set<string> => {
  const adj = new Map<string, string[]>();
  data.nodes.forEach(n => adj.set(n.id, []));

  // Build adjacency list (undirected graph)
  data.connections.forEach(c => {
    adj.get(c.sourceId)?.push(c.targetId);
    adj.get(c.targetId)?.push(c.sourceId);
  });

  const sources = data.nodes.filter(n => n.type === 'source').map(n => n.id);
  const grounds = data.nodes.filter(n => n.type === 'ground').map(n => n.id);

  // Helper for traversal
  const getReachable = (startNodes: string[]): Set<string> => {
    const visited = new Set<string>(startNodes);
    const queue = [...startNodes];

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const neighbors = adj.get(currId) || [];
      const currNode = data.nodes.find(n => n.id === currId);

      // Check if current node blocks flow (Switch logic)
      // If it is a switch and it is open (or not closed), it blocks flow TO neighbors
      // exception: we are already AT this node, so it is "reached", but we can't go further.
      // However, if we are starting from Source, the switch itself receives power.
      
      let canPass = true;
      if (currNode?.type === 'switch') {
        // Default to open if not specified
        const isClosed = currNode.value === 'closed';
        if (!isClosed) canPass = false;
      }

      if (canPass) {
        for (const nextId of neighbors) {
          if (!visited.has(nextId)) {
            visited.add(nextId);
            queue.push(nextId);
          }
        }
      }
    }
    return visited;
  };

  const reachableFromSource = getReachable(sources);
  
  // For ground return path, we do the same logic. 
  // A component is part of a complete circuit if it has a path to VCC AND a path to GND.
  const reachableFromGround = getReachable(grounds);

  const poweredNodes = new Set<string>();
  reachableFromSource.forEach(id => {
    if (reachableFromGround.has(id)) {
      poweredNodes.add(id);
    }
  });

  // Special Case: Sources are always "powered" visually if they are connected to anything? 
  // Actually, let's just say sources are always active.
  sources.forEach(id => poweredNodes.add(id));

  return poweredNodes;
};
