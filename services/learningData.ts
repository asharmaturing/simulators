
import { PresetCircuit, GuideChapter } from '../types';

export const PRESET_CIRCUITS: PresetCircuit[] = [
  // Beginner
  {
    id: 'p1',
    name: 'Simple LED Circuit',
    description: 'The "Hello World" of electronics. Learn how to power an LED.',
    difficulty: 'Beginner',
    category: 'Basics',
    components: ['Battery', 'Resistor', 'LED', 'Ground'],
    learningObjectives: ['Basic current flow', 'Polarity', 'Completing a circuit'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '9V Battery', x: 100, y: 300, value: '9V' },
        { id: 'n2', type: 'resistor', label: '330Ω', x: 300, y: 300, value: '330Ω' },
        { id: 'n3', type: 'led', label: 'Red LED', x: 500, y: 300, value: 'Red' },
        { id: 'n4', type: 'ground', label: 'GND', x: 700, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n4' }
      ]
    }
  },
  {
    id: 'p2',
    name: 'Switch-Controlled Light',
    description: 'Add a control element to your circuit to toggle power.',
    difficulty: 'Beginner',
    category: 'Control',
    components: ['Battery', 'Switch', 'Resistor', 'LED', 'Ground'],
    learningObjectives: ['Switch mechanics', 'Open vs Closed circuits'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '9V', x: 100, y: 300, value: '9V' },
        { id: 'n2', type: 'switch', label: 'SW1', x: 260, y: 300, value: 'open' },
        { id: 'n3', type: 'resistor', label: '330Ω', x: 420, y: 300, value: '330Ω' },
        { id: 'n4', type: 'led', label: 'LED', x: 580, y: 300, value: 'Green' },
        { id: 'n5', type: 'ground', label: 'GND', x: 740, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n4' },
        { id: 'e4', sourceId: 'n4', targetId: 'n5' }
      ]
    }
  },
  {
    id: 'p3',
    name: 'Parallel LEDs',
    description: 'Power multiple components independently from one source.',
    difficulty: 'Beginner',
    category: 'Basics',
    components: ['Battery', '2x Resistor', '2x LED', 'Ground'],
    learningObjectives: ['Parallel connections', 'Independent paths'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '9V', x: 100, y: 300, value: '9V' },
        { id: 'n2', type: 'resistor', label: 'R1', x: 300, y: 200, value: '330Ω' },
        { id: 'n3', type: 'resistor', label: 'R2', x: 300, y: 400, value: '330Ω' },
        { id: 'n4', type: 'led', label: 'LED1', x: 500, y: 200, value: 'Red' },
        { id: 'n5', type: 'led', label: 'LED2', x: 500, y: 400, value: 'Blue' },
        { id: 'n6', type: 'ground', label: 'GND', x: 700, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n1', targetId: 'n3' },
        { id: 'e3', sourceId: 'n2', targetId: 'n4' },
        { id: 'e4', sourceId: 'n3', targetId: 'n5' },
        { id: 'e5', sourceId: 'n4', targetId: 'n6' },
        { id: 'e6', sourceId: 'n5', targetId: 'n6' }
      ]
    }
  },
  // Intermediate
  {
    id: 'p4',
    name: 'AND Logic Gate',
    description: 'Build a logic gate where two inputs must be ON for output.',
    difficulty: 'Intermediate',
    category: 'Logic',
    components: ['Battery', '2x Switch', 'LED', 'Resistor', 'Ground'],
    learningObjectives: ['Series switching', 'Boolean AND logic'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '5V', x: 100, y: 300, value: '5V' },
        { id: 'n2', type: 'switch', label: 'Input A', x: 250, y: 300, value: 'open' },
        { id: 'n3', type: 'switch', label: 'Input B', x: 400, y: 300, value: 'open' },
        { id: 'n4', type: 'resistor', label: '220Ω', x: 550, y: 300, value: '220Ω' },
        { id: 'n5', type: 'led', label: 'Output', x: 700, y: 300, value: 'Red' },
        { id: 'n6', type: 'ground', label: 'GND', x: 850, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n4' },
        { id: 'e4', sourceId: 'n4', targetId: 'n5' },
        { id: 'e5', sourceId: 'n5', targetId: 'n6' }
      ]
    }
  },
  {
    id: 'p5',
    name: 'OR Logic Gate',
    description: 'Build a logic gate where either input turns on the output.',
    difficulty: 'Intermediate',
    category: 'Logic',
    components: ['Battery', '2x Switch', 'LED', 'Resistor', 'Ground'],
    learningObjectives: ['Parallel switching', 'Boolean OR logic'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '5V', x: 100, y: 300, value: '5V' },
        { id: 'n2', type: 'switch', label: 'Input A', x: 300, y: 200, value: 'open' },
        { id: 'n3', type: 'switch', label: 'Input B', x: 300, y: 400, value: 'open' },
        { id: 'n4', type: 'resistor', label: '220Ω', x: 500, y: 300, value: '220Ω' },
        { id: 'n5', type: 'led', label: 'Output', x: 650, y: 300, value: 'Red' },
        { id: 'n6', type: 'ground', label: 'GND', x: 800, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n1', targetId: 'n3' },
        { id: 'e3', sourceId: 'n2', targetId: 'n4' },
        { id: 'e4', sourceId: 'n3', targetId: 'n4' },
        { id: 'e5', sourceId: 'n4', targetId: 'n5' },
        { id: 'e6', sourceId: 'n5', targetId: 'n6' }
      ]
    }
  },
  {
    id: 'p6',
    name: 'Capacitor Filter',
    description: 'Demonstrate a capacitor alongside a load.',
    difficulty: 'Intermediate',
    category: 'Components',
    components: ['Battery', 'Switch', 'Resistor', 'Capacitor', 'LED', 'Ground'],
    learningObjectives: ['Capacitor placement', 'Parallel load'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '9V', x: 100, y: 300, value: '9V' },
        { id: 'n2', type: 'switch', label: 'SW', x: 250, y: 300, value: 'open' },
        { id: 'n3', type: 'resistor', label: 'R1', x: 400, y: 300, value: '1kΩ' },
        { id: 'n4', type: 'capacitor', label: 'C1', x: 550, y: 450, value: '100uF' },
        { id: 'n5', type: 'led', label: 'LED', x: 550, y: 300, value: 'Red' },
        { id: 'n6', type: 'ground', label: 'GND', x: 700, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n5' },
        { id: 'e4', sourceId: 'n3', targetId: 'n4' }, // Capacitor connected after resistor
        { id: 'e5', sourceId: 'n5', targetId: 'n6' },
        { id: 'e6', sourceId: 'n4', targetId: 'n6' }
      ]
    }
  },
  // Advanced
  {
    id: 'p7',
    name: 'Voltage Divider',
    description: 'Create a reference voltage using two resistors.',
    difficulty: 'Advanced',
    category: 'Theory',
    components: ['Battery', '2x Resistor', 'Ground'],
    learningObjectives: ['Ohm\'s Law', 'Voltage division formula', 'Reference nodes'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '10V', x: 200, y: 100, value: '10V' },
        { id: 'n2', type: 'resistor', label: 'R1 (10k)', x: 400, y: 200, value: '10kΩ' },
        { id: 'n3', type: 'resistor', label: 'R2 (10k)', x: 400, y: 400, value: '10kΩ' },
        { id: 'n4', type: 'ground', label: 'GND', x: 400, y: 550 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n4' }
      ]
    }
  },
  {
    id: 'p8',
    name: '3-Way Switch',
    description: 'Control a light from two different switches (XOR-like behavior).',
    difficulty: 'Advanced',
    category: 'Control',
    components: ['Battery', '2x Switch', 'LED', 'Ground'],
    learningObjectives: ['Multi-point control', 'Complex switching'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '9V', x: 100, y: 300, value: '9V' },
        { id: 'n2', type: 'switch', label: 'SW1', x: 300, y: 200, value: 'closed' },
        { id: 'n3', type: 'switch', label: 'SW2', x: 300, y: 400, value: 'open' },
        { id: 'n4', type: 'led', label: 'Hallway Light', x: 500, y: 300, value: 'White' },
        { id: 'n5', type: 'ground', label: 'GND', x: 700, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n4' },
        { id: 'e3', sourceId: 'n1', targetId: 'n3' },
        { id: 'e4', sourceId: 'n3', targetId: 'n4' },
        { id: 'e5', sourceId: 'n4', targetId: 'n5' }
      ]
    }
  },
  {
    id: 'p9',
    name: 'Full Wave Rectifier Bridge (Concept)',
    description: 'Conceptual arrangement of diodes to rectify AC.',
    difficulty: 'Advanced',
    category: 'Power',
    components: ['Source', '4x LED (as Diodes)', 'Resistor', 'Ground'],
    learningObjectives: ['Diode bridges', 'AC to DC', 'Routing'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: 'AC In', x: 100, y: 300, value: '12V' },
        { id: 'n2', type: 'led', label: 'D1', x: 300, y: 200, value: 'Diode' },
        { id: 'n3', type: 'led', label: 'D2', x: 400, y: 200, value: 'Diode' },
        { id: 'n4', type: 'led', label: 'D3', x: 300, y: 400, value: 'Diode' },
        { id: 'n5', type: 'led', label: 'D4', x: 400, y: 400, value: 'Diode' },
        { id: 'n6', type: 'resistor', label: 'Load', x: 600, y: 300, value: '1kΩ' },
        { id: 'n7', type: 'ground', label: 'GND', x: 750, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n1', targetId: 'n4' },
        { id: 'e3', sourceId: 'n2', targetId: 'n6' },
        { id: 'e4', sourceId: 'n3', targetId: 'n6' },
        { id: 'e5', sourceId: 'n6', targetId: 'n7' }
      ]
    }
  },
  {
    id: 'p10',
    name: 'Complex Dashboard',
    description: 'Multiple indicators and controls simulating a dashboard.',
    difficulty: 'Advanced',
    category: 'Complex',
    components: ['Battery', '3x Switch', '3x LED', '3x Resistor', 'Ground'],
    learningObjectives: ['Complex routing', 'System integration'],
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '12V', x: 50, y: 300, value: '12V' },
        { id: 'n2', type: 'switch', label: 'Master', x: 200, y: 300, value: 'closed' },
        { id: 'n3', type: 'switch', label: 'Radio', x: 350, y: 150, value: 'open' },
        { id: 'n4', type: 'switch', label: 'Lights', x: 350, y: 300, value: 'open' },
        { id: 'n5', type: 'switch', label: 'Wipers', x: 350, y: 450, value: 'open' },
        { id: 'n6', type: 'resistor', label: 'R1', x: 500, y: 150, value: '330Ω' },
        { id: 'n7', type: 'resistor', label: 'R2', x: 500, y: 300, value: '330Ω' },
        { id: 'n8', type: 'resistor', label: 'R3', x: 500, y: 450, value: '330Ω' },
        { id: 'n9', type: 'led', label: 'Radio LED', x: 650, y: 150, value: 'Blue' },
        { id: 'n10', type: 'led', label: 'Light LED', x: 650, y: 300, value: 'Yellow' },
        { id: 'n11', type: 'led', label: 'Wiper LED', x: 650, y: 450, value: 'Green' },
        { id: 'n12', type: 'ground', label: 'GND', x: 800, y: 300 }
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n2', targetId: 'n4' },
        { id: 'e4', sourceId: 'n2', targetId: 'n5' },
        { id: 'e5', sourceId: 'n3', targetId: 'n6' },
        { id: 'e6', sourceId: 'n4', targetId: 'n7' },
        { id: 'e7', sourceId: 'n5', targetId: 'n8' },
        { id: 'e8', sourceId: 'n6', targetId: 'n9' },
        { id: 'e9', sourceId: 'n7', targetId: 'n10' },
        { id: 'e10', sourceId: 'n8', targetId: 'n11' },
        { id: 'e11', sourceId: 'n9', targetId: 'n12' },
        { id: 'e12', sourceId: 'n10', targetId: 'n12' },
        { id: 'e13', sourceId: 'n11', targetId: 'n12' }
      ]
    }
  }
];

export const GUIDE_CONTENT: GuideChapter[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    sections: [
      {
        id: 'welcome',
        title: 'Welcome to CircuitMind',
        content: `
          <p class="mb-4">Welcome to CircuitMind AI! This platform helps you design, simulate, and understand electronic circuits.</p>
          <h4 class="text-cyan-400 font-bold mb-2">Quick Start:</h4>
          <ul class="list-disc pl-5 space-y-2 text-slate-300">
            <li><strong>Palette:</strong> Drag components from the left sidebar.</li>
            <li><strong>Wiring:</strong> Alt+Click a node to start a wire, then click another node to connect.</li>
            <li><strong>Simulation:</strong> Click the "Play" button to test your circuit.</li>
            <li><strong>AI Assistant:</strong> Use the AI panel to generate circuits from text!</li>
          </ul>
        `
      },
      {
        id: 'interface',
        title: 'The Interface',
        content: `
          <p class="mb-4">The workspace is divided into three main areas:</p>
          <ul class="list-disc pl-5 space-y-2 text-slate-300">
            <li><strong>Canvas:</strong> The grid where you place components.</li>
            <li><strong>Toolbar:</strong> Controls for simulation, saving, and clearing.</li>
            <li><strong>Component Palette:</strong> Your toolbox of electronic parts.</li>
          </ul>
          <p class="mt-4 text-sm italic text-slate-400">Tip: You can use Shift+Click to delete components.</p>
        `
      }
    ]
  },
  {
    id: 'components',
    title: 'Components 101',
    sections: [
      {
        id: 'battery',
        title: 'Power Sources',
        content: `
          <p class="mb-2">Every circuit needs a power source to push electrons through the wires.</p>
          <p class="mb-4">In CircuitMind, we use a <strong>9V Battery</strong> or <strong>5V Source</strong>.</p>
          <div class="bg-slate-800 p-3 rounded border border-slate-700 my-2">
            <strong>Symbol:</strong> 🔋<br/>
            <strong>Function:</strong> Provides Voltage (V)<br/>
            <strong>Analogy:</strong> Like a water pump in a plumbing system.
          </div>
        `
      },
      {
        id: 'resistor',
        title: 'Resistors',
        content: `
          <p class="mb-2">Resistors limit the flow of current. Without them, sensitive components like LEDs might burn out!</p>
          <div class="bg-slate-800 p-3 rounded border border-slate-700 my-2">
            <strong>Symbol:</strong> 📦 (Zigzag line)<br/>
            <strong>Unit:</strong> Ohms (Ω)<br/>
            <strong>Rule:</strong> Higher resistance = Less current.
          </div>
          <p class="text-sm text-slate-400">Always use a resistor in series with an LED.</p>
        `
      },
      {
        id: 'led',
        title: 'LEDs',
        content: `
          <p class="mb-2">Light Emitting Diodes (LEDs) convert electricity into light.</p>
          <p class="mb-2"><strong>Polarity Matters!</strong> Current only flows one way through an LED (Anode to Cathode).</p>
          <p class="text-slate-300">If your LED doesn't light up, check if it has a path to Ground and a path to the Battery.</p>
        `
      }
    ]
  },
  {
    id: 'theory',
    title: 'Circuit Theory',
    sections: [
      {
        id: 'flow',
        title: 'Current Flow',
        content: `
          <p class="mb-4">Current is the flow of electric charge. In our simulator, we visualize conventional current flowing from <strong>Positive (+)</strong> to <strong>Negative/Ground (-)</strong>.</p>
          <p>For a circuit to work, there must be a complete loop from the battery, through components, and back to ground.</p>
        `
      },
      {
        id: 'series-parallel',
        title: 'Series vs Parallel',
        content: `
          <h4 class="text-cyan-400 font-bold mb-2">Series</h4>
          <p class="mb-2">Components are lined up one after another. Current flows through all of them. If one breaks, the whole circuit stops.</p>
          
          <h4 class="text-cyan-400 font-bold mb-2 mt-4">Parallel</h4>
          <p>Components are side-by-side. Current splits into different paths. If one branch breaks, the others still work.</p>
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    sections: [
      {
        id: 'common-issues',
        title: 'Common Mistakes',
        content: `
          <ul class="list-disc pl-5 space-y-3 text-slate-300">
            <li><strong>No Ground:</strong> Did you forget to add a Ground component? The current needs somewhere to go.</li>
            <li><strong>Open Switch:</strong> Is a switch turned off (open)? Click it to close the circuit.</li>
            <li><strong>Broken Wires:</strong> Ensure wires visually connect the center of one component to another.</li>
          </ul>
        `
      }
    ]
  }
];
