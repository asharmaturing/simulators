
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CircuitData, CircuitNode, CircuitConnection, Collaborator, SimulationResult } from '../types';
import { Trash2, Activity, Gauge, Plus, Minus, AlertTriangle, CheckCircle2, Flame, Zap, MousePointer2, Cable } from 'lucide-react';

interface Props {
  data: CircuitData;
  isSimulating: boolean;
  simulationResult: SimulationResult | null;
  onUpdate: (data: CircuitData) => void;
  theme?: 'dark' | 'light';
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
            if (node && node.type !== 'source' && node.type !== 'ground') {
                setVerdict({
                    state: 'danger',
                    message: 'Circuit Failure!',
                    details: `${node.label} is overheating (${power.toFixed(2)}W > ${MAX_SAFE_POWER}W)`
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
                message: 'Circuit Works!',
                details: `${node.label} is emitting light`
            });
            successFound = true;
            break;
        }
    }

    if (!successFound) {
        setVerdict({ state: 'neutral', message: 'Simulating...', details: 'No active outputs detected yet' });
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
    // If we released mouse NOT on a node, cancel wiring
    if (wiringStartId) {
        setWiringStartId(null);
    }
  };

  const handleNodeUp = (e: React.MouseEvent | React.TouchEvent, targetId: string) => {
      e.stopPropagation(); // Prevent container handleEnd from clearing wiringStartId immediately
      
      if (wiringStartId && wiringStartId !== targetId && !isSimulating) {
          // Complete the connection
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
          // Released on same node, do nothing (or cancel if it was a click-click intent)
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

  const getWireColor = (sourceId: string, targetId: string) => {
      if (!isSimulating || !simulationResult) return theme === 'dark' ? '#475569' : '#94a3b8';
      
      const v1 = simulationResult.nodeVoltages.get(sourceId) || 0;
      const v2 = simulationResult.nodeVoltages.get(targetId) || 0;
      const vAvg = (v1 + v2) / 2;

      if (vAvg < 0.1) return '#3b82f6'; // Ground Blue
      if (vAvg > 0.1) return '#ef4444'; // Hot Red
      return '#64748b'; // Passive
  };

  // --- Schematic Symbols ---
  const getNodeIcon = (node: CircuitNode, className: string) => {
    const size = 28; 
    const strokeWidth = 2;
    const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };

    switch (node.type) {
      case 'source':
        return <svg {...props}><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="6" y1="5" x2="6" y2="19" /><line x1="10" y1="8" x2="10" y2="16" /><line x1="14" y1="5" x2="14" y2="19" /><line x1="18" y1="8" x2="18" y2="16" /></svg>;
      case 'ground':
        return <svg {...props}><line x1="12" y1="2" x2="12" y2="12" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="7" y1="16" x2="17" y2="16" /><line x1="10" y1="20" x2="14" y2="20" /></svg>;
      case 'resistor':
        return <svg {...props}><path d="M2 12 H6 L8 7 L12 17 L16 7 L18 12 H22" /></svg>;
      case 'capacitor':
        return <svg {...props}><line x1="2" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="22" y2="12" /><line x1="9" y1="5" x2="9" y2="19" /><line x1="15" y1="5" x2="15" y2="19" /></svg>;
      case 'inductor':
         return <svg {...props}><path d="M2 12 H5 C 5 12, 5 5, 9 5 C 13 5, 13 12, 13 12 C 13 12, 13 5, 17 5 C 21 5, 21 12, 21 12 H22" /></svg>;
      case 'led':
        return <svg {...props}><line x1="2" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="22" y2="12" /><path d="M7 7 L17 12 L7 17 V7 Z" fill="currentColor" fillOpacity="0.2" /><line x1="17" y1="7" x2="17" y2="17" /><path d="M15 5 L18 2" /><path d="M18 2 L16 2" /><path d="M18 2 L18 4" /><path d="M18 8 L21 5" /></svg>;
      case 'switch':
        return <svg {...props}><circle cx="3" cy="12" r="2" /><circle cx="21" cy="12" r="2" /><line x1="3" y1="12" x2={node.value === 'closed' ? 21 : 18} y2={node.value === 'closed' ? 12 : 4} /></svg>;
      case 'transistor':
      case 'transistor_npn':
         return <svg {...props}><circle cx="12" cy="12" r="10" strokeWidth={1.5} /><line x1="2" y1="12" x2="8" y2="12" /><line x1="8" y1="6" x2="8" y2="18" strokeWidth={2.5} /><line x1="8" y1="10" x2="16" y2="4" /><line x1="8" y1="14" x2="16" y2="20" /><path d="M16 20 L13 19.5" /><path d="M16 20 L14 17.5" /></svg>;
      case 'gate_and':
         return <svg {...props}><path d="M2 5H8C13.5 5 18 8.5 18 12C18 15.5 13.5 19 8 19H2V5Z" /><line x1="18" y1="12" x2="22" y2="12" /></svg>;
      case 'gate_or':
        return <svg {...props}><path d="M2 5C2 5 7 8 7 12C7 16 2 19 2 19C8 19 16 19 18 12C16 5 8 5 2 5Z" /><line x1="18" y1="12" x2="22" y2="12" /></svg>;
      case 'gate_not':
         return <svg {...props}><path d="M4 5L16 12L4 19V5Z" /><circle cx="19" cy="12" r="2.5" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="21.5" y1="12" x2="23" y2="12" /></svg>;
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
      <div className="absolute top-24 right-4 w-56 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl p-4 text-slate-200 shadow-2xl z-30 animate-in slide-in-from-right-5">
         <div className="flex items-center justify-between mb-2 border-b border-slate-600 pb-1">
            <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-sm">
              <Gauge size={14} /> {node.label}
            </h3>
         </div>
         <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between"><span className="text-slate-400">V:</span><span className="font-bold text-green-400">{voltage.toFixed(2)} V</span></div>
            <div className="flex justify-between"><span className="text-slate-400">I:</span><span className="font-bold text-yellow-400">{(current*1000).toFixed(1)} mA</span></div>
            <div className="flex justify-between"><span className="text-slate-400">P:</span><span className="font-bold text-red-400">{(power*1000).toFixed(1)} mW</span></div>
         </div>
      </div>
    );
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'} ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}
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
      {/* Verdict Banner */}
      {verdict && (
         <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5 duration-300 ${
             verdict.state === 'danger' ? 'bg-red-600 text-white' : 
             verdict.state === 'success' ? 'bg-green-500 text-white' : 
             'bg-slate-800 text-slate-300 border border-slate-700'
         }`}>
             <div className={`p-2 rounded-full ${verdict.state === 'danger' ? 'bg-red-800' : verdict.state === 'success' ? 'bg-green-700' : 'bg-slate-700'}`}>
                 {verdict.state === 'danger' ? <Flame size={20} /> : verdict.state === 'success' ? <CheckCircle2 size={20} /> : <Activity size={20} />}
             </div>
             <div>
                 <h3 className="font-bold text-sm">{verdict.message}</h3>
                 <p className="text-xs opacity-90">{verdict.details}</p>
             </div>
             {verdict.state === 'success' && <button className="text-lg hover:scale-125 transition-transform">🎉</button>}
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
        {/* Background Grid */}
        <div className="absolute -inset-[5000px] opacity-20 pointer-events-none z-0" 
             style={{ 
               backgroundImage: `radial-gradient(${theme === 'dark' ? '#475569' : '#94a3b8'} 1.5px, transparent 1.5px)`, 
               backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` 
             }}>
        </div>
        
        {/* Wires */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
          {data.connections.map((conn) => {
            const source = data.nodes.find(n => n.id === conn.sourceId);
            const target = data.nodes.find(n => n.id === conn.targetId);
            if (!source || !target) return null;
            const pathD = getSmartWirePath(source, target);
            const strokeColor = getWireColor(conn.sourceId, conn.targetId);
            
            return (
              <path
                key={conn.id}
                d={pathD}
                stroke={strokeColor}
                strokeWidth={isSimulating ? 3 : 2}
                fill="none"
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s ease' }}
              />
            );
          })}
          {wiringStartId && (
             (() => {
               const startNode = data.nodes.find(n => n.id === wiringStartId);
               if (!startNode) return null;
               return (
                  <path
                      d={`M ${startNode.x+24} ${startNode.y+24} L ${mousePos.x} ${mousePos.y}`}
                      stroke={theme === 'dark' ? "#facc15" : "#eab308"}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      fill="none"
                  />
               );
             })()
          )}
        </svg>

        {/* Nodes */}
        {data.nodes.map((node) => {
            const isPowered = simulationResult?.isPowered.has(node.id) ?? false;
            const isSelected = selectedNodeId === node.id;
            let ring = isSelected ? "ring-2 ring-yellow-400" : "border border-slate-300 dark:border-slate-600";
            if (isSimulating && isPowered) ring = "ring-1 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]";
            
            const iconColor = (isSimulating && isPowered) 
                ? (node.type === 'led' ? 'text-red-500' : node.type === 'source' ? 'text-green-500' : 'text-cyan-400')
                : (theme === 'dark' ? 'text-slate-300' : 'text-slate-700');

            return (
            <div
                key={node.id}
                // Interaction is handled by the container mostly, but we capture mouse up here for wiring completion
                onMouseUp={(e) => handleNodeUp(e, node.id)}
                onTouchEnd={(e) => handleNodeUp(e, node.id)}
                className={`absolute flex flex-col items-center justify-center group z-10`}
                style={{ left: node.x, top: node.y, width: 48, height: 48 }}
            >
                <div className={`w-12 h-12 flex items-center justify-center relative rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} ${ring} shadow-sm transition-all`}>
                    {getNodeIcon(node, iconColor)}
                </div>

                <div className="absolute -bottom-8 flex flex-col items-center pointer-events-none">
                     <span className={`text-[10px] font-bold font-mono px-1 rounded ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {node.label}
                     </span>
                     {node.value && (
                        <span className="text-[9px] font-mono text-slate-500">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill={collab.color}>
                    <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" stroke="white" strokeWidth="2"/>
                </svg>
                <span className="absolute left-4 top-0 bg-slate-900 text-white text-[10px] px-1 rounded opacity-70">{collab.username}</span>
             </div>
        ))}
      </div>
      
      {renderMultimeter()}

      {/* HUD Controls */}
      <div className="absolute bottom-6 left-4 right-4 flex justify-between pointer-events-none">
          <div className="pointer-events-auto flex gap-2">
             {/* Mode Toggle */}
             <div className="bg-white dark:bg-slate-800 p-1 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex mr-2">
                <button 
                    onClick={() => setInteractionMode('select')}
                    className={`p-2 rounded-md transition-colors ${interactionMode === 'select' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`}
                    title="Select / Drag Mode"
                >
                    <MousePointer2 size={16} />
                </button>
                <button 
                    onClick={() => setInteractionMode('wire')}
                    className={`p-2 rounded-md transition-colors ${interactionMode === 'wire' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`}
                    title="Wiring Mode (Click start node then end node)"
                >
                    <Cable size={16} />
                </button>
             </div>

             <button onClick={() => setView(v => ({ ...v, zoom: Math.max(v.zoom - 0.2, 0.4) }))} className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">
                 <Minus size={16} className="text-slate-600 dark:text-slate-300" />
             </button>
             <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-xs font-mono flex items-center text-slate-500">
                 {Math.round(view.zoom * 100)}%
             </div>
             <button onClick={() => setView(v => ({ ...v, zoom: Math.min(v.zoom + 0.2, 3) }))} className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">
                 <Plus size={16} className="text-slate-600 dark:text-slate-300" />
             </button>
          </div>
          
          {wiringStartId && (
             <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse border border-yellow-200 dark:border-yellow-800">
                 Select target to connect
             </div>
          )}
      </div>
      
      {/* Empty State */}
       {data.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center max-w-xs shadow-xl">
                   <div className="bg-cyan-100 dark:bg-cyan-900/30 p-3 rounded-full inline-flex mb-3 text-cyan-600 dark:text-cyan-400">
                     <Plus size={24} />
                   </div>
                   <h3 className="font-bold text-slate-900 dark:text-white mb-1">Start Building</h3>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Drag components or ask AI to generate a circuit.</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default CircuitVisualizer;
