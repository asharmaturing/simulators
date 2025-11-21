
import React, { useState, useRef, useCallback } from 'react';
import { CircuitData, CircuitNode, CircuitConnection, Collaborator, SimulationResult } from '../types';
import { Trash2, Activity, CheckCircle2, Gauge, Plus, Minus } from 'lucide-react';

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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Interaction State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [wiringStartId, setWiringStartId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // World coordinates
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Coordinate Helpers ---

  const toWorld = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom
    };
  }, [view]);

  // --- Event Handlers (Unified Mouse & Touch) ---

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Browser zoom override
    }
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(view.zoom * scale, 0.4), 3);
    
    // Simple center zoom for stability
    setView(v => ({ ...v, zoom: newZoom }));
  };

  const handleStart = (clientX: number, clientY: number, button: number = 0, isTouch = false) => {
    // Middle click or Space+Left Click (or 2-finger touch logic handled separately) to pan
    if (button === 1) {
      setIsPanning(true);
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    const worldPos = toWorld(clientX, clientY);
    
    // Check if we clicked a node
    // Simple hit testing against nodes
    const hitNode = data.nodes.find(n => 
        worldPos.x >= n.x && worldPos.x <= n.x + 48 &&
        worldPos.y >= n.y && worldPos.y <= n.y + 48
    );

    if (hitNode) {
        handleNodeDown(hitNode.id, isTouch);
    } else {
        // Background click
        if (!draggingNodeId && !wiringStartId) {
             setWiringStartId(null);
             setSelectedNodeId(null);
             // Start panning on background drag for mobile, or middle click on desktop
             // For simplicity, background drag = pan on touch
             if (isTouch) {
                 setIsPanning(true);
                 setLastMousePos({ x: clientX, y: clientY });
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

    if (onCursorMove) {
        onCursorMove(worldPos.x, worldPos.y);
    }

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
    // Note: Wiring end logic is handled in handleNodeUp
  };

  // Mouse Wrappers
  const onMouseDown = (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY, e.button);
  };
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();

  // Touch Wrappers
  const onTouchStart = (e: React.TouchEvent) => {
      // Prevent default to stop scrolling/zooming browser
      // e.preventDefault(); 
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, 0, true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
      // e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
  };
  const onTouchEnd = () => handleEnd();

  // --- Node Interaction ---

  const handleNodeDown = (id: string, isTouch: boolean) => {
    if (isPanning) return;
    
    setSelectedNodeId(id);

    if (isSimulating) {
        const node = data.nodes.find(n => n.id === id);
        if (node?.type === 'switch') {
            const newValue = node.value === 'closed' ? 'open' : 'closed';
            onUpdate({
                ...data,
                nodes: data.nodes.map(n => n.id === id ? { ...n, value: newValue } : n)
            });
        }
        return;
    }

    setDraggingNodeId(id);
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
            onUpdate({
                ...data,
                connections: [...data.connections, newConn]
            });
          }
          setWiringStartId(null);
      } else if (wiringStartId === targetId) {
          setWiringStartId(null);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
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

    onUpdate({
      ...data,
      nodes: [...data.nodes, newNode]
    });
  };

  // --- Render Helpers ---

  const getSmartWirePath = (source: CircuitNode, target: CircuitNode, connId: string) => {
    const NODE_SIZE = 48;
    const HALF = NODE_SIZE / 2;

    const sx = source.x + HALF;
    const sy = source.y + HALF;
    const tx = target.x + HALF;
    const ty = target.y + HALF;

    const dx = tx - sx;
    const dy = ty - sy;
    
    // Ports logic (simplified to 4 cardinal directions)
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

  // --- Node Styling & Icons ---
  const getNodeStyles = (node: CircuitNode, isPowered: boolean) => {
      const isSelected = selectedNodeId === node.id;
      
      let ring = "";
      if (isSelected) ring = "ring-2 ring-yellow-400 dark:ring-yellow-500";
      else if (isSimulating && isPowered) ring = "ring-1 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]";
      else ring = "border border-slate-300 dark:border-slate-600 hover:border-sky-400";

      const bg = theme === 'dark' ? "bg-slate-800" : "bg-white";
      
      // Dynamic text color based on simulation
      let color = theme === 'dark' ? "text-slate-200" : "text-slate-700";
      if (isSimulating && isPowered) {
         if (node.type === 'led') color = "text-red-500";
         else if (node.type === 'source') color = "text-green-500";
         else color = "text-cyan-400";
      }

      return { 
          container: `relative rounded-lg ${bg} ${ring} transition-all duration-200 shadow-sm`, 
          icon: color 
      };
  };

  // SCHEMATIC SYMBOLS (Standard SVG Paths)
  const getNodeIcon = (node: CircuitNode, className: string) => {
    const size = 28; 
    const strokeWidth = 2;

    const SvgContainer = ({ children }: { children: React.ReactNode }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            {children}
        </svg>
    );

    switch (node.type) {
      case 'source': // Battery
        return (
            <SvgContainer>
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="6" y1="5" x2="6" y2="19" /> {/* Long */}
                <line x1="10" y1="8" x2="10" y2="16" /> {/* Short */}
                <line x1="14" y1="5" x2="14" y2="19" /> {/* Long */}
                <line x1="18" y1="8" x2="18" y2="16" /> {/* Short */}
            </SvgContainer>
        );
      case 'ground':
        return (
            <SvgContainer>
                <line x1="12" y1="2" x2="12" y2="12" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="7" y1="16" x2="17" y2="16" />
                <line x1="10" y1="20" x2="14" y2="20" />
            </SvgContainer>
        );
      case 'resistor': // Zig-Zag
        return (
            <SvgContainer>
                <path d="M2 12 H6 L8 7 L12 17 L16 7 L18 12 H22" />
            </SvgContainer>
        );
      case 'capacitor': // Parallel Plates
        return (
            <SvgContainer>
                <line x1="2" y1="12" x2="9" y2="12" />
                <line x1="15" y1="12" x2="22" y2="12" />
                <line x1="9" y1="5" x2="9" y2="19" />
                <line x1="15" y1="5" x2="15" y2="19" />
            </SvgContainer>
        );
      case 'inductor': // Coils
         return (
            <SvgContainer>
                <path d="M2 12 H5 C 5 12, 5 5, 9 5 C 13 5, 13 12, 13 12 C 13 12, 13 5, 17 5 C 21 5, 21 12, 21 12 H22" />
            </SvgContainer>
         );
      case 'led': // Diode + Arrows
        return (
            <SvgContainer>
                 <line x1="2" y1="12" x2="7" y2="12" />
                 <line x1="17" y1="12" x2="22" y2="12" />
                 {/* Diode Triangle */}
                 <path d="M7 7 L17 12 L7 17 V7 Z" fill="currentColor" fillOpacity="0.1" />
                 <line x1="17" y1="7" x2="17" y2="17" />
                 {/* Arrows */}
                 <path d="M15 5 L18 2" />
                 <path d="M18 2 L16 2" />
                 <path d="M18 2 L18 4" />
                 <path d="M18 8 L21 5" />
            </SvgContainer>
        );
      case 'switch':
        return (
            <SvgContainer>
                <circle cx="3" cy="12" r="2" fill="currentColor" stroke="none" />
                <circle cx="21" cy="12" r="2" fill="currentColor" stroke="none" />
                {node.value === 'closed' 
                    ? <line x1="3" y1="12" x2="21" y2="12" />
                    : <line x1="3" y1="12" x2="18" y2="4" />
                }
            </SvgContainer>
        );
      case 'transistor':
      case 'transistor_npn':
         return (
             <SvgContainer>
                 <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                 <line x1="2" y1="12" x2="8" y2="12" />
                 <line x1="8" y1="6" x2="8" y2="18" strokeWidth="2.5" />
                 <line x1="8" y1="10" x2="16" y2="4" />
                 <line x1="8" y1="14" x2="16" y2="20" />
                 <path d="M16 20 L13 19.5" /> {/* NPN Out */}
                 <path d="M16 20 L14 17.5" />
             </SvgContainer>
         );
       case 'transistor_pnp':
         return (
             <SvgContainer>
                 <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                 <line x1="2" y1="12" x2="8" y2="12" />
                 <line x1="8" y1="6" x2="8" y2="18" strokeWidth="2.5" />
                 <line x1="8" y1="10" x2="16" y2="4" />
                 <line x1="8" y1="14" x2="16" y2="20" />
                 <path d="M11.5 16.5 L10 15.5" /> {/* PNP In */}
                 <path d="M11.5 16.5 L13 15.5" />
             </SvgContainer>
         );
      case 'gate_and': // D-Shape
         return (
            <SvgContainer>
                 <path d="M4 5 H 10 C 16 5, 18 8, 18 12 C 18 16, 16 19, 10 19 H 4 V 5 Z" />
                 <line x1="2" y1="8" x2="4" y2="8" />
                 <line x1="2" y1="16" x2="4" y2="16" />
                 <line x1="18" y1="12" x2="22" y2="12" />
            </SvgContainer>
         );
      case 'gate_or': // Shield
        return (
            <SvgContainer>
                 <path d="M4 5 C 4 5, 8 8, 8 12 C 8 16, 4 19, 4 19 C 10 19, 18 19, 20 12 C 18 5, 10 5, 4 5 Z" />
                 <line x1="2" y1="8" x2="5" y2="8" />
                 <line x1="2" y1="16" x2="5" y2="16" />
                 <line x1="20" y1="12" x2="22" y2="12" />
            </SvgContainer>
        );
      case 'gate_xor': // Double Shield
        return (
            <SvgContainer>
                 <path d="M7 5 C 7 5, 11 8, 11 12 C 11 16, 7 19, 7 19 C 13 19, 21 19, 21 12 C 21 5, 13 5, 7 5 Z" />
                 <path d="M3 5 C 3 5, 7 8, 7 12 C 7 16, 3 19, 3 19" fill="none" />
                 <line x1="1" y1="8" x2="3" y2="8" />
                 <line x1="1" y1="16" x2="3" y2="16" />
                 <line x1="21" y1="12" x2="23" y2="12" />
            </SvgContainer>
        );
      case 'gate_not': // Triangle + Bubble
         return (
             <SvgContainer>
                 <path d="M4 5 L16 12 L4 19 V5 Z" />
                 <circle cx="19" cy="12" r="2.5" />
                 <line x1="2" y1="12" x2="4" y2="12" />
                 <line x1="21.5" y1="12" x2="23" y2="12" />
             </SvgContainer>
         );
      default: return <Activity className={className} size={size} />;
    }
  };

  const formatEngineering = (num: number, unit: string) => {
    if (Math.abs(num) < 1e-9) return `0 ${unit}`;
    if (Math.abs(num) < 1e-6) return `${(num * 1e9).toFixed(1)} n${unit}`;
    if (Math.abs(num) < 1e-3) return `${(num * 1e6).toFixed(1)} µ${unit}`;
    if (Math.abs(num) < 1) return `${(num * 1e3).toFixed(1)} m${unit}`;
    if (Math.abs(num) >= 1000) return `${(num / 1e3).toFixed(1)} k${unit}`;
    return `${num.toFixed(2)} ${unit}`;
  };

  // --- Multimeter ---
  const renderMultimeter = () => {
    if (!isSimulating || !simulationResult || !selectedNodeId) return null;
    const node = data.nodes.find(n => n.id === selectedNodeId);
    if (!node || node.type === 'ground') return null;

    const voltage = simulationResult.nodeVoltages.get(node.id) || 0;
    const current = simulationResult.componentCurrents.get(node.id) || 0;
    const power = simulationResult.componentPower.get(node.id) || 0;

    return (
      <div className="absolute top-20 right-4 w-56 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl p-4 text-slate-200 shadow-2xl z-30">
         <div className="flex items-center justify-between mb-2 border-b border-slate-600 pb-1">
            <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-sm">
              <Gauge size={14} /> {node.label}
            </h3>
         </div>
         <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between"><span className="text-slate-400">V:</span><span className="font-bold text-green-400">{voltage.toFixed(2)} V</span></div>
            <div className="flex justify-between"><span className="text-slate-400">I:</span><span className="font-bold text-yellow-400">{formatEngineering(current, 'A')}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">P:</span><span className="font-bold text-red-400">{formatEngineering(power, 'W')}</span></div>
         </div>
      </div>
    );
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'} ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={handleWheel}
    >
      {/* Canvas Layer */}
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

            const isWirePowered = isSimulating && simulationResult?.isPowered.has(source.id) && simulationResult?.isPowered.has(target.id);
            const pathD = getSmartWirePath(source, target, conn.id);
            const strokeColor = isWirePowered 
                ? (theme === 'dark' ? '#22d3ee' : '#0891b2') 
                : (theme === 'dark' ? '#475569' : '#94a3b8');
            
            return (
              <path
                key={conn.id}
                d={pathD}
                stroke={strokeColor}
                strokeWidth={isWirePowered ? 3 : 2}
                fill="none"
                strokeLinecap="round"
                style={{ filter: isWirePowered ? 'drop-shadow(0 0 4px rgba(8,145,178,0.5))' : 'none' }}
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
            const styles = getNodeStyles(node, isPowered);
            const voltage = simulationResult?.nodeVoltages.get(node.id);

            return (
            <div
                key={node.id}
                // Mouse
                onMouseDown={(e) => { e.stopPropagation(); handleNodeDown(node.id, false); }}
                onMouseUp={(e) => { handleNodeUp(e, node.id); }}
                // Touch
                onTouchStart={(e) => { e.stopPropagation(); handleNodeDown(node.id, true); }}
                onTouchEnd={(e) => { handleNodeUp(e, node.id); }}
                
                className={`absolute flex flex-col items-center justify-center group z-10`}
                style={{ 
                    left: node.x, top: node.y, width: 48, height: 48,
                }}
            >
                <div className={`w-12 h-12 flex items-center justify-center ${styles.container}`}>
                    {getNodeIcon(node, styles.icon)}
                </div>

                {/* Hover Label or Probe */}
                <div className={`absolute -bottom-6 whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold font-mono pointer-events-none transition-opacity z-20 ${
                    isSimulating && voltage !== undefined 
                        ? 'bg-slate-800 text-yellow-400 opacity-100 shadow-lg'
                        : `opacity-0 group-hover:opacity-100 ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'} border border-slate-600`
                }`}>
                    {isSimulating && voltage !== undefined ? `${voltage.toFixed(1)}V` : node.label}
                </div>
                
                 {/* Delete Action (Hover) */}
                {!isSimulating && (
                    <div 
                        onClick={(e) => { e.stopPropagation(); onUpdate({ nodes: data.nodes.filter(n => n.id !== node.id), connections: data.connections.filter(c => c.sourceId !== node.id && c.targetId !== node.id) }) }}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 scale-75 cursor-pointer bg-red-600 rounded-full p-1 text-white shadow-sm z-30"
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
             </div>
        ))}
      </div>
      
      {renderMultimeter()}

      {/* HUD Controls */}
      <div className="absolute bottom-6 left-4 right-4 flex justify-between pointer-events-none">
          <div className="pointer-events-auto flex gap-2">
             <button onClick={() => setView(v => ({ ...v, zoom: Math.max(v.zoom - 0.2, 0.4) }))} className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                 <Minus size={16} className="text-slate-600 dark:text-slate-300" />
             </button>
             <button onClick={() => setView(v => ({ ...v, zoom: Math.min(v.zoom + 0.2, 3) }))} className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                 <Plus size={16} className="text-slate-600 dark:text-slate-300" />
             </button>
          </div>
          
          {wiringStartId && (
             <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse">
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
