import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CircuitData, CircuitNode, CircuitConnection, Collaborator, SimulationResult } from '../types';
import { Trash2, Activity, Gauge, Plus, Minus, AlertTriangle, CheckCircle2, Flame, Zap, MousePointer2, Cable, Maximize, CloudFog, Component, Map, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  data: CircuitData;
  isSimulating: boolean;
  simulationResult: SimulationResult | null;
  onUpdate: (data: CircuitData) => void;
  theme?: 'dark' | 'light';
  visualizationMode: 'voltage' | 'current';
  collaborators?: Map<string, Collaborator>;
  onCursorMove?: (x: number, y: number) => void;
}

const GRID_SIZE = 20;
const MAX_SAFE_POWER = 0.25; // Watts

type VerdictState = 'neutral' | 'success' | 'danger';
type InteractionMode = 'select' | 'wire';

const CircuitVisualizer: React.FC<Props> = ({ 
    data, 
    isSimulating, 
    simulationResult, 
    onUpdate, 
    theme = 'dark',
    visualizationMode,
    collaborators,
    onCursorMove
}) => {
  // View State
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');

  // Interaction State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [wiringStartId, setWiringStartId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); 
  const containerRef = useRef<HTMLDivElement>(null);
  const [verdict, setVerdict] = useState<{ state: VerdictState; message: string; details?: string } | null>(null);

  const maxVoltage = React.useMemo(() => {
      if (!simulationResult) return 9; 
      let max = 0.1; 
      for (const v of simulationResult.nodeVoltages.values()) {
          const absV = Math.abs(v);
          if (absV > max) max = absV;
      }
      return max;
  }, [simulationResult]);

  // Verdict Logic
  useEffect(() => {
    if (!isSimulating || !simulationResult) {
        setVerdict(null);
        return;
    }
    for (const [id, power] of simulationResult.componentPower.entries()) {
        if (power > MAX_SAFE_POWER) {
            const node = data.nodes.find(n => n.id === id);
            if (node && node.type !== 'source' && node.type !== 'ground' && node.type !== 'switch') {
                setVerdict({
                    state: 'danger',
                    message: 'CIRCUIT FAILURE',
                    details: `${node.label} is overheating (${(power*1000).toFixed(0)}mW)`
                });
                return;
            }
        }
    }
    let successFound = false;
    for (const [id, current] of simulationResult.componentCurrents.entries()) {
        const node = data.nodes.find(n => n.id === id);
        if (node?.type === 'led' && Math.abs(current) > 0.005) {
            setVerdict({ state: 'success', message: 'CIRCUIT FUNCTIONAL', details: `${node.label} is active` });
            successFound = true;
            break;
        }
    }
    if (!successFound) {
        setVerdict({ state: 'neutral', message: 'SIMULATING...', details: 'Analyzing flow...' });
    }
  }, [isSimulating, simulationResult, data.nodes]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom
    };
  }, [view]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(view.zoom * scale, 0.2), 4);
    setView(v => ({ ...v, zoom: newZoom }));
  };

  const handleStart = (clientX: number, clientY: number, button: number = 0, isTouch = false, modifiers = { alt: false, shift: false }) => {
    if (button === 1) { 
      setIsPanning(true);
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }
    const worldPos = toWorld(clientX, clientY);
    const hitNode = data.nodes.find(n => worldPos.x >= n.x && worldPos.x <= n.x + 48 && worldPos.y >= n.y && worldPos.y <= n.y + 48);

    if (hitNode) {
        if (isSimulating) {
            if (hitNode.type === 'switch') {
                const newValue = hitNode.value === 'closed' ? 'open' : 'closed';
                onUpdate({ ...data, nodes: data.nodes.map(n => n.id === hitNode.id ? { ...n, value: newValue } : n) });
            }
            setSelectedNodeId(hitNode.id);
            return;
        }
        if (interactionMode === 'wire' || modifiers.alt) {
            setWiringStartId(hitNode.id);
            return;
        }
        if (modifiers.shift) {
             onUpdate({ nodes: data.nodes.filter(n => n.id !== hitNode.id), connections: data.connections.filter(c => c.sourceId !== hitNode.id && c.targetId !== hitNode.id) });
             return;
        }
        setSelectedNodeId(hitNode.id);
        setDraggingNodeId(hitNode.id);
    } else {
        if (!draggingNodeId && !wiringStartId) {
             if (isTouch || button === 0) { 
                 setIsPanning(true);
                 setLastMousePos({ x: clientX, y: clientY });
                 setSelectedNodeId(null);
             }
        }
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isPanning) {
      const dx = clientX - lastMousePos.x;
      const dy = clientY - lastMousePos.y;
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }
    const worldPos = toWorld(clientX, clientY);
    setMousePos(worldPos);
    if (onCursorMove) onCursorMove(worldPos.x, worldPos.y);
    if (draggingNodeId && !isSimulating) {
      const snappedX = Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE;
      onUpdate({ ...data, nodes: data.nodes.map(n => n.id === draggingNodeId ? { ...n, x: snappedX, y: snappedY } : n) });
    }
  };

  const handleEnd = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    if (wiringStartId) setWiringStartId(null);
  };

  const handleNodeUp = (e: React.MouseEvent | React.TouchEvent, targetId: string) => {
      e.stopPropagation(); 
      if (wiringStartId && wiringStartId !== targetId && !isSimulating) {
          const exists = data.connections.some(c => (c.sourceId === wiringStartId && c.targetId === targetId) || (c.sourceId === targetId && c.targetId === wiringStartId));
          if (!exists) {
            const newConn: CircuitConnection = { id: `e${Date.now()}`, sourceId: wiringStartId, targetId: targetId };
            onUpdate({ ...data, connections: [...data.connections, newConn] });
          }
          setWiringStartId(null);
      } else if (wiringStartId === targetId) {
          setWiringStartId(null);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const type = e.dataTransfer.getData('componentType') as CircuitNode['type'];
    if (!type) return;
    const worldPos = toWorld(e.clientX, e.clientY);
    const newNode: CircuitNode = {
      id: `n${Date.now()}`, type, label: type.replace(/_/g, ' ').toUpperCase(),
      x: Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE,
      value: type === 'switch' ? 'open' : type === 'source' ? '9V' : type === 'resistor' ? '1k' : undefined
    };
    onUpdate({ ...data, nodes: [...data.nodes, newNode] });
  };

  const getWireStyle = (sourceId: string, targetId: string) => {
      const current = simulationResult ? Math.max(Math.abs(simulationResult.componentCurrents.get(sourceId) || 0), Math.abs(simulationResult.componentCurrents.get(targetId) || 0)) : 0;
      const hasCurrent = isSimulating && current > 1e-6;
      
      let color = theme === 'dark' ? '#475569' : '#cbd5e1';
      let width = 2;
      let animSpeed = 0;
      let isFlowing = false;

      if (isSimulating) {
          if (visualizationMode === 'voltage') {
              const v1 = simulationResult?.nodeVoltages.get(sourceId) || 0;
              const v2 = simulationResult?.nodeVoltages.get(targetId) || 0;
              const vAvg = (v1 + v2) / 2;
              const clamped = Math.max(0, Math.min(vAvg, maxVoltage));
              // Blue (240) -> Red (360/0). We map 0..MaxV -> 240..360
              const hue = 240 + (clamped / maxVoltage) * 120; 
              color = `hsl(${hue}, 100%, 60%)`;
              width = 3;
          } else {
              if (hasCurrent) {
                 color = '#f8fafc'; // White dots
                 width = Math.min(8, Math.max(3, current * 100));
                 const speedFactor = Math.max(0.2, Math.min(5, current * 100)); 
                 animSpeed = 1.0 / speedFactor; 
                 isFlowing = true;
              }
          }
      }
      return { color, width, animSpeed, isFlowing };
  };

  // Pro Icons Implementation
  const getNodeIcon = (node: CircuitNode, className: string) => {
    const size = 36; 
    const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };

    switch (node.type) {
      case 'source': return <svg {...props}><path d="M6 12H2" /><path d="M22 12H18" /><path d="M6 7V17" strokeWidth="2.5" /><path d="M10 10V14" /><path d="M14 7V17" strokeWidth="2.5" /><path d="M18 10V14" /></svg>;
      case 'ground': return <svg {...props}><path d="M12 2V12" /><path d="M4 12H20" /><path d="M7 16H17" /><path d="M10 20H14" /></svg>;
      case 'resistor': return <svg {...props}><path d="M2 12H6L8 6L12 18L16 6L18 12H22" /></svg>;
      case 'capacitor': return <svg {...props}><path d="M2 12H10" /><path d="M14 12H22" /><path d="M10 6V18" strokeWidth="2" /><path d="M14 6V18" strokeWidth="2" /></svg>;
      case 'inductor': return <svg {...props}><path d="M2 12H5C5 12 5 5 9 5C13 5 13 12 13 12C13 12 13 5 17 5C21 5 21 12 21 12H22" /></svg>;
      case 'led': return <svg {...props}><path d="M2 12H7" /><path d="M17 12H22" /><path d="M7 7L17 12L7 17V7Z" fill={isSimulating && (simulationResult?.componentCurrents.get(node.id)||0)>0.001 ? "currentColor" : "transparent"} /><path d="M17 7V17" /><path d="M15 5L18 2" /><path d="M18 2L16 2" /><path d="M18 2L18 4" /></svg>;
      case 'switch': return <svg {...props}><circle cx="3" cy="12" r="2" /><circle cx="21" cy="12" r="2" /><path d={node.value === 'closed' ? "M5 12H19" : "M5 12L19 6"} /></svg>;
      case 'transistor': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M2 12H8" /><path d="M8 6V18" strokeWidth="2" /><path d="M8 10L16 4" /><path d="M8 14L16 20" /><path d="M16 20L13 19.5" /></svg>;
      
      // Pro Component Icons
      case 'esp32': return <svg {...props}><rect x="5" y="2" width="14" height="20" rx="2" fill="currentColor" fillOpacity="0.1" /><path d="M9 22V2" /><path d="M15 22V2" /><circle cx="12" cy="18" r="2" /></svg>;
      case 'oled_display': return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2" /><rect x="5" y="8" width="14" height="8" fill="currentColor" fillOpacity="0.2" /></svg>;
      case 'servo': return <svg {...props}><path d="M6 8H18V20H6z" /><path d="M12 8V4" /><path d="M9 4H15" /></svg>;
      case 'relay': return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 12H20" opacity="0.5" /></svg>;
      case 'bench_psu': return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 14H17" /><circle cx="7" cy="10" r="2" /><circle cx="17" cy="10" r="2" /></svg>;

      default: return <Component className={className} size={size} />;
    }
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'} ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8f9fc]'}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={handleDrop}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.button, false, { alt: e.altKey, shift: e.shiftKey })}
        onMouseUp={handleEnd}
        onWheel={handleWheel}
    >
      {/* Verdict Banner */}
      {verdict && (
         <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5 duration-300 border backdrop-blur-md ${
             verdict.state === 'danger' ? 'bg-red-500/90 border-red-400 text-white' : 
             verdict.state === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 
             'bg-slate-800/90 border-slate-600 text-white'
         }`}>
             {verdict.state === 'danger' ? <Flame size={20} className="animate-pulse" /> : verdict.state === 'success' ? <CheckCircle2 size={20} /> : <Activity size={20} className="animate-spin" />}
             <div>
                 <h3 className="font-bold text-sm tracking-wider uppercase">{verdict.message}</h3>
                 {verdict.details && <p className="text-xs opacity-90 font-mono">{verdict.details}</p>}
             </div>
         </div>
      )}

      <div 
        style={{ 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
            width: '100%', height: '100%'
        }}
        className="relative"
      >
        {/* Blueprint Grid */}
        <div className="absolute -inset-[5000px] opacity-[0.07] pointer-events-none bg-grid-pattern" style={{ backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`, backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`, color: theme === 'dark' ? '#22d3ee' : '#000' }}></div>
        
        {/* Wires */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
          <defs>
             <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="4" result="coloredBlur" />
               <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
             </filter>
          </defs>
          {data.connections.map((conn) => {
            const source = data.nodes.find(n => n.id === conn.sourceId);
            const target = data.nodes.find(n => n.id === conn.targetId);
            if (!source || !target) return null;
            
            const startX = source.x + 24; const startY = source.y + 24;
            const endX = target.x + 24; const endY = target.y + 24;
            const dx = Math.abs(endX - startX); const dy = Math.abs(endY - startY);
            const cpOffset = Math.min(dx, dy) * 0.5 + 50;
            const pathD = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;
            
            const { color, width, animSpeed, isFlowing } = getWireStyle(conn.sourceId, conn.targetId);
            
            return (
              <g key={conn.id}>
                  {isSimulating && visualizationMode === 'current' && isFlowing && (
                     <path d={pathD} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={`${width*2},${width*3}`} className="animate-flow" style={{ animationDuration: `${animSpeed}s`, filter: 'url(#glow)' }} />
                  )}
                  <path d={pathD} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeOpacity={isSimulating && visualizationMode === 'current' && isFlowing ? 0.3 : 1} style={{ transition: 'stroke 0.3s ease, stroke-width 0.3s ease' }} />
              </g>
            );
          })}
          {wiringStartId && (() => {
             const n = data.nodes.find(x => x.id === wiringStartId);
             if(!n) return null;
             return <path d={`M ${n.x+24} ${n.y+24} L ${mousePos.x} ${mousePos.y}`} stroke={theme === 'dark' ? "#22d3ee" : "#3b82f6"} strokeWidth="2" strokeDasharray="4,4" fill="none" className="animate-pulse" />;
          })()}
        </svg>

        {/* Nodes */}
        {data.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const current = simulationResult?.componentCurrents.get(node.id) || 0;
            const voltage = simulationResult?.nodeVoltages.get(node.id) || 0;
            const isOverheating = (simulationResult?.componentPower.get(node.id) || 0) > MAX_SAFE_POWER;

            return (
            <div
                key={node.id}
                onMouseUp={(e) => handleNodeUp(e, node.id)}
                onTouchEnd={(e) => handleNodeUp(e, node.id)}
                className={`absolute flex flex-col items-center justify-center group z-10 transition-transform ${isOverheating ? 'animate-shake' : ''}`}
                style={{ left: node.x, top: node.y, width: 48, height: 48 }}
            >
                {isOverheating && <div className="absolute -top-10 text-red-500 animate-bounce z-50"><Flame size={32} fill="currentColor" /></div>}
                
                <div className={`w-12 h-12 flex items-center justify-center relative rounded-xl transition-all duration-200 ${isSelected ? 'ring-4 ring-cyan-500/40 scale-110 bg-cyan-500/10' : ''}`}>
                    {getNodeIcon(node, isSimulating && (node.type === 'source' || current > 0.001) ? (node.type==='led' ? 'text-red-500' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]') : (theme === 'dark' ? 'text-slate-400 group-hover:text-cyan-300' : 'text-slate-600 group-hover:text-cyan-600'))}
                </div>

                {/* 2026 Pro Labels */}
                <div className="absolute top-12 flex flex-col items-center whitespace-nowrap pointer-events-none">
                     <span className={`text-[10px] font-bold tracking-wider font-mono mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{node.label}</span>
                     {(node.value || isSimulating) && (
                        <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shadow-sm backdrop-blur-sm ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-cyan-300' : 'bg-white/90 border-slate-200 text-slate-700'}`}>
                            {isSimulating ? (
                                <>
                                  <span>{Math.abs(voltage).toFixed(1)}V</span>
                                  <span className="w-px h-2 bg-slate-500/50"></span>
                                  <span className={current > 0.01 ? 'text-yellow-500' : ''}>{Math.abs(current*1000).toFixed(0)}mA</span>
                                </>
                            ) : (
                                <span>{node.value}</span>
                            )}
                        </div>
                     )}
                </div>
                
                {!isSimulating && isSelected && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpdate({ nodes: data.nodes.filter(n => n.id !== node.id), connections: data.connections.filter(c => c.sourceId !== node.id && c.targetId !== node.id) }) }}
                        className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md transition-transform hover:scale-110 z-20"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
            );
        })}
        
        {/* Collaborators */}
        {collaborators && Array.from(collaborators.values()).map((collab) => (
             <div key={collab.id} className="absolute pointer-events-none z-50 transition-transform duration-100 ease-linear" style={{ transform: `translate(${collab.x}px, ${collab.y}px)` }}>
                <MousePointer2 size={20} fill={collab.color} className="text-white drop-shadow-md" />
                <span className="absolute left-5 top-0 px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-sm whitespace-nowrap" style={{ backgroundColor: collab.color }}>{collab.username}</span>
             </div>
        ))}
      </div>

      {/* Floating Tools (Bottom Right) */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-40 pointer-events-auto">
         <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
             <button onClick={() => setView(v => ({ ...v, zoom: Math.min(v.zoom + 0.2, 4) }))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400" title="Zoom In">
                 <ZoomIn size={20} />
             </button>
             <input 
                type="range" 
                min="0.4" max="4" step="0.1" 
                value={view.zoom} 
                onChange={(e) => setView(v => ({...v, zoom: parseFloat(e.target.value)}))}
                className="h-24 w-1 appearance-none bg-slate-200 dark:bg-slate-700 rounded-full outline-none writing-vertical-lr rotate-180" 
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
             />
             <button onClick={() => setView(v => ({ ...v, zoom: Math.max(v.zoom - 0.2, 0.4) }))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400" title="Zoom Out">
                 <ZoomOut size={20} />
             </button>
         </div>
         <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
             <button onClick={() => setView({ x: 0, y: 0, zoom: 1 })} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400" title="Fit to Screen"><Maximize size={20}/></button>
             <button onClick={() => setInteractionMode(m => m === 'select' ? 'wire' : 'select')} className={`p-2 rounded-xl transition-colors ${interactionMode === 'wire' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Toggle Wire Mode"><Cable size={20}/></button>
         </div>
      </div>

      {/* Empty State Pro */}
      {data.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-60">
              <div className="w-64 h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center animate-pulse-slow">
                  <Plus size={64} className="text-slate-300 dark:text-slate-700" />
              </div>
              <div className="mt-8 text-center">
                  <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Start Designing</h3>
                  <p className="text-slate-500 dark:text-slate-500 flex items-center gap-2 justify-center">
                      Drag components from the left <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">OR</span> Ask AI
                  </p>
              </div>
          </div>
      )}
    </div>
  );
};

export default CircuitVisualizer;