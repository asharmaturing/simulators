import { User, Circuit, Interaction } from '../types';

export const CURRENT_USER: User = {
  id: 'u1',
  username: 'alex_engineer',
  email: 'alex@circuitmind.ai',
  created_at: '2023-01-15T10:00:00Z',
};

export const MOCK_CIRCUITS: Circuit[] = [
  {
    id: 'c1',
    user_id: 'u1',
    name: 'Basic LED Driver',
    description: 'A simple current limiting circuit for a red LED.',
    is_public: true,
    created_at: '2023-10-01T12:00:00Z',
    updated_at: '2023-10-05T14:30:00Z',
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'source', label: '9V Battery', x: 100, y: 200, value: '9V' },
        { id: 'n2', type: 'resistor', label: 'R1', x: 300, y: 200, value: '330Ω' },
        { id: 'n3', type: 'led', label: 'LED1', x: 500, y: 200, value: 'Red' },
        { id: 'n4', type: 'ground', label: 'GND', x: 700, y: 200 },
      ],
      connections: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n4' },
      ],
    },
  },
  {
    id: 'c2',
    user_id: 'u1',
    name: '555 Timer Astable',
    description: 'Standard configuration for a 1Hz clock pulse.',
    is_public: false,
    created_at: '2023-11-12T09:15:00Z',
    updated_at: '2023-11-12T16:45:00Z',
    circuit_data: {
      nodes: [
        { id: 'n1', type: 'ic', label: '555 Timer', x: 400, y: 300 },
        { id: 'n2', type: 'source', label: 'VCC', x: 400, y: 100, value: '5V' },
        { id: 'n3', type: 'capacitor', label: 'C1', x: 250, y: 400, value: '10uF' },
        { id: 'n4', type: 'resistor', label: 'R1', x: 250, y: 200, value: '1kΩ' },
        { id: 'n5', type: 'ground', label: 'GND', x: 400, y: 500 },
      ],
      connections: [
        { id: 'e1', sourceId: 'n2', targetId: 'n1' },
        { id: 'e2', sourceId: 'n1', targetId: 'n5' },
        { id: 'e3', sourceId: 'n4', targetId: 'n1' },
      ],
    },
  },
];

export const MOCK_INTERACTIONS: Interaction[] = [
  { id: 'i1', user_id: 'u1', circuit_id: 'c1', action_type: 'view', timestamp: '2023-10-02T10:00:00Z', metadata: {} },
  { id: 'i2', user_id: 'u1', circuit_id: 'c1', action_type: 'simulate', timestamp: '2023-10-02T10:05:00Z', metadata: { duration: 5000 } },
  { id: 'i3', user_id: 'u1', circuit_id: 'c2', action_type: 'edit', timestamp: '2023-11-12T11:00:00Z', metadata: { changes: 5 } },
  { id: 'i4', user_id: 'u1', circuit_id: 'c2', action_type: 'ai_generate', timestamp: '2023-11-12T09:15:00Z', metadata: { prompt: "Create a 555 timer circuit" } },
];
