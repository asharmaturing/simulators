
import React, { useState, useEffect, useContext, createContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { CircuitData, SimulationResult } from './types';
import { MOCK_CIRCUITS, CURRENT_USER } from './services/mockData';
import { runAdvancedSimulation } from './services/simulator';
import CircuitVisualizer from './components/CircuitVisualizer';
import AIPanel from './components/AIPanel';
import PresetLibrary from './components/PresetLibrary';
import GuidePanel from './components/GuidePanel';
import CollaborationPanel from './components/CollaborationPanel';
import { useCollaboration } from './services/socketService';
import { 
  LayoutDashboard, Cpu, BarChart3, Menu, Sparkles, Play, Square, RotateCcw,
  Sun, Moon, Users, Plus, Search, LogOut, BookOpen, GraduationCap,
  ChevronRight, ChevronDown, X, PanelLeftClose, PanelLeftOpen,
  Zap, Battery, Circle, ToggleLeft, Box, Component, Triangle, ArrowRightLeft, Repeat
} from 'lucide-react';

// --- Theme Context ---
type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// --- Standard Schematic Icons (Consistent with Visualizer) ---
const SchematicIcon = ({ type, className }: { type: string, className?: string }) => {
    const props = {
        width: 24, height: 24, viewBox: "0 0 24 24",
        fill: "none", stroke: "currentColor", strokeWidth: 2,
        strokeLinecap: "round" as "round", strokeLinejoin: "round" as "round",
        className: className
    };

    switch (type) {
        case 'source':
            return <svg {...props}><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="6" y1="5" x2="6" y2="19" /><line x1="10" y1="8" x2="10" y2="16" /><line x1="14" y1="5" x2="14" y2="19" /><line x1="18" y1="8" x2="18" y2="16" /></svg>;
        case 'ground':
            return <svg {...props}><line x1="12" y1="2" x2="12" y2="12" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="7" y1="16" x2="17" y2="16" /><line x1="10" y1="20" x2="14" y2="20" /></svg>;
        case 'resistor':
            return <svg {...props}><path d="M2 12 H6 L8 7 L12 17 L16 7 L18 12 H22" /></svg>;
        case 'capacitor':
            return <svg {...props}><line x1="2" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="22" y2="12" /><line x1="9" y1="5" x2="9" y2="19" /><line x1="15" y1="5" x2="15" y2="19" /></svg>;
        case 'led':
            return <svg {...props}><line x1="2" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="22" y2="12" /><path d="M7 7 L17 12 L7 17 V7 Z" fill="currentColor" fillOpacity="0.1" /><line x1="17" y1="7" x2="17" y2="17" /><path d="M15 5 L18 2" /><path d="M18 2 L16 2" /><path d="M18 2 L18 4" /><path d="M18 8 L21 5" /></svg>;
        case 'switch':
            return <svg {...props}><circle cx="3" cy="12" r="2" /><circle cx="21" cy="12" r="2" /><line x1="3" y1="12" x2="18" y2="4" /></svg>;
        case 'transistor':
        case 'transistor_npn':
            return <svg {...props}><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><line x1="2" y1="12" x2="8" y2="12" /><line x1="8" y1="6" x2="8" y2="18" strokeWidth={2.5} /><line x1="8" y1="10" x2="16" y2="4" /><line x1="8" y1="14" x2="16" y2="20" /><path d="M16 20 L13 19.5" /><path d="M16 20 L14 17.5" /></svg>;
        case 'gate_and':
            return <svg {...props}><path d="M4 5 H 10 C 16 5, 18 8, 18 12 C 18 16, 16 19, 10 19 H 4 V 5 Z" /><line x1="2" y1="8" x2="4" y2="8" /><line x1="2" y1="16" x2="4" y2="16" /><line x1="18" y1="12" x2="22" y2="12" /></svg>;
        case 'gate_or':
            return <svg {...props}><path d="M4 5 C 4 5, 8 8, 8 12 C 8 16, 4 19, 4 19 C 10 19, 18 19, 20 12 C 18 5, 10 5, 4 5 Z" /><line x1="2" y1="8" x2="5" y2="8" /><line x1="2" y1="16" x2="5" y2="16" /><line x1="20" y1="12" x2="22" y2="12" /></svg>;
        case 'gate_not':
            return <svg {...props}><path d="M4 5 L16 12 L4 19 V5 Z" /><circle cx="19" cy="12" r="2.5" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="21.5" y1="12" x2="23" y2="12" /></svg>;
        default:
            return <Component {...props} />;
    }
};

const COMPONENT_GROUPS = [
    {
        title: 'Essentials',
        items: [
            { type: 'source', label: 'Battery 9V' },
            { type: 'ground', label: 'Ground' },
            { type: 'switch', label: 'Switch' },
        ]
    },
    {
        title: 'Passives',
        items: [
            { type: 'resistor', label: 'Resistor' },
            { type: 'capacitor', label: 'Capacitor' },
            { type: 'inductor', label: 'Inductor' },
        ]
    },
    {
        title: 'Active',
        items: [
            { type: 'led', label: 'LED' },
            { type: 'transistor', label: 'NPN Transistor' },
        ]
    },
    {
        title: 'Logic',
        items: [
            { type: 'gate_and', label: 'AND Gate' },
            { type: 'gate_or', label: 'OR Gate' },
            { type: 'gate_not', label: 'NOT Gate' },
        ]
    }
];

// --- Sidebar (Responsive) ---
const Sidebar = ({ isOpen, onClose, onOpenPresets, onOpenGuide }: { isOpen: boolean, onClose: () => void, onOpenPresets: () => void, onOpenGuide: () => void }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isActive = (path: string) => location.pathname === path;
  
  const linkClass = (active: boolean) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium border-l-4 ${
      active 
        ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-600' 
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}
      
      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transform transition-transform duration-300 md:translate-x-0 md:static md:flex md:flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-cyan-600 p-1.5 rounded-lg">
                <Cpu className="text-white" size={20} />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">CircuitMind</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-500"><X size={20} /></button>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto space-y-6">
          <div>
            <p className="px-4 text-xs font-bold text-slate-400 mb-2 uppercase">Menu</p>
            <Link to="/" className={linkClass(isActive('/'))} onClick={onClose}><LayoutDashboard size={18} /> Dashboard</Link>
            <Link to="/editor" className={linkClass(isActive('/editor'))} onClick={onClose}><Zap size={18} /> Editor</Link>
            <Link to="/analytics" className={linkClass(isActive('/analytics'))} onClick={onClose}><BarChart3 size={18} /> Analytics</Link>
          </div>

          <div>
            <p className="px-4 text-xs font-bold text-slate-400 mb-2 uppercase">Learn</p>
            <button onClick={() => { onOpenPresets(); onClose(); }} className={linkClass(false)}><BookOpen size={18} /> Library</button>
            <button onClick={() => { onOpenGuide(); onClose(); }} className={linkClass(false)}><GraduationCap size={18} /> Guide</button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
           <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-4 py-2 mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
           </button>
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {CURRENT_USER.username.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{CURRENT_USER.username}</p>
              </div>
              <LogOut size={16} className="text-slate-400 cursor-pointer hover:text-red-500" />
           </div>
        </div>
      </div>
    </>
  );
};

// --- Editor ---
const Editor = ({ data, onUpdate, onOpenGuide }: { data: CircuitData, onUpdate: (d: CircuitData) => void, onOpenGuide: () => void }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true); // Default open on desktop
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Panels
  const [showAi, setShowAi] = useState(false);
  const [showCollab, setShowCollab] = useState(false);

  const { theme } = useTheme();
  const { collaborators, messages, sendMessage, sendCursorMove } = useCollaboration('c1', CURRENT_USER.username, true);
  
  // Logic for simulation
  useEffect(() => {
    if (isSimulating) setSimulationResult(runAdvancedSimulation(data));
    else setSimulationResult(null);
  }, [isSimulating, data]);

  // Responsive Init
  useEffect(() => {
      if (window.innerWidth < 768) setIsPaletteOpen(false);
  }, []);

  const toggleGroup = (title: string) => setCollapsedGroups(prev => ({...prev, [title]: !prev[title]}));

  const filteredGroups = COMPONENT_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
  })).filter(group => group.items.length > 0);

  return (
    <div className="flex h-full relative overflow-hidden">
       {/* Component Palette (Responsive) */}
       <div className={`absolute md:relative z-30 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-xl md:shadow-none flex flex-col ${isPaletteOpen ? 'translate-x-0 w-64' : '-translate-x-full md:w-0 md:hidden'}`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Box size={18} /> Components</h3>
              <button onClick={() => setIsPaletteOpen(false)} className="md:hidden text-slate-500"><X size={18}/></button>
          </div>
          
          <div className="p-2">
             <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
             {filteredGroups.map(group => (
                 <div key={group.title} className="mb-2">
                     <button onClick={() => toggleGroup(group.title)} className="w-full flex items-center justify-between px-2 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                         {group.title}
                         {collapsedGroups[group.title] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                     </button>
                     {!collapsedGroups[group.title] && (
                         <div className="grid grid-cols-2 gap-2 mt-1 px-1">
                             {group.items.map(item => (
                                 <div 
                                    key={item.type} 
                                    draggable 
                                    onDragStart={(e) => e.dataTransfer.setData('componentType', item.type)}
                                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                                 >
                                     <div className="text-slate-600 dark:text-slate-400 group-hover:text-cyan-500">
                                         <SchematicIcon type={item.type} />
                                     </div>
                                     <span className="text-[10px] font-medium text-center text-slate-700 dark:text-slate-300">{item.label}</span>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             ))}
          </div>
       </div>

       {/* Main Workspace */}
       <div className="flex-1 flex flex-col relative min-w-0">
          {/* Toolbar */}
          <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm z-20">
              <div className="flex items-center gap-2">
                  <button onClick={() => setIsPaletteOpen(!isPaletteOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                      {isPaletteOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                  </button>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                  <h2 className="font-bold text-slate-800 dark:text-white hidden md:block">New Project</h2>
              </div>

              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all shadow-sm ${isSimulating ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                      {isSimulating ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                      <span className="hidden md:inline">{isSimulating ? 'Stop' : 'Simulate'}</span>
                  </button>
                  <button onClick={() => {setIsSimulating(false); onUpdate({nodes: [], connections: []})}} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Clear"><RotateCcw size={18}/></button>
                  
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                  
                  <button onClick={() => setShowAi(!showAi)} className={`p-2 rounded-lg transition-colors ${showAi ? 'bg-cyan-100 text-cyan-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Sparkles size={18}/></button>
                  <button onClick={() => setShowCollab(!showCollab)} className={`p-2 rounded-lg transition-colors ${showCollab ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Users size={18}/></button>
              </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden">
              <CircuitVisualizer 
                  data={data}
                  isSimulating={isSimulating}
                  simulationResult={simulationResult}
                  onUpdate={onUpdate}
                  theme={theme}
                  collaborators={collaborators}
                  onCursorMove={sendCursorMove}
              />
              
              {/* Floating Action Button for Mobile Palette if closed */}
              {!isPaletteOpen && (
                  <button 
                    onClick={() => setIsPaletteOpen(true)}
                    className="md:hidden absolute bottom-6 left-6 w-12 h-12 bg-cyan-600 rounded-full shadow-xl flex items-center justify-center text-white z-30"
                  >
                      <Plus size={24} />
                  </button>
              )}
          </div>

          <CollaborationPanel 
             isOpen={showCollab} 
             onClose={() => setShowCollab(false)} 
             collaborators={collaborators} 
             messages={messages}
             onSendMessage={sendMessage}
             currentUser={CURRENT_USER.username}
          />
          
          <AIPanel 
             isOpen={showAi}
             onClose={() => setShowAi(false)}
             onCircuitGenerated={onUpdate}
             currentCircuit={data}
          />
       </div>
    </div>
  );
};

// --- Main App Structure ---
const App = () => {
  const [circuitData, setCircuitData] = useState<CircuitData>(MOCK_CIRCUITS[0].circuit_data);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPresetLibraryOpen, setIsPresetLibraryOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => 
     (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>
        <HashRouter>
            <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden font-sans">
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)}
                    onOpenPresets={() => setIsPresetLibraryOpen(true)}
                    onOpenGuide={() => setIsGuideOpen(true)}
                />
                
                <main className="flex-1 flex flex-col h-full relative min-w-0">
                    {/* Mobile Header (only visible on mobile) */}
                    <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 shrink-0 justify-between">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold">CircuitMind</span>
                        <div className="w-6"></div> {/* Spacer */}
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <Routes>
                            <Route path="/" element={<div className="p-8">Dashboard Placeholder</div>} />
                            <Route path="/editor" element={<Editor data={circuitData} onUpdate={setCircuitData} onOpenGuide={() => setIsGuideOpen(true)} />} />
                            <Route path="/analytics" element={<div className="p-8">Analytics Placeholder</div>} />
                        </Routes>
                    </div>
                </main>

                {isPresetLibraryOpen && <PresetLibrary onClose={() => setIsPresetLibraryOpen(false)} onLoad={setCircuitData} />}
                <GuidePanel isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            </div>
        </HashRouter>
    </ThemeContext.Provider>
  );
};

export default App;
