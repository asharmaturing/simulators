import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CircuitData, CircuitNode, CircuitConnection, Collaborator, SimulationResult } from '../types';
import { Trash2, Activity, Gauge, Plus, Minus, AlertTriangle, CheckCircle2, Flame, Zap, MousePointer2, Cable, Maximize, CloudFog, Component } from 'lucide-react';

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // World coordinates
  const containerRef = useRef<HTMLDivElement>(null);

  // Verdict State
  const [verdict, setVerdict] = useState<{ state: VerdictState; message: string; details?: string } | null>(null);

  // --- Simulation Verdict Logic ---
  useEffect(() => {
    if (!isSimulating || !simulationResult) {
        setVerdict(null);
        return;
    }

    // 1. Check for Failures (Overheating)
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

    // 2. Check for Success (Active Outputs)
    let successFound = false;
    for (const [id, current] of simulationResult.componentCurrents.entries()) {
        const node = data.nodes.find(n => n.id === id);
        if (node?.type === 'led' && Math.abs(current) > 0.005) {
            setVerdict({
                state: 'success',
                message: 'CIRCUIT FUNCTIONAL',
                details: `${node.label} is active`
            });
            successFound = true;
            break;
        }
    }

    if (!successFound) {
        setVerdict({ state: 'neutral', message: 'SIMULATING...', details: 'Analyzing current flow...' });
    }

  }, [isSimulating, simulationResult, data.nodes]);


  // --- Coordinate Helpers ---
  const toWorld = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom
    };
  }, [view]);

  // --- Event Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(view.zoom * scale, 0.4), 3);
    setView(v => ({ ...v, zoom: newZoom }));
  };

  const handleStart = (clientX: number, clientY: number, button: number = 0, isTouch = false, modifiers = { alt: false, shift: false }) => {
    if (button === 1) { // Middle mouse pan
      setIsPanning(true);
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    const worldPos = toWorld(clientX, clientY);
    
    // Hit Testing
    const hitNode = data.nodes.find(n => 
        worldPos.x >= n.x && worldPos.x <= n.x + 48 &&
        worldPos.y >= n.y && worldPos.y <= n.y + 48
    );

    if (hitNode) {
        // Toggle Switch (Simulation Mode)
        if (isSimulating) {
            if (hitNode.type === 'switch') {
                const newValue = hitNode.value === 'closed' ? 'open' : 'closed';
                onUpdate({
                    ...data,
                    nodes: data.nodes.map(n => n.id === hitNode.id ? { ...n, value: newValue } : n)
                });
            }
            setSelectedNodeId(hitNode.id);
            return;
        }

        // Wiring Mode OR Alt Key -> Start Wire
        if (interactionMode === 'wire' || modifiers.alt) {
            setWiringStartId(hitNode.id);
            return;
        }

        // Shift -> Quick Delete
        if (modifiers.shift) {
             onUpdate({ 
                 nodes: data.nodes.filter(n => n.id !== hitNode.id), 
                 connections: data.connections.filter(c => c.sourceId !== hitNode.id && c.targetId !== hitNode.id) 
             });
             return;
        }

        // Default -> Select/Drag
        setSelectedNodeId(hitNode.id);
        setDraggingNodeId(hitNode.id);
    } else {
        // Background Click
        if (!draggingNodeId && !wiringStartId) {
             if (isTouch || button === 0) { 
                 // Left drag on background pans canvas
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
      onUpdate({
        ...data,
        nodes: data.nodes.map(n => n.id === draggingNodeId ? { ...n, x: snappedX, y: snappedY } : n)
      });
    }
  };

  const handleEnd = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    if (wiringStartId) {
        setWiringStartId(null);
    }
  };

  const handleNodeUp = (e: React.MouseEvent | React.TouchEvent, targetId: string) => {
      e.stopPropagation(); 
      
      if (wiringStartId && wiringStartId !== targetId && !isSimulating) {
          const exists = data.connections.some(
            c => (c.sourceId === wiringStartId && c.targetId === targetId) || 
                 (c.sourceId === targetId && c.targetId === wiringStartId)
          );
          if (!exists) {
            const newConn: CircuitConnection = {
                id: `e${Date.now()}`,
                sourceId: wiringStartId,
                targetId: targetId
            };
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
    const x = Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE;
    const newNode: CircuitNode = {
      id: `n${Date.now()}`,
      type,
      label: type.replace(/_/g, ' ').toUpperCase(),
      x,
      y,
      value: type === 'switch' ? 'open' : type === 'source' ? '9V' : type === 'resistor' ? '1k' : undefined
    };
    onUpdate({ ...data, nodes: [...data.nodes, newNode] });
  };

  // --- Render Helpers ---
  const getSmartWirePath = (source: CircuitNode, target: CircuitNode) => {
    const NODE_SIZE = 48;
    const HALF = NODE_SIZE / 2;
    const sx = source.x + HALF;
    const sy = source.y + HALF;
    const tx = target.x + HALF;
    const ty = target.y + HALF;
    const dx = tx - sx;
    const dy = ty - sy;
    
    const startDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'b' : 't');
    const endDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'l' : 'r') : (dy > 0 ? 't' : 'b');

    const getOffset = (dir: string) => {
        if (dir === 'r') return { x: HALF, y: 0 };
        if (dir === 'l') return { x: -HALF, y: 0 };
        if (dir === 'b') return { x: 0, y: HALF };
        return { x: 0, y: -HALF };
    }

    const sOff = getOffset(startDir);
    const tOff = getOffset(endDir);
    const startX = sx + sOff.x;
    const startY = sy + sOff.y;
    const endX = tx + tOff.x;
    const endY = ty + tOff.y;
    const cpLen = Math.min(Math.hypot(endX - startX, endY - startY) * 0.5, 100);
    const cp1x = startX + (sOff.x ? Math.sign(sOff.x)*cpLen : 0);
    const cp1y = startY + (sOff.y ? Math.sign(sOff.y)*cpLen : 0);
    const cp2x = endX + (tOff.x ? Math.sign(tOff.x)*cpLen : 0);
    const cp2y = endY + (tOff.y ? Math.sign(tOff.y)*cpLen : 0);

    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
  };

  // --- Simulation Logic Helpers ---
  const getWireCurrent = (sourceId: string, targetId: string): number => {
      if (!simulationResult) return 0;
      const iS = Math.abs(simulationResult.componentCurrents.get(sourceId) || 0);
      const iT = Math.abs(simulationResult.componentCurrents.get(targetId) || 0);
      return Math.max(iS, iT);
  };

  // --- Dynamic Wire Styling ---
  const getWireStyle = (sourceId: string, targetId: string) => {
      const current = getWireCurrent(sourceId, targetId);
      const hasCurrent = isSimulating && current > 1e-6; 
      
      let color = theme === 'dark' ? '#334155' : '#cbd5e1'; // Default inactive slate
      let width = 2;
      let animSpeed = 0;
      let isFlowing = false;

      if (isSimulating) {
          if (visualizationMode === 'voltage') {
              // Voltage Mode: Solid colors indicating potential
              const v1 = simulationResult?.nodeVoltages.get(sourceId) || 0;
              const v2 = simulationResult?.nodeVoltages.get(targetId) || 0;
              const vAvg = (v1 + v2) / 2;

              if (vAvg < 0.1) {
                  color = '#3b82f6'; // Ground (Blue)
              } else {
                   // Gradient: 0V (Blue 240deg) -> 9V (Red 0deg)
                   const maxV = 9.0; 
                   const clamped = Math.max(0, Math.min(vAvg, maxV));
                   const hue = 240 - (clamped / maxV) * 240;
                   color = `hsl(${hue}, 90%, 60%)`;
              }
              width = 4; // Thicker for voltage visibility
              isFlowing = false; // NO ANIMATION in voltage mode
          } else {
              // Current Mode: Dashed flowing lines
              if (current < 1e-6) color = theme === 'dark' ? '#1e293b' : '#cbd5e1';
              else if (current < 0.01) color = '#60a5fa'; // Blue (<10mA)
              else if (current < 0.1) color = '#facc15'; // Yellow (<100mA)
              else color = '#ef4444'; // Red (>100mA)

              width = Math.min(8, Math.max(2, current * 50 + 2));
              
              if (hasCurrent) {
                 // Speed is proportional to current
                 const speedFactor = Math.max(0.2, Math.min(5, current * 100)); 
                 animSpeed = 1.0 / speedFactor; 
                 isFlowing = true;
              }
          }
      }

      return { color, width, animSpeed, isFlowing };
  };

  // --- Schematic Symbols (Blueprint Style) ---
  const getNodeIcon = (node: CircuitNode, className: string) => {
    const size = 32; 
    const strokeWidth = 2; 
    // Blueprint style props
    const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };

    switch (node.type) {
      case 'source':
        return <svg {...props}><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="6" y1="6" x2="6" y2="18" strokeWidth={2.5}/><line x1="10" y1="9" x2="10" y2="15" /><line x1="14" y1="6" x2="14" y2="18" strokeWidth={2.5}/><line x1="18" y1="9" x2="18" y2="15" /></svg>;
      case 'ground':
        return <svg {...props}><line x1="12" y1="2" x2="12" y2="12" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="7" y1="16" x2="17" y2="16" /><line x1="10" y1="20" x2="14" y2="20" /></svg>;
      case 'resistor':
        return <svg {...props}><path d="M2 12 H6 L8 6 L12 18 L16 6 L18 12 H22" /></svg>;
      case 'capacitor':
        return <svg {...props}><line x1="2" y1="12" x2="10" y2="12" /><line x1="14" y1="12" x2="22" y2="12" /><line x1="10" y1="6" x2="10" y2="18" /><line x1="14" y1="6" x2="14" y2="18" /></svg>;
      case 'inductor':
         return <svg {...props}><path d="M2 12 H5 C 5 12, 5 5, 9 5 C 13 5, 13 12, 13 12 C 13 12, 13 5, 17 5 C 21 5, 21 12, 21 12 H22" /></svg>;
      case 'led':
        return <svg {...props}><line x1="2" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="22" y2="12" /><path d="M7 7 L17 12 L7 17 V7 Z" /><line x1="17" y1="7" x2="17" y2="17" /><path d="M16 5 L19 2" strokeWidth={1.5}/><path d="M19 2 L17 2" strokeWidth={1.5}/><path d="M19 2 L19 4" strokeWidth={1.5}/></svg>;
      case 'switch':
        return <svg {...props}><circle cx="3" cy="12" r="2" /><circle cx="21" cy="12" r="2" /><line x1="5" y1="12" x2={node.value === 'closed' ? 19 : 17} y2={node.value === 'closed' ? 12 : 6} /></svg>;
      case 'transistor':
      case 'transistor_npn':
         return <svg {...props}><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><line x1="2" y1="12" x2="8" y2="12" /><line x1="8" y1="6" x2="8" y2="18" strokeWidth={2.5} /><line x1="8" y1="10" x2="16" y2="4" /><line x1="8" y1="14" x2="16" y2="20" /><path d="M16 20 L13 19.5" /><path d="M16 20 L14 17.5" /></svg>;
      case 'gate_and':
         return <svg {...props}><path d="M2 5H8C13.5 5 18 8.5 18 12C18 15.5 13.5 19 8 19H2V5Z" /><line x1="18" y1="12" x2="22" y2="12" /></svg>;
      case 'gate_or':
        return <svg {...props}><path d="M2 5C2 5 7 8 7 12C7 16 2 19 2 19C8 19 16 19 18 12C16 5 8 5 2 5Z" /><line x1="18" y1="12" x2="22" y2="12" /></svg>;
      case 'gate_not':
         return <svg {...props}><path d="M4 5L16 12L4 19V5Z" /><circle cx="19" cy="12" r="2.5" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="21.5" y1="12" x2="23" y2="12" /></svg>;
      
      // Pro Components
      case 'esp32':
        return <svg {...props}><rect x="6" y="6" width="12" height="16" rx="1" /><path d="M8 2v4h8V2" /><circle cx="12" cy="14" r="2" /></svg>;
      case 'oled_display':
        return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="1" /><rect x="4" y="6" width="16" height="10" strokeWidth="1" /><path d="M9 20h6" /></svg>;
      case 'servo':
        return <svg {...props}><rect x="4" y="8" width="16" height="12" rx="1" /><path d="M8 8V4h8v4" /><circle cx="12" cy="14" r="3" /></svg>;
      case 'relay':
        return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 12h8" /><path d="M12 8v8" strokeDasharray="2 2" /></svg>;
      case 'bench_psu':
        return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="1" /><path d="M5 8h14" /><circle cx="8" cy="14" r="1.5" /><circle cx="16" cy="14" r="1.5" /></svg>;
      case 'scope_probe':
        return <svg {...props}><path d="M20 4l-8 8" /><path d="M10 14l-6 6" strokeWidth="2" /><circle cx="20" cy="4" r="2" /></svg>;
      case 'func_gen':
        return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="1" /><path d="M6 12c2-4 4-4 6 0s4 4 6 0" /></svg>;
      case 'lcd_16x2':
        return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="1" /><line x1="4" y1="10" x2="20" y2="10" opacity="0.5" /><line x1="4" y1="14" x2="20" y2="14" opacity="0.5" /></svg>;
      case 'neopixel':
        return <svg {...props}><rect x="8" y="8" width="8" height="8" rx="1" /><circle cx="12" cy="12" r="2" /></svg>;
      case 'logic_probe':
        return <svg {...props}><path d="M12 2v20" /><path d="M8 6h8" /><path d="M8 18h8" /></svg>;
      case 'bme280':
        return <svg {...props}><rect x="6" y="6" width="12" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></svg>;
      case 'ina219':
         return <svg {...props}><rect x="4" y="6" width="16" height="12" rx="1" /><path d="M8 6V4" /><path d="M16 6V4" /><path d="M8 18v2" /><path d="M16 18v2" /></svg>;

      default: return <Activity className={className} size={size} />;
    }
  };

  const renderMultimeter = () => {
    if (!isSimulating || !simulationResult || !selectedNodeId) return null;
    const node = data.nodes.find(n => n.id === selectedNodeId);
    if (!node || node.type === 'ground') return null;

    const voltage = simulationResult.nodeVoltages.get(node.id) || 0;
    const current = simulationResult.componentCurrents.get(node.id) || 0;
    const power = simulationResult.componentPower.get(node.id) || 0;

    return (
      <div className="absolute top-20 right-4 w-52 bg-slate-900/90 backdrop-blur border border-cyan-900/50 rounded-sm p-3 text-cyan-50 shadow-2xl z-30 font-mono">
         <div className="flex items-center justify-between mb-2 border-b border-cyan-900 pb-1">
            <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-xs uppercase tracking-wider">
              <Gauge size={12} /> {node.label}
            </h3>
         </div>
         <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">V:</span><span className="font-bold text-cyan-300">{voltage.toFixed(2)} V</span></div>
            <div className="flex justify-between"><span className="text-slate-500">I:</span><span className="font-bold text-yellow-400">{(current*1000).toFixed(1)} mA</span></div>
            <div className="flex justify-between"><span className="text-slate-500">P:</span><span className="font-bold text-red-400">{(power*1000).toFixed(1)} mW</span></div>
         </div>
      </div>
    );
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'} ${theme === 'dark' ? 'bg-slate-950' : 'bg-paper-100'}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={handleDrop}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.button, false, { alt: e.altKey, shift: e.shiftKey })}
        onMouseUp={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, 0, true)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        onWheel={handleWheel}
    >
      {/* Animated Verdict Banner */}
      {verdict && (
         <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 min-w-[300px] px-8 py-4 rounded-sm shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-10 duration-300 border-2 backdrop-blur-md ${
             verdict.state === 'danger' ? 'bg-red-950/90 border-red-600 text-red-50' : 
             verdict.state === 'success' ? 'bg-green-950/90 border-green-500 text-green-50' : 
             'bg-slate-900/90 border-cyan-500/50 text-cyan-50'
         }`}>
             <div className={`p-3 rounded-full shadow-inner ${
                 verdict.state === 'danger' ? 'bg-red-800 animate-pulse' : 
                 verdict.state === 'success' ? 'bg-green-800' : 'bg-cyan-900'
             }`}>
                 {verdict.state === 'danger' ? <Flame size={28} /> : verdict.state === 'success' ? <CheckCircle2 size={28} /> : <Activity size={28} />}
             </div>
             <div className="flex-1">
                 <h3 className="font-mono font-bold text-lg tracking-widest uppercase">{verdict.message}</h3>
                 <p className="text-sm font-mono opacity-80">{verdict.details}</p>
             </div>
         </div>
      )}

      <div 
        style={{ 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%'
        }}
        className="relative"
      >
        {/* Blueprint Grid */}
        <div className="absolute -inset-[5000px] opacity-30 pointer-events-none z-0 bg-grid-pattern" 
             style={{ backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` }}>
        </div>
        
        {/* Wires Layer */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
          <defs>
             <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="2" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
          </defs>
          {data.connections.map((conn) => {
            const source = data.nodes.find(n => n.id === conn.sourceId);
            const target = data.nodes.find(n => n.id === conn.targetId);
            if (!source || !target) return null;
            
            const pathD = getSmartWirePath(source, target);
            const { color, width, animSpeed, isFlowing } = getWireStyle(conn.sourceId, conn.targetId);
            
            return (
              <g key={conn.id}>
                  {/* Glow Effect for Active Wires */}
                  {isSimulating && (visualizationMode === 'current' ? isFlowing : width > 2) && (
                      <path d={pathD} stroke={color} strokeWidth={width + 4} fill="none" strokeOpacity={0.2} filter="url(#glow)" />
                  )}
                  <path
                    d={pathD}
                    stroke={color}
                    strokeWidth={width}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={isFlowing ? "12, 12" : undefined} // Apply dashes only if flowing
                    className={isFlowing ? 'animate-flow' : ''}
                    style={{ 
                        transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
                        animationDuration: isFlowing ? `${animSpeed}s` : '0s'
                    }}
                  />
              </g>
            );
          })}
          
          {/* Dragging Line */}
          {wiringStartId && (
             (() => {
               const startNode = data.nodes.find(n => n.id === wiringStartId);
               if (!startNode) return null;
               return (
                  <path
                      d={`M ${startNode.x+24} ${startNode.y+24} L ${mousePos.x} ${mousePos.y}`}
                      stroke={theme === 'dark' ? "#22d3ee" : "#0f172a"}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      fill="none"
                  />
               );
             })()
          )}
        </svg>

        {/* Nodes Layer */}
        {data.nodes.map((node) => {
            const isPowered = simulationResult?.isPowered.has(node.id) ?? false;
            // For PRO components, treat as powered if they have ANY connection to a live net
            // This is a visual fallback since the simulator doesn't model them yet.
            const effectivePowered = isPowered || (isSimulating && (simulationResult?.nodeVoltages.get(node.id) || 0) > 0.5);
            
            const isSelected = selectedNodeId === node.id;
            const power = simulationResult?.componentPower.get(node.id) || 0;
            const isOverheating = power > MAX_SAFE_POWER;

            // Blueprint Node Styling
            let ring = isSelected ? "ring-2 ring-yellow-400" : "border-2 border-transparent";
            if (theme === 'dark') {
               ring = isSelected ? "ring-2 ring-cyan-400" : "border-transparent";
            }
            
            const iconColor = (isSimulating && effectivePowered) 
                ? (node.type === 'led' ? 'text-red-500' : node.type === 'source' ? 'text-green-500' : 'text-cyan-400')
                : (theme === 'dark' ? 'text-cyan-200' : 'text-slate-800');

            return (
            <div
                key={node.id}
                onMouseUp={(e) => handleNodeUp(e, node.id)}
                onTouchEnd={(e) => handleNodeUp(e, node.id)}
                className={`absolute flex flex-col items-center justify-center group z-10`}
                style={{ left: node.x, top: node.y, width: 48, height: 48 }}
            >
                {/* Overheating Smoke Effect */}
                {isOverheating && isSimulating && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-slate-400 animate-smoke z-50 pointer-events-none">
                        <CloudFog size={32} />
                    </div>
                )}

                <div className={`w-12 h-12 flex items-center justify-center relative rounded-md ${ring} transition-all bg-opacity-0`}>
                    {getNodeIcon(node, iconColor)}
                </div>

                {/* Permanent Technical Label */}
                <div className="absolute -bottom-6 flex flex-col items-center pointer-events-none whitespace-nowrap">
                     <span className={`text-[9px] font-bold tracking-widest uppercase font-mono ${theme === 'dark' ? 'text-cyan-600' : 'text-slate-500'}`}>
                        {node.label}
                     </span>
                     {node.value && (
                        <span className={`text-[10px] font-mono font-bold px-1 rounded-sm border ${theme === 'dark' ? 'bg-slate-900 text-cyan-300 border-cyan-900' : 'bg-white text-slate-800 border-slate-300'}`}>
                            {node.value}
                        </span>
                     )}
                </div>
                
                {!isSimulating && (
                    <div 
                        onClick={(e) => { e.stopPropagation(); onUpdate({ nodes: data.nodes.filter(n => n.id !== node.id), connections: data.connections.filter(c => c.sourceId !== node.id && c.targetId !== node.id) }) }}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 scale-75 cursor-pointer bg-red-600 rounded-full p-1 text-white shadow-sm z-30 transition-opacity"
                    >
                        <Trash2 size={12} />
                    </div>
                )}
            </div>
            );
        })}
        
        {/* Collaborators */}
        {collaborators && Array.from(collaborators.values()).map((collab) => (
             <div key={collab.id} className="absolute pointer-events-none" style={{ transform: `translate(${collab.x}px, ${collab.y}px)`, transition: 'transform 0.1s linear' }}>
                <MousePointer2 size={16} fill={collab.color} className="text-white drop-shadow-md" />
                <span className="absolute left-4 top-0 bg-slate-900 text-white text-[10px] px-1 rounded opacity-70 font-mono">{collab.username}</span>
             </div>
        ))}
      </div>
      
      {renderMultimeter()}

      {/* HUD Controls */}
      {/* Bottom Left: Tools */}
      <div className="absolute bottom-6 left-6 flex gap-2 pointer-events-auto">
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 flex gap-1">
            <button 
                onClick={() => setInteractionMode('select')}
                className={`p-2 rounded-md transition-all ${interactionMode === 'select' ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Select / Drag Mode (V)"
            >
                <MousePointer2 size={18} />
            </button>
            <button 
                onClick={() => setInteractionMode('wire')}
                className={`p-2 rounded-md transition-all ${interactionMode === 'wire' ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Wiring Mode (W)"
            >
                <Cable size={18} />
            </button>
         </div>
      </div>

      {/* Bottom Right: Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-auto">
         <div className="bg-white dark:bg-slate-900 p-1.5 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1">
             <button onClick={() => setView(v => ({ ...v, zoom: Math.min(v.zoom + 0.2, 3) }))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300" title="Zoom In">
                 <Plus size={18} />
             </button>
             <div className="w-6 h-px bg-slate-200 dark:bg-slate-700"></div>
             <span className="text-[10px] font-mono font-bold text-slate-400 py-1">{Math.round(view.zoom * 100)}%</span>
             <div className="w-6 h-px bg-slate-200 dark:bg-slate-700"></div>
             <button onClick={() => setView(v => ({ ...v, zoom: Math.max(v.zoom - 0.2, 0.4) }))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300" title="Zoom Out">
                 <Minus size={18} />
             </button>
         </div>
         <button onClick={() => setView({ x: 0, y: 0, zoom: 1 })} className="bg-white dark:bg-slate-900 p-3 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title="Fit to Screen">
             <Maximize size={18} />
         </button>
      </div>
      
      {wiringStartId && (
         <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-cyan-100 dark:bg-cyan-900/90 text-cyan-900 dark:text-cyan-100 px-6 py-2 rounded-sm text-sm font-mono shadow-lg border border-cyan-300 dark:border-cyan-700 backdrop-blur-sm pointer-events-none">
             SELECT TARGET COMPONENT
         </div>
      )}

      {/* Empty State */}
       {data.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur p-8 rounded-lg border border-slate-200 dark:border-slate-700 text-center max-w-sm shadow-xl border-dashed">
                   <div className="bg-cyan-100 dark:bg-cyan-900/30 p-4 rounded-full inline-flex mb-4 text-cyan-600 dark:text-cyan-400">
                     <Plus size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-mono">START DESIGN</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">Drag components or ask AI.</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default CircuitVisualizer;