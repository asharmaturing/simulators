
import React, { useState, useEffect, useContext, createContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Circuit, CircuitData, Interaction, SimulationResult } from './types';
import { MOCK_CIRCUITS, CURRENT_USER, MOCK_INTERACTIONS } from './services/mockData';
import { runAdvancedSimulation } from './services/simulator';
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
  Repeat,
  ChevronDown,
  ChevronRight
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
  
  const linkClass = (active: boolean) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
      active 
        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/20' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen hidden md:flex z-50 transition-colors duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg">
          <Cpu className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">CircuitMind</span>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="mb-8">
          <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 tracking-wider">Platform</p>
          <div className="space-y-1">
            <Link to="/" className={linkClass(isActive('/'))}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link to="/editor" className={linkClass(isActive('/editor'))}>
              <Cpu size={20} />
              <span>Editor</span>
            </Link>
            <Link to="/analytics" className={linkClass(isActive('/analytics'))}>
              <BarChart3 size={20} />
              <span>Analytics</span>
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 tracking-wider">Learning Center</p>
          <div className="space-y-1">
            <button 
              onClick={onOpenPresets}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-left font-medium"
            >
              <BookOpen size={20} />
              <span>Circuit Library</span>
            </button>
            <button 
              onClick={onOpenGuide}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-left font-medium"
            >
              <GraduationCap size={20} />
              <span>Interactive Guide</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-950/30">
         <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all shadow-sm"
         >
            <span className="text-sm font-medium flex items-center gap-2">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
         </button>

        <div className="flex items-center gap-3 mt-4 px-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
            AE
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{CURRENT_USER.username}</p>
            <p className="text-xs text-slate-500 truncate">{CURRENT_USER.email}</p>
          </div>
          <button className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
          </button>
        </div>
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

// Component Group Definition
const COMPONENT_GROUPS = [
    {
        title: 'Essentials',
        items: [
            { type: 'source', icon: Battery, label: 'Battery' },
            { type: 'ground', icon: Circle, label: 'Ground' },
            { type: 'switch', icon: ToggleLeft, label: 'Switch' },
        ]
    },
    {
        title: 'Passives',
        items: [
            { type: 'resistor', icon: Box, label: 'Resistor' },
            { type: 'capacitor', icon: Component, label: 'Capacitor' },
        ]
    },
    {
        title: 'Active',
        items: [
            { type: 'led', icon: Zap, label: 'LED' },
            { type: 'transistor', icon: Triangle, label: 'NPN Transistor' },
        ]
    },
    {
        title: 'Logic & Amp',
        items: [
            { type: 'gate_and', icon: Cpu, label: 'AND Gate' },
            { type: 'amplifier_half_duplex', icon: ArrowRightLeft, label: 'Half Duplex' },
            { type: 'amplifier_full_duplex', icon: Repeat, label: 'Full Duplex' },
        ]
    }
];

// Editor Component
const Editor = ({ data, onUpdate, onOpenGuide }: { data: CircuitData, onUpdate: (d: CircuitData) => void, onOpenGuide: () => void }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isCollabPanelOpen, setIsCollabPanelOpen] = useState(false);
  const { theme } = useTheme();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Collaboration Hook
  const { collaborators, messages, sendMessage, sendCursorMove, isConnected } = useCollaboration('c1', CURRENT_USER.username, true);
  
  useEffect(() => {
    if (isSimulating) {
      const result = runAdvancedSimulation(data);
      setSimulationResult(result);
    } else {
      setSimulationResult(null);
    }
  }, [isSimulating, data]);

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('componentType', type);
  };

  const toggleGroup = (title: string) => {
      setCollapsedGroups(prev => ({...prev, [title]: !prev[title]}));
  };

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
       {/* Components Palette */}
      <div className="w-full md:w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 shrink-0 shadow-lg transition-all">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Component size={18} className="text-cyan-600" /> Components
            </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
            {COMPONENT_GROUPS.map((group) => (
                <div key={group.title} className="mb-2">
                    <button 
                        onClick={() => toggleGroup(group.title)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors mb-1"
                    >
                        {group.title}
                        {collapsedGroups[group.title] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {!collapsedGroups[group.title] && (
                        <div className="grid grid-cols-2 gap-2 px-1">
                            {group.items.map((item) => (
                                <div 
                                    key={item.type}
                                    draggable 
                                    onDragStart={(e) => handleDragStart(e, item.type)}
                                    className="flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-600 hover:shadow-md hover:bg-white dark:hover:bg-slate-800 transition-all group"
                                >
                                    <div className="text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                        <item.icon size={24} />
                                    </div>
                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium text-center leading-tight w-full truncate">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <h2 className="font-bold text-slate-800 dark:text-white leading-tight">Untitled Circuit</h2>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Draft • Last edited just now</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-sm transition-all active:scale-95 ${
                    isSimulating 
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                    : 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/20'
                }`}
            >
                {isSimulating ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {isSimulating ? 'Stop Simulation' : 'Simulate Circuit'}
            </button>
            <button 
              onClick={() => {
                  setIsSimulating(false);
                  onUpdate({ nodes: [], connections: [] });
              }}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Clear Canvas"
            >
               <RotateCcw size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsCollabPanelOpen(!isCollabPanelOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isCollabPanelOpen 
                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className="relative">
                    <Users size={18} />
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-800"></span>
                </div>
                <span>Collaborate</span>
             </button>
             <button 
                onClick={onOpenGuide}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium transition-colors"
              >
                <GraduationCap size={18} />
                <span>Guide</span>
             </button>
             <button 
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all shadow-sm ${
                    isAIPanelOpen 
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-cyan-900/20' 
                    : 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-500'
                }`}
              >
                <Sparkles size={18} />
                <span>AI Assistant</span>
             </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <CircuitVisualizer 
                data={data}
                isSimulating={isSimulating}
                simulationResult={simulationResult}
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
