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
  Zap, Battery, Circle, ToggleLeft, Box, Component, Triangle, ArrowRightLeft, Repeat,
  PenLine, Save, Activity, Waves, Settings, Download
} from 'lucide-react';

// --- Theme Context ---
type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// --- Standard Schematic Icons (2026 Pro Style) ---
const SchematicIcon = ({ type, className }: { type: string, className?: string }) => {
    const props = {
        width: 28, height: 28, viewBox: "0 0 24 24",
        fill: "none", stroke: "currentColor", strokeWidth: 1.5,
        strokeLinecap: "round" as "round", strokeLinejoin: "round" as "round",
        className: className
    };

    switch (type) {
        case 'source':
            return <svg {...props}><path d="M6 12H2" /><path d="M22 12H18" /><path d="M6 7V17" strokeWidth="2" /><path d="M10 10V14" /><path d="M14 7V17" strokeWidth="2" /><path d="M18 10V14" /></svg>;
        case 'ground':
            return <svg {...props}><path d="M12 2V12" /><path d="M4 12H20" /><path d="M7 16H17" /><path d="M10 20H14" /></svg>;
        case 'resistor':
            return <svg {...props}><path d="M2 12H6L8 6L12 18L16 6L18 12H22" /></svg>;
        case 'capacitor':
            return <svg {...props}><path d="M2 12H10" /><path d="M14 12H22" /><path d="M10 6V18" strokeWidth="2" /><path d="M14 6V18" strokeWidth="2" /></svg>;
        case 'inductor':
             return <svg {...props}><path d="M2 12H5C5 12 5 5 9 5C13 5 13 12 13 12C13 12 13 5 17 5C21 5 21 12 21 12H22" /></svg>;
        case 'led':
            return <svg {...props}><path d="M2 12H7" /><path d="M17 12H22" /><path d="M7 7L17 12L7 17V7Z" fill="currentColor" fillOpacity="0.2" /><path d="M17 7V17" /><path d="M15 5L18 2" /><path d="M18 2L16 2" /><path d="M18 2L18 4" /></svg>;
        case 'switch':
            return <svg {...props}><circle cx="3" cy="12" r="2" /><circle cx="21" cy="12" r="2" /><path d="M5 12L19 6" /></svg>;
        case 'transistor':
        case 'transistor_npn':
            return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M2 12H8" /><path d="M8 6V18" strokeWidth="2" /><path d="M8 10L16 4" /><path d="M8 14L16 20" /><path d="M16 20L13 19.5" /></svg>;
        case 'gate_and':
            return <svg {...props}><path d="M2 6H8C14 6 18 8.5 18 12C18 15.5 14 18 8 18H2V6Z" /><path d="M18 12H22" /></svg>;
        case 'gate_or':
            return <svg {...props}><path d="M2 6C2 6 7 8 7 12C7 16 2 18 2 18C8 18 16 18 18 12C16 6 8 6 2 6Z" /><path d="M18 12H22" /></svg>;
        case 'gate_not':
            return <svg {...props}><path d="M4 6L16 12L4 18V6Z" /><circle cx="19" cy="12" r="3" /><path d="M2 12H4" /><path d="M22 12H22" /></svg>;
        
        // Pro Icons
        case 'esp32':
            return <svg {...props}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 22V2" /><path d="M16 22V2" /><circle cx="12" cy="12" r="2" /></svg>;
        case 'oled_display':
            return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2" /><rect x="5" y="7" width="14" height="10" fill="currentColor" fillOpacity="0.1" /></svg>;
        case 'servo':
             return <svg {...props}><rect x="5" y="8" width="14" height="12" rx="2" /><path d="M12 8V4" /><path d="M9 4H15" /></svg>;
        case 'relay':
             return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M14 12H18" /><circle cx="7" cy="12" r="2" /></svg>;
        case 'bench_psu':
             return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="7" cy="12" r="2" /><circle cx="17" cy="12" r="2" /><path d="M12 8V16" /></svg>;
        
        default:
            return <Box {...props} />;
    }
};

const COMPONENT_GROUPS = [
    {
        title: 'Professional',
        pinned: true,
        items: [
            { type: 'esp32', label: 'ESP32 MCU' },
            { type: 'oled_display', label: 'OLED 128x64' },
            { type: 'servo', label: 'Servo Motor' },
            { type: 'relay', label: 'Relay Module' },
            { type: 'bench_psu', label: 'Bench Power' },
            { type: 'scope_probe', label: 'Scope Probe' },
            { type: 'func_gen', label: 'Func. Gen.' },
            { type: 'neopixel', label: 'NeoPixel' },
            { type: 'bme280', label: 'BME280 Env' },
            { type: 'ina219', label: 'Current Sens' },
        ]
    },
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
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
                <Cpu className="text-white" size={22} />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">CircuitMind</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-500"><X size={20} /></button>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto space-y-6">
          <div>
            <p className="px-4 text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Menu</p>
            <Link to="/" className={linkClass(isActive('/'))} onClick={onClose}><LayoutDashboard size={18} /> Dashboard</Link>
            <Link to="/editor" className={linkClass(isActive('/editor'))} onClick={onClose}><Zap size={18} /> Editor</Link>
            <Link to="/analytics" className={linkClass(isActive('/analytics'))} onClick={onClose}><BarChart3 size={18} /> Analytics</Link>
          </div>

          <div>
            <p className="px-4 text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Learn</p>
            <button onClick={() => { onOpenPresets(); onClose(); }} className={linkClass(false)}><BookOpen size={18} /> Library</button>
            <button onClick={() => { onOpenGuide(); onClose(); }} className={linkClass(false)}><GraduationCap size={18} /> Guide</button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
           <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-4 py-2 mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
           </button>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white dark:ring-slate-700 shadow-sm">
                  {CURRENT_USER.username.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{CURRENT_USER.username}</p>
                  <p className="text-xs text-slate-500 truncate">Free Plan</p>
              </div>
              <Settings size={18} className="text-slate-400 cursor-pointer hover:text-cyan-500" />
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
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [projectName, setProjectName] = useState('New Project');
  const [isEditingName, setIsEditingName] = useState(false);
  const [vizMode, setVizMode] = useState<'voltage' | 'current'>('voltage');
  
  // Panels
  const [showAi, setShowAi] = useState(false);
  const [showCollab, setShowCollab] = useState(false);

  const { theme } = useTheme();
  const { collaborators, messages, sendMessage, sendCursorMove } = useCollaboration('c1', CURRENT_USER.username, true);
  
  useEffect(() => {
    if (isSimulating) setSimulationResult(runAdvancedSimulation(data));
    else setSimulationResult(null);
  }, [isSimulating, data]);

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
       {/* Pro Component Palette */}
       <div className={`absolute md:relative z-30 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-2xl flex flex-col ${isPaletteOpen ? 'translate-x-0 w-72' : '-translate-x-full md:w-0 md:hidden'}`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider"><Box size={18} /> Components</h3>
              <button onClick={() => setIsPaletteOpen(false)} className="md:hidden text-slate-500"><X size={18}/></button>
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50">
             <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Search components..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-sm"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4">
             {filteredGroups.map(group => (
                 <div key={group.title} className={`rounded-xl overflow-hidden border ${group.pinned ? 'border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/10' : 'border-transparent'}`}>
                     {group.pinned && <div className="h-1 w-full bg-purple-500"></div>}
                     <button onClick={() => toggleGroup(group.title)} className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 rounded-t-lg ${group.pinned ? 'text-purple-700 dark:text-purple-300' : 'text-slate-500'}`}>
                         {group.title}
                         {collapsedGroups[group.title] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                     </button>
                     {!collapsedGroups[group.title] && (
                         <div className="grid grid-cols-2 gap-2 p-2">
                             {group.items.map(item => (
                                 <div 
                                    key={item.type} 
                                    draggable 
                                    onDragStart={(e) => e.dataTransfer.setData('componentType', item.type)}
                                    className="flex flex-col items-center justify-center h-24 gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing group relative"
                                 >
                                     <div className="text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                         <SchematicIcon type={item.type} />
                                     </div>
                                     <span className="text-[10px] font-bold text-center text-slate-600 dark:text-slate-300 leading-tight">{item.label}</span>
                                     {group.pinned && (
                                         <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_4px_rgba(168,85,247,0.8)]"></div>
                                     )}
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
          {/* Professional Toolbar */}
          <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm z-20 relative">
              <div className="flex items-center gap-4">
                  <button onClick={() => setIsPaletteOpen(!isPaletteOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500">
                      {isPaletteOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                  </button>
                  
                  <div className="flex flex-col justify-center border-l border-slate-200 dark:border-slate-700 pl-4 h-10">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Project Name</span>
                    <div className="flex items-center gap-2 group">
                        {isEditingName ? (
                            <input 
                                type="text" 
                                value={projectName} 
                                onChange={(e) => setProjectName(e.target.value)}
                                onBlur={() => setIsEditingName(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                autoFocus
                                className="bg-transparent border-b-2 border-cyan-500 text-lg font-bold text-slate-900 dark:text-white focus:outline-none min-w-[200px]"
                            />
                        ) : (
                            <h2 
                                className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2 cursor-pointer hover:text-cyan-600 transition-colors"
                                onClick={() => setIsEditingName(true)}
                            >
                                {projectName}
                                <PenLine size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                            </h2>
                        )}
                    </div>
                  </div>
              </div>

              <div className="flex items-center gap-3">
                  {/* Toggle Pill */}
                  <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                      <button 
                        onClick={() => setVizMode('voltage')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${vizMode === 'voltage' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                      >
                        <Activity size={14} /> Voltage
                      </button>
                      <button 
                        onClick={() => setVizMode('current')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${vizMode === 'current' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                      >
                        <Waves size={14} /> Flow
                      </button>
                  </div>
                  
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2"></div>

                  {/* Big Run Button */}
                  <button 
                      onClick={() => setIsSimulating(!isSimulating)}
                      className={`
                          relative overflow-hidden group flex items-center gap-3 px-8 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                          ${isSimulating 
                              ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/20' 
                              : 'bg-green-500 hover:bg-green-600 text-white ring-4 ring-green-500/20'}
                      `}
                  >
                      {isSimulating ? (
                          <>
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                            STOP
                          </>
                      ) : (
                          <>
                             <Play size={18} fill="currentColor" />
                             RUN
                          </>
                      )}
                  </button>
                  
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => setShowAi(!showAi)} className={`p-2.5 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${showAi ? 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' : 'text-slate-500'}`} title="AI Assistant"><Sparkles size={20}/></button>
                    <button onClick={() => setShowCollab(!showCollab)} className={`p-2.5 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${showCollab ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'text-slate-500'}`} title="Collaborators"><Users size={20}/></button>
                    <button className="p-2.5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors hidden md:block" title="Export"><Download size={20}/></button>
                  </div>
              </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden">
              <CircuitVisualizer 
                  data={data}
                  isSimulating={isSimulating}
                  simulationResult={simulationResult}
                  onUpdate={onUpdate}
                  theme={theme}
                  visualizationMode={vizMode}
                  collaborators={collaborators}
                  onCursorMove={sendCursorMove}
              />
              
              {/* Mobile FAB */}
              {!isPaletteOpen && (
                  <button 
                    onClick={() => setIsPaletteOpen(true)}
                    className="md:hidden absolute bottom-6 left-6 w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-xl shadow-cyan-500/30 flex items-center justify-center text-white z-30 hover:scale-105 transition-transform"
                  >
                      <Plus size={28} />
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
            <div className="flex h-screen w-full bg-paper-100 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden font-sans selection:bg-cyan-500/30">
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)}
                    onOpenPresets={() => setIsPresetLibraryOpen(true)}
                    onOpenGuide={() => setIsGuideOpen(true)}
                />
                
                <main className="flex-1 flex flex-col h-full relative min-w-0">
                    {/* Mobile Header */}
                    <div className="md:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 shrink-0 justify-between">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold font-mono text-lg">CircuitMind</span>
                        <div className="w-6"></div> 
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <Routes>
                            <Route path="/" element={<div className="p-8 flex items-center justify-center h-full text-slate-400">Dashboard Placeholder</div>} />
                            <Route path="/editor" element={<Editor data={circuitData} onUpdate={setCircuitData} onOpenGuide={() => setIsGuideOpen(true)} />} />
                            <Route path="/analytics" element={<div className="p-8 flex items-center justify-center h-full text-slate-400">Analytics Placeholder</div>} />
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