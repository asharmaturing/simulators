
import React, { useState, useEffect, useContext, createContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Circuit, CircuitData, Interaction } from './types';
import { MOCK_CIRCUITS, CURRENT_USER, MOCK_INTERACTIONS } from './services/mockData';
import { runSimulation } from './services/simulator';
import CircuitVisualizer from './components/CircuitVisualizer';
import AIPanel from './components/AIPanel';
import PresetLibrary from './components/PresetLibrary';
import GuidePanel from './components/GuidePanel';
import CollaborationPanel from './components/CollaborationPanel';
import { useCollaboration } from './services/socketService';
import { 
  LayoutDashboard, 
  Cpu, 
  BarChart3, 
  Settings, 
  Plus, 
  Search, 
  LogOut, 
  Menu,
  Sparkles,
  Share2,
  Save,
  Play,
  Square,
  RotateCcw,
  Battery,
  Zap,
  Box,
  Component,
  Circle,
  ToggleLeft,
  Trash,
  BookOpen,
  GraduationCap,
  X,
  Sun,
  Moon,
  Users,
  Signal,
  Triangle,
  ArrowRightLeft,
  Repeat
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// --- Theme Context ---
type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: 'dark', toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

// --- Sidebar Navigation ---
const Sidebar = ({ onOpenPresets, onOpenGuide }: { onOpenPresets: () => void, onOpenGuide: () => void }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen hidden md:flex z-50 transition-colors duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg">
          <Cpu className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">CircuitMind</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="mb-6">
          <p className="px-4 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase mb-2 tracking-wider">Platform</p>
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/') ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/editor" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/editor') ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
            <Cpu size={20} />
            <span>Editor</span>
          </Link>
          <Link to="/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/analytics') ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
            <BarChart3 size={20} />
            <span>Analytics</span>
          </Link>
        </div>

        <div>
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider">Learning Center</p>
          <button 
            onClick={onOpenPresets}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-left"
          >
            <BookOpen size={20} />
            <span>Circuit Library</span>
          </button>
          <button 
            onClick={onOpenGuide}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-left"
          >
            <GraduationCap size={20} />
            <span>Interactive Guide</span>
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
         <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
         >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm font-medium">Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
         </button>

        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
            AE
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{CURRENT_USER.username}</p>
            <p className="text-xs text-slate-500 truncate">{CURRENT_USER.email}</p>
          </div>
        </div>
        <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors">
          <LogOut size={18} />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {CURRENT_USER.username}</h1>
        <p className="text-slate-500 dark:text-slate-400">Here's what you've been working on recently.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase mb-2">Total Circuits</h3>
          <p className="text-4xl font-bold text-slate-900 dark:text-white">{MOCK_CIRCUITS.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase mb-2">Components Used</h3>
          <p className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
             {MOCK_CIRCUITS.reduce((acc, c) => acc + c.circuit_data.nodes.length, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase mb-2">Simulations Run</h3>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400">
            {MOCK_INTERACTIONS.filter(i => i.action_type === 'simulate').length}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Recent Circuits</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MOCK_CIRCUITS.map(circuit => (
           <Link to="/editor" key={circuit.id} className="block group">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-900/10 dark:hover:shadow-cyan-900/10 shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{circuit.name}</h3>
                       <p className="text-sm text-slate-500 dark:text-slate-400">{circuit.description}</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500 dark:text-slate-400">
                       <Cpu size={20} />
                    </div>
                 </div>
                 <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Updated {new Date(circuit.updated_at).toLocaleDateString()}</span>
                    <span>{circuit.circuit_data.nodes.length} Components</span>
                 </div>
              </div>
           </Link>
        ))}
        <Link to="/editor" className="block group">
            <div className="h-full bg-slate-100/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center hover:border-cyan-500/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer min-h-[160px]">
                <div className="bg-cyan-100 dark:bg-cyan-900/20 p-3 rounded-full text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                </div>
                <span className="font-medium text-slate-600 dark:text-slate-300">Create New Circuit</span>
            </div>
        </Link>
      </div>
    </div>
  );
};

// Analytics Component
const Analytics = () => {
  const { theme } = useTheme();
  const data = [
    { name: 'Mon', value: 4 },
    { name: 'Tue', value: 3 },
    { name: 'Wed', value: 7 },
    { name: 'Thu', value: 2 },
    { name: 'Fri', value: 6 },
    { name: 'Sat', value: 8 },
    { name: 'Sun', value: 5 },
  ];

  const chartColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#e2e8f0';
  const tooltipText = theme === 'dark' ? '#f8fafc' : '#0f172a';

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400">Insights into your circuit building habits.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 mb-8 h-80 shadow-sm">
        <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-white">Activity Overview</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                itemStyle={{ color: '#0891b2' }}
            />
            <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Editor Component
const Editor = ({ data, onUpdate, onOpenGuide }: { data: CircuitData, onUpdate: (d: CircuitData) => void, onOpenGuide: () => void }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [poweredNodes, setPoweredNodes] = useState<Set<string>>(new Set());
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isCollabPanelOpen, setIsCollabPanelOpen] = useState(false);
  const { theme } = useTheme();
  
  // Collaboration Hook
  const { collaborators, messages, sendMessage, sendCursorMove, isConnected } = useCollaboration('c1', CURRENT_USER.username, true);
  
  useEffect(() => {
    if (isSimulating) {
      const active = runSimulation(data);
      setPoweredNodes(active);
    } else {
      setPoweredNodes(new Set());
    }
  }, [isSimulating, data]);

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('componentType', type);
  };

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
       {/* Components Palette */}
      <div className="w-full md:w-20 lg:w-24 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-row md:flex-col items-center py-4 gap-4 z-20 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden shrink-0 shadow-sm">
        {[
            { type: 'source', icon: Battery, label: 'Battery' },
            { type: 'resistor', icon: Box, label: 'Resistor' },
            { type: 'led', icon: Zap, label: 'LED' },
            { type: 'switch', icon: ToggleLeft, label: 'Switch' },
            { type: 'capacitor', icon: Component, label: 'Capacitor' },
            { type: 'ground', icon: Circle, label: 'Ground' },
            { type: 'transistor', icon: Triangle, label: 'NPN' },
            { type: 'gate_and', icon: Cpu, label: 'AND' },
            // New Amplifiers
            { type: 'amplifier_half_duplex', icon: ArrowRightLeft, label: 'Half Duplex' },
            { type: 'amplifier_full_duplex', icon: Repeat, label: 'Full Duplex' },
        ].map((item) => (
            <div 
                key={item.type}
                draggable 
                onDragStart={(e) => handleDragStart(e, item.type)}
                className="flex flex-col items-center gap-1 group cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[60px]"
            >
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors border border-slate-200 dark:border-slate-700 group-hover:border-cyan-500 dark:group-hover:border-cyan-700">
                    <item.icon size={24} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white font-medium text-center leading-tight">{item.label}</span>
            </div>
        ))}
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Toolbar */}
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-700 dark:text-slate-200 mr-4 hidden sm:block">Untitled Circuit</h2>
            <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium transition-all ${
                    isSimulating 
                    ? 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/50 hover:bg-red-500/20' 
                    : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/50 hover:bg-green-500/20'
                }`}
            >
                {isSimulating ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {isSimulating ? 'Stop' : 'Simulate'}
            </button>
            <button 
              onClick={() => {
                  setIsSimulating(false);
                  onUpdate({ nodes: [], connections: [] });
              }}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Clear Canvas"
            >
               <RotateCcw size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsCollabPanelOpen(!isCollabPanelOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all ${
                    isCollabPanelOpen 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700' 
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Users size={16} />
                <span className="hidden sm:inline">Collab</span>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
             </button>
             <button 
                onClick={onOpenGuide}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-700 text-sm transition-colors"
              >
                <GraduationCap size={16} />
                <span className="hidden sm:inline">Guide</span>
             </button>
             <button 
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all ${
                    isAIPanelOpen 
                    ? 'bg-cyan-600 text-white border-cyan-500' 
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Sparkles size={16} />
                <span className="hidden sm:inline">AI Assist</span>
             </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <CircuitVisualizer 
                data={data}
                isSimulating={isSimulating}
                poweredNodes={poweredNodes}
                onUpdate={onUpdate}
                theme={theme}
                collaborators={collaborators}
                onCursorMove={sendCursorMove}
            />
            
            <CollaborationPanel 
                isOpen={isCollabPanelOpen}
                onClose={() => setIsCollabPanelOpen(false)}
                collaborators={collaborators}
                messages={messages}
                onSendMessage={sendMessage}
                currentUser={CURRENT_USER.username}
            />

            <AIPanel 
                isOpen={isAIPanelOpen}
                onClose={() => setIsAIPanelOpen(false)}
                onCircuitGenerated={(newData) => {
                    onUpdate(newData);
                }}
                currentCircuit={data}
            />
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [circuitData, setCircuitData] = useState<CircuitData>(MOCK_CIRCUITS[0].circuit_data);
  const [isPresetLibraryOpen, setIsPresetLibraryOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Theme Management
  const [theme, setTheme] = useState<Theme>(() => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          return 'light';
      }
      return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <HashRouter>
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
            <Sidebar 
                onOpenPresets={() => setIsPresetLibraryOpen(true)} 
                onOpenGuide={() => setIsGuideOpen(true)}
            />
            
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route 
                    path="/editor" 
                    element={
                        <Editor 
                            data={circuitData} 
                            onUpdate={setCircuitData}
                            onOpenGuide={() => setIsGuideOpen(true)}
                        />
                    } 
                />
                <Route path="/analytics" element={<Analytics />} />
            </Routes>
            </main>

            {isPresetLibraryOpen && (
                <PresetLibrary 
                    onClose={() => setIsPresetLibraryOpen(false)}
                    onLoad={(data) => {
                        setCircuitData(data);
                    }}
                />
            )}

            <GuidePanel 
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
            />
        </div>
        </HashRouter>
    </ThemeContext.Provider>
  );
};

export default App;