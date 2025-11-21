
// Matching SQL: users
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

// Circuit Node structure for JSON data
export interface CircuitNode {
  id: string;
  type: 'source' | 'resistor' | 'capacitor' | 'inductor' | 'led' | 'transistor' | 'ic' | 'ground' | 'switch';
  label: string;
  x: number;
  y: number;
  value?: string; // e.g., "10k", "5V", "open", "closed"
}

// Circuit Connection structure for JSON data
export interface CircuitConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

// The JSON structure stored in circuit_data
export interface CircuitData {
  nodes: CircuitNode[];
  connections: CircuitConnection[];
}

// Matching SQL: circuits
export interface Circuit {
  id: string;
  user_id: string;
  name: string;
  description: string;
  circuit_data: CircuitData;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

// Matching SQL: interactions
export interface Interaction {
  id: string;
  user_id: string;
  circuit_id: string;
  action_type: 'view' | 'edit' | 'fork' | 'simulate' | 'ai_generate';
  timestamp: string;
  metadata: Record<string, any>;
}

// Phase 2: Learning & Presets
export interface PresetCircuit {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  components: string[];
  circuit_data: CircuitData;
  learningObjectives: string[];
}

export interface GuideSection {
  id: string;
  title: string;
  content: string;
}

export interface GuideChapter {
  id: string;
  title: string;
  sections: GuideSection[];
}
