# CircuitMind AI ⚡️🤖

**CircuitMind AI** is an intelligent, next-generation circuit design platform that leverages **Google Gemini** to generate, analyze, and visualize electronic schematics from natural language descriptions.

Built for students, hobbyists, and engineers, it combines a powerful visual editor with AI assistance and real-time simulation.

## ✨ Key Features

- **AI-Powered Design**: Ask Gemini to "Design a 555 timer circuit" or "Create a voltage divider," and watch the schematic appear instantly.
- **Intelligent Analysis**: Get instant feedback on your circuit's functionality, potential issues, and theoretical explanations.
- **Real-Time Simulation**:
  - Visualizes voltage with dynamic wire coloring (Blue → Red).
  - Animates current flow.
  - Instantly detects failures (e.g., overheating components) with a Pass/Fail verdict system.
- **Interactive Editor**:
  - Drag-and-drop component palette.
  - Smart wiring with bezier curves.
  - Pan, zoom, and snap-to-grid support.
- **Collaboration**: Real-time multi-user editing with cursor tracking and chat (Socket.io).
- **Learning Resources**: Built-in interactive guide and preset library for beginners to advanced users.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API (`@google/genai`)
- **Icons**: Lucide React
- **Real-time**: Socket.io Client
- **Simulation Engine**: Custom TypeScript-based Modified Nodal Analysis (MNA) solver with Gaussian Elimination.

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Set up Environment Variables**
   Create a `.env` file or configure your environment with:
   ```bash
   API_KEY=your_google_gemini_api_key
   ```
4. **Run the development server**
   ```bash
   npm run dev
   ```

## 🧠 How Simulation Works

CircuitMind uses a custom linear DC simulator based on **Modified Nodal Analysis (MNA)**.
1. The circuit graph is converted into a system of linear equations (`Ax = B`).
2. It creates a matrix representing Conductance (G) and Voltage constraints.
3. It solves the matrix using **Gaussian Elimination** to determine node voltages and component currents.
4. Results are fed back into the Visualizer for real-time feedback (heat, light, logic levels).

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any new components, simulation models, or UI improvements.

---

*Powered by Google Gemini 2.5 Flash*
