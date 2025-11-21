
import { CircuitData, CircuitNode, CircuitConnection, SimulationResult } from '../types';

// --- Helper: Value Parsing ---
const parseValue = (valStr?: string): number => {
  if (!valStr) return 0;
  const str = valStr.toLowerCase().trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  
  if (str.includes('k')) return num * 1000;
  if (str.includes('m') && !str.includes('mhz') && !str.includes('mv')) return num * 1000000; // Mega
  if (str.includes('u')) return num * 0.000001;
  if (str.includes('n')) return num * 0.000000001;
  if (str.includes('p')) return num * 0.000000000001;
  
  return num;
};

/**
 * Gaussian Elimination Solver for Ax = B
 */
const solveLinearSystem = (A: number[][], B: number[]): number[] => {
  const n = B.length;
  
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row
    for (let k = i; k < n; k++) {
      const tmp = A[maxRow][k];
      A[maxRow][k] = A[i][k];
      A[i][k] = tmp;
    }
    const tmp = B[maxRow];
    B[maxRow] = B[i];
    B[i] = tmp;

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      B[k] += c * B[i];
    }
  }

  // Solve equation Ax=B for an upper triangular matrix A
  const x = new Array(n).fill(0);
  for (let i = n - 1; i > -1; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    if (Math.abs(A[i][i]) < 1e-10) {
        x[i] = 0; // Singular / disconnected
    } else {
        x[i] = (B[i] - sum) / A[i][i];
    }
  }
  return x;
};

/**
 * Advanced DC Linear Simulator using MNA (Modified Nodal Analysis)
 */
export const runAdvancedSimulation = (data: CircuitData): SimulationResult => {
  // 1. Map Nodes to Indices
  // We treat component leads as connected to "Net" nodes.
  // A "Net" is a group of component IDs connected by wires.
  
  const nets: Set<string>[] = [];
  const nodeToNetIndex = new Map<string, number>();

  // Initialize disjoint sets for wires
  data.nodes.forEach(n => {
    nets.push(new Set([n.id]));
    nodeToNetIndex.set(n.id, nets.length - 1);
  });

  // Union sets based on connections
  // A naive union-find approach
  data.connections.forEach(conn => {
    const netIdx1 = nodeToNetIndex.get(conn.sourceId)!;
    const netIdx2 = nodeToNetIndex.get(conn.targetId)!;
    
    if (netIdx1 !== netIdx2) {
      // Merge nets
      const targetNet = nets[netIdx1];
      const sourceNet = nets[netIdx2];
      sourceNet.forEach(id => {
        targetNet.add(id);
        nodeToNetIndex.set(id, netIdx1);
      });
      // Clear the old net to mark as merged (we won't remove it to keep indices stable for now)
      sourceNet.clear(); 
    }
  });

  // Compress Nets: Remove empty sets and assign final Matrix Indices
  const activeNets: Set<string>[] = [];
  const netIdToMatrixIndex = new Map<number, number>(); // Old Net Index -> Matrix Index
  
  let groundMatrixIndex = -1;

  nets.forEach((net, oldIdx) => {
    if (net.size > 0) {
      const matrixIdx = activeNets.length;
      activeNets.push(net);
      netIdToMatrixIndex.set(oldIdx, matrixIdx);

      // Check for ground
      let isGround = false;
      net.forEach(nodeId => {
        const node = data.nodes.find(n => n.id === nodeId);
        if (node?.type === 'ground') isGround = true;
      });

      if (isGround) groundMatrixIndex = matrixIdx;
    }
  });

  const numNets = activeNets.length;
  // MNA Matrix Size = NumNets + NumVoltageSources
  // We need to identify voltage sources (Batteries) to size the matrix
  const voltageSources: CircuitNode[] = [];
  data.nodes.forEach(n => {
     if (n.type === 'source') voltageSources.push(n);
  });

  const numVars = numNets + voltageSources.length;
  const G = Array(numVars).fill(0).map(() => Array(numVars).fill(0));
  const I = Array(numVars).fill(0);

  // Helper to get Net Index for a component node
  const getNetIdx = (nodeId: string): number => {
     const old = nodeToNetIndex.get(nodeId);
     if (old === undefined) return -1;
     return netIdToMatrixIndex.get(old) ?? -1;
  };

  // 2. Build Matrix
  // Process Components
  
  // Identify "Two-Terminal" components connected between nets
  // This is tricky because our data model is Nodes=Components.
  // In a real netlist, Components have *Pins* connected to Nets.
  // In our model, a connection is NodeA <-> NodeB.
  // Simplification:
  // A Connection represents a wire. We already merged these into Nets.
  // BUT, Resistors/Sources are Nodes themselves.
  // How do they connect? 
  // In this specific graph model, usually: Source -> Resistor -> Ground.
  // The "Connection" object links them.
  // So, the Node *is* the terminal? No, that doesn't work for 2-terminal parts.
  // 
  // Correction for this Data Model:
  // The visualizer model treats nodes as components. 
  // Wires connect Component A to Component B.
  // This implies Components are nodes in the graph.
  // This is Graph-based, not Netlist-based.
  //
  // Interpretation for Simulation:
  // A "Wire" (CircuitConnection) is an ideal conductor. 
  // BUT, a Component (like Resistor) is *between* wires.
  // Wait, the current data structure is:
  // Connection: sourceId -> targetId.
  // This means Component A is connected to Component B.
  // This is ambiguous: Which pin?
  // For 2-terminal components, we can assume "Pin 1" and "Pin 2" are implicitly handled by flow direction or we treat the node as a "junction" if it's a 3+ terminal?
  // 
  // REVISED STRATEGY FOR THIS DATA MODEL:
  // We must treat the *Connections* (Edges) as the components? No, wires are edges.
  // We must treat the *Nodes* as the components.
  // We need to infer terminals.
  //
  // Assumption for Educational Simulator V1:
  // Each Component Node is actually a "Point" in the circuit? No, it's a whole component.
  // Let's assume standard left-to-right or top-to-bottom flow for 2-terminal devices if ambiguous?
  // No, that's too fragile.
  //
  // Alternative Interpretation (Standard for Node-based UI):
  // The "Component Node" on the canvas represents the device.
  // The "Wires" connect specific devices.
  // But we don't have Pin IDs in `CircuitConnection`.
  //
  // Robust Solution for V1:
  // We will treat every `CircuitConnection` as a potential "Node" (Net) in the electrical sense? No.
  //
  // Let's look at the `source` -> `resistor` -> `ground` example.
  // Node1(Source) --Conn1--> Node2(Resistor) --Conn2--> Node3(Ground).
  //
  // Electrical Equivalent:
  // Net A connects Source(+) to Resistor(In).
  // Net B connects Resistor(Out) to Ground.
  // Net C connects Source(-) to Ground? (Implicit ground for source?)
  //
  // We will deduce electrical nodes (Nets) by clustering connections.
  // 1. Every "Port" on a component is a potential attachment point.
  // 2. We need to assign ports to connections.
  //
  // Heuristic:
  // - A component has a "Left/Top" group of connections (Pin 1) and "Right/Bottom" group (Pin 2).
  // - We partition the connections incident to a node into 2 sets based on geometry (or just greedy split).
  //
  // Simplified Heuristic for this specific app:
  // - Source: All connections are "Positive". "Negative" is implicit Ground.
  // - Ground: All connections are "Ground".
  // - Resistor/LED/Switch: We need 2 terminals.
  //   - Split connections into 2 sets. If only 1 connection, it's dangling.
  //   - If 2 connections, one is Pin 1, one is Pin 2.
  //   - If >2, we need to group them.
  //
  //   Let's iterate through all component nodes.
  //   Assign a unique "Pin 1 Net ID" and "Pin 2 Net ID" to each component.
  //   Initially, these are unique variables.
  //   Then, we iterate Connections. A connection merges the Net ID of Source(Pin ?) and Target(Pin ?).
  //   How do we know which Pin?
  //   - Use relative geometry. If target is to the right of source, connect Source(Pin2) to Target(Pin1).
  
  const electricalNets = new DisjointSet();
  const componentPins = new Map<string, { p1: number, p2: number }>(); // NodeId -> {netId1, netId2}

  // 1. Initialize Pins for every component
  data.nodes.forEach(node => {
    // Create two new electrical nets for every component initially
    const n1 = electricalNets.makeSet();
    const n2 = electricalNets.makeSet();
    
    if (node.type === 'ground') {
      // Ground is a single net, p1 and p2 are same (shorted)
      electricalNets.union(n1, n2);
    } 
    
    componentPins.set(node.id, { p1: n1, p2: n2 });
  });

  // 2. Merge Nets based on Connections and Geometry
  data.connections.forEach(conn => {
    const srcNode = data.nodes.find(n => n.id === conn.sourceId)!;
    const tgtNode = data.nodes.find(n => n.id === conn.targetId)!;
    
    const srcPins = componentPins.get(srcNode.id)!;
    const tgtPins = componentPins.get(tgtNode.id)!;

    // Determine which pin to connect. 
    // Heuristic: Flow is generally Left->Right or Top->Bottom.
    // Source Pin 2 (Output) -> Target Pin 1 (Input)
    
    // Special case: Battery. Pin 1 is (+), Pin 2 is (-/GND).
    // Usually we connect wires to the (+).
    // So Source Pin 1 connects to Target Pin 1.
    
    let srcPinToUse = srcPins.p1; // Default to P1
    if (srcNode.type === 'source') srcPinToUse = srcPins.p1; // + Terminal
    else if (srcNode.type !== 'ground') srcPinToUse = srcPins.p2; // Output side of generic component

    let tgtPinToUse = tgtPins.p1; // Input side of generic component

    electricalNets.union(srcPinToUse, tgtPinToUse);
  });

  // 3. Global Ground Handling
  // Find all Ground components and union their nets to a single logical Ground Net
  const groundNodes = data.nodes.filter(n => n.type === 'ground');
  let globalGroundNet = -1;
  if (groundNodes.length > 0) {
    globalGroundNet = electricalNets.find(componentPins.get(groundNodes[0].id)!.p1);
    for (let i = 1; i < groundNodes.length; i++) {
      const gNet = electricalNets.find(componentPins.get(groundNodes[i].id)!.p1);
      electricalNets.union(globalGroundNet, gNet);
    }
    globalGroundNet = electricalNets.find(globalGroundNet); // Update representative
  } else {
     // If no ground, pick arbitrary node as reference? Or just let it float (will fail).
     // We'll implicitly ground the negative terminal of the first source we find.
     const firstSource = data.nodes.find(n => n.type === 'source');
     if (firstSource) {
       const pins = componentPins.get(firstSource.id)!;
       globalGroundNet = electricalNets.find(pins.p2); // Ground the negative terminal
     }
  }

  // 4. Assign Matrix Indices to Nets
  const uniqueNetIds = new Set<number>();
  data.nodes.forEach(n => {
    const pins = componentPins.get(n.id)!;
    uniqueNetIds.add(electricalNets.find(pins.p1));
    uniqueNetIds.add(electricalNets.find(pins.p2));
  });

  const netToMatrixMap = new Map<number, number>();
  let matrixSize = 0;
  uniqueNetIds.forEach(netId => {
    if (netId !== globalGroundNet) {
      netToMatrixMap.set(netId, matrixSize++);
    }
  });

  // Add variables for voltage sources (Currents)
  // For every source, we add a variable I_source
  const sources = data.nodes.filter(n => n.type === 'source');
  const sourceStartIndex = matrixSize;
  matrixSize += sources.length;

  // Initialize Matrix
  const matrix = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(0));
  const rhs = Array(matrixSize).fill(0);

  // 5. Stamp Components
  data.nodes.forEach(node => {
    const pins = componentPins.get(node.id)!;
    const net1 = electricalNets.find(pins.p1);
    const net2 = electricalNets.find(pins.p2);
    
    const idx1 = net1 === globalGroundNet ? -1 : netToMatrixMap.get(net1)!;
    const idx2 = net2 === globalGroundNet ? -1 : netToMatrixMap.get(net2)!;

    if (node.type === 'resistor' || node.type === 'led' || node.type === 'switch') {
       let R = 1e9; // Open
       if (node.type === 'resistor') R = parseValue(node.value) || 1000;
       else if (node.type === 'led') R = 50; // Simplified LED model
       else if (node.type === 'switch') R = node.value === 'closed' ? 0.01 : 1e9;

       const G = 1/R;
       
       if (idx1 !== -1) matrix[idx1][idx1] += G;
       if (idx2 !== -1) matrix[idx2][idx2] += G;
       if (idx1 !== -1 && idx2 !== -1) {
         matrix[idx1][idx2] -= G;
         matrix[idx2][idx1] -= G;
       }
    } else if (node.type === 'source') {
      // Voltage Source V = p1 - p2
      // Equation: V(p1) - V(p2) = Voltage
      // Also adds current variable contributions to KCL at p1 and p2
      const sourceIdx = sourceStartIndex + sources.indexOf(node);
      const voltage = parseValue(node.value) || 9;

      // KCL contributions: +I leaving p1, -I leaving p2?
      // Convention: Current flows out of +, into -
      // p1 is +, p2 is -
      // KCL at p1: I_source leaves p1. So +1 * I_src
      // KCL at p2: I_source enters p2. So -1 * I_src
      
      if (idx1 !== -1) {
        matrix[idx1][sourceIdx] += 1;
        matrix[sourceIdx][idx1] += 1;
      }
      if (idx2 !== -1) {
        matrix[idx2][sourceIdx] -= 1;
        matrix[sourceIdx][idx2] -= 1;
      }
      
      rhs[sourceIdx] = voltage;
    }
  });

  // 6. Solve
  let solution: number[] = [];
  try {
    solution = solveLinearSystem(matrix, rhs);
  } catch (e) {
    console.error("Solver failed", e);
    solution = Array(matrixSize).fill(0);
  }

  // 7. Extract Results
  const nodeVoltages = new Map<string, number>();
  const componentCurrents = new Map<string, number>();
  const componentPower = new Map<string, number>();
  const poweredNodes = new Set<string>();

  // Map Net Voltages back to Nodes
  // Actually we have voltages for NETS.
  // We want visualization on Nodes (Components).
  // We'll store the voltage of the Input Pin (p1) as the "Node Voltage" for visualization simplicity,
  // or we can store both.
  // Let's store P1 voltage.
  
  data.nodes.forEach(node => {
    const pins = componentPins.get(node.id)!;
    const net1 = electricalNets.find(pins.p1);
    const net2 = electricalNets.find(pins.p2);
    
    const v1 = net1 === globalGroundNet ? 0 : solution[netToMatrixMap.get(net1)!] || 0;
    const v2 = net2 === globalGroundNet ? 0 : solution[netToMatrixMap.get(net2)!] || 0;
    
    nodeVoltages.set(node.id, v1); // Use P1 as primary reference for the node label

    // Calculate Component Current & Power
    let current = 0;
    if (node.type === 'resistor' || node.type === 'led' || node.type === 'switch') {
        let R = 1000;
        if (node.type === 'resistor') R = parseValue(node.value) || 1000;
        else if (node.type === 'led') R = 50;
        else if (node.type === 'switch') R = node.value === 'closed' ? 0.01 : 1e9;
        
        current = (v1 - v2) / R;
    } else if (node.type === 'source') {
        const sourceIdx = sourceStartIndex + sources.indexOf(node);
        current = solution[sourceIdx]; // This is the current supplying the circuit
    }

    componentCurrents.set(node.id, current);
    componentPower.set(node.id, Math.abs(current * (v1 - v2)));

    // Powered Logic for backward compat
    if (Math.abs(v1) > 0.1 || Math.abs(v2) > 0.1) {
        poweredNodes.add(node.id);
    }
    // Always power sources
    if (node.type === 'source') poweredNodes.add(node.id);
  });

  return {
    nodeVoltages,
    componentCurrents,
    componentPower,
    isPowered: poweredNodes
  };
};


// --- Helper Class: Disjoint Set for Net Management ---
class DisjointSet {
  parent: number[] = [];
  
  makeSet(): number {
    const id = this.parent.length;
    this.parent.push(id);
    return id;
  }

  find(i: number): number {
    if (this.parent[i] === i) return i;
    this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(i: number, j: number) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

// Maintain old signature for backward compat if needed, or just replace
export const runSimulation = (data: CircuitData): Set<string> => {
   return runAdvancedSimulation(data).isPowered;
};
