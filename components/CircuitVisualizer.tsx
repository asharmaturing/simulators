
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CircuitData, CircuitNode, CircuitConnection, Collaborator } from '../types';
import { Battery, Zap, Box, Component, Cpu, Triangle, Circle, ToggleLeft, ToggleRight, Trash2, MousePointer2, Move, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  data: CircuitData;
  isSimulating: boolean;
  poweredNodes: Set<string>;
  onUpdate: (data: CircuitData) => void;
  theme?: 'dark' | 'light';
  collaborators?: Map<string, Collaborator>;
  onCursorMove?: (x: number, y: number) => void;
}

const GRID_SIZE = 20;

const CircuitVisualizer: React.FC<Props> = ({ 
    data, 
    isSimulating, 
    poweredNodes, 
    onUpdate, 
    theme = 'dark',
    collaborators,
    onCursorMove
}) => {
  // View State
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

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

  // --- Event Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Browser zoom override
    }
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(view.zoom * scale, 0.4), 3);
    
    // Simple center zoom for stability
    setView(v => ({ ...v, zoom: newZoom }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space+Left Click to pan
    if (e.button === 1 || (e.button === 0 && e.getModifierState('Space' as any))) {
      e.preventDefault();
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0 && !draggingNodeId && !wiringStartId) {
      // Background click - clear wiring
      setWiringStartId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Panning
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    // World Coordinates update
    const worldPos = toWorld(e.clientX, e.clientY);
    setMousePos(worldPos);

    // Emit cursor position to collaborators (throttling handled by parent or assumed low freq)
    if (onCursorMove) {
        onCursorMove(worldPos.x, worldPos.y);
    }

    // Dragging Node
    if (draggingNodeId && !isSimulating) {
      const snappedX = Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE;
      
      onUpdate({
        ...data,
        nodes: data.nodes.map(n => n.id === draggingNodeId ? { ...n, x: snappedX, y: snappedY } : n)
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
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

    // Snap to grid
    const x = Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE;

    const newNode: CircuitNode = {
      id: `n${Date.now()}`,
      type,
      label: type.replace('gate_', '').replace('transistor_', '').replace('amplifier_', '').replace('half_duplex', 'HD').replace('full_duplex', 'FD').toUpperCase(),
      x,
      y,
      value: type === 'switch' ? 'open' : type === 'source' ? '9V' : undefined
    };

    onUpdate({
      ...data,
      nodes: [...data.nodes, newNode]
    });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isPanning) return;

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

    if (e.shiftKey) {
        // Delete
        onUpdate({
            nodes: data.nodes.filter(n => n.id !== id),
            connections: data.connections.filter(c => c.sourceId !== id && c.targetId !== id)
        });
    } else if (e.altKey) {
        // Start wiring
        setWiringStartId(id);
    } else {
        // Start dragging
        setDraggingNodeId(id);
    }
  };

  const handleNodeMouseUp = (e: React.MouseEvent, targetId: string) => {
      e.stopPropagation();
      if (wiringStartId && wiringStartId !== targetId && !isSimulating) {
          // Prevent duplicate connections
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

  // --- Render Helpers ---

  const getSmartWirePath = (source: CircuitNode, target: CircuitNode, connId: string) => {
    const NODE_SIZE = 48;
    const HALF_SIZE = NODE_SIZE / 2;

    // Centers
    const sx = source.x + HALF_SIZE;
    const sy = source.y + HALF_SIZE;
    const tx = target.x + HALF_SIZE;
    const ty = target.y + HALF_SIZE;

    const dx = tx - sx;
    const dy = ty - sy;
    
    const ports = {
        top: { x: 0, y: -HALF_SIZE, dx: 0, dy: -1 },
        right: { x: HALF_SIZE, y: 0, dx: 1, dy: 0 },
        bottom: { x: 0, y: HALF_SIZE, dx: 0, dy: 1 },
        left: { x: -HALF_SIZE, y: 0, dx: -1, dy: 0 }
    };

    let sourcePortType: keyof typeof ports = 'right';
    let targetPortType: keyof typeof ports = 'left';

    if (Math.abs(dx) > Math.abs(dy)) {
         if (dx > 0) { sourcePortType = 'right'; targetPortType = 'left'; }
         else { sourcePortType = 'left'; targetPortType = 'right'; }
    } else {
         if (dy > 0) { sourcePortType = 'bottom'; targetPortType = 'top'; }
         else { sourcePortType = 'top'; targetPortType = 'bottom'; }
    }

    const sPort = ports[sourcePortType];
    const tPort = ports[targetPortType];

    const startX = sx + sPort.x;
    const startY = sy + sPort.y;
    const endX = tx + tPort.x;
    const endY = ty + tPort.y;

    const dist = Math.hypot(endX - startX, endY - startY);
    const cpLen = Math.min(dist * 0.5, 150);

    let hash = 0;
    for (let i = 0; i < connId.length; i++) hash = ((hash << 5) - hash) + connId.charCodeAt(i);
    const jitter = (Math.abs(hash) % 20) - 10;

    const cp1x = startX + (sPort.dx * cpLen) + (sPort.dy !== 0 ? jitter : 0);
    const cp1y = startY + (sPort.dy * cpLen) + (sPort.dx !== 0 ? jitter : 0);
    
    const cp2x = endX + (tPort.dx * cpLen) + (tPort.dy !== 0 ? jitter : 0);
    const cp2y = endY + (tPort.dy * cpLen) + (tPort.dx !== 0 ? jitter : 0);

    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
  };

  const getTempWirePath = (source: CircuitNode, mouseX: number, mouseY: number) => {
     const NODE_SIZE = 48;
     const sx = source.x + NODE_SIZE/2;
     const sy = source.y + NODE_SIZE/2;
     
     const dx = mouseX - sx;
     const dy = mouseY - sy;
     
     const dirX = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0;
     const dirY = Math.abs(dx) <= Math.abs(dy) ? (dy > 0 ? 1 : -1) : 0;

     const startX = sx + (dirX * NODE_SIZE/2);
     const startY = sy + (dirY * NODE_SIZE/2);
     
     const cp1x = startX + dirX * 50;
     const cp1y = startY + dirY * 50;
     
     return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${mouseX} ${mouseY}, ${mouseX} ${mouseY}`;
  };

  const getNodeStyles = (node: CircuitNode, isPowered: boolean) => {
      const baseClass = "transition-all duration-300 shadow-lg";
      
      let activeGlow = "";
      if (theme === 'dark') {
         activeGlow = isSimulating && isPowered ? "ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]" : "border border-slate-700 hover:border-cyan-500";
      } else {
         activeGlow = isSimulating && isPowered ? "ring-2 ring-cyan-600 shadow-[0_0_15px_rgba(8,145,178,0.4)]" : "border border-slate-300 hover:border-cyan-600";
      }

      let bgClass = theme === 'dark' ? "bg-slate-900" : "bg-white";
      let iconColor = "";

      if (isSimulating && isPowered) {
         if (node.type === 'led') iconColor = "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,1)]";
         else if (node.type === 'source') iconColor = "text-green-500";
         else iconColor = theme === 'dark' ? "text-cyan-300" : "text-cyan-600";
      } else {
         // Unpowered states
         switch (node.type) {
           case 'source': iconColor = theme === 'dark' ? "text-green-600" : "text-green-700"; break;
           case 'led': iconColor = theme === 'dark' ? "text-red-900" : "text-red-300"; break;
           case 'resistor': iconColor = theme === 'dark' ? "text-orange-700" : "text-orange-600"; break;
           case 'capacitor': iconColor = theme === 'dark' ? "text-yellow-700" : "text-yellow-600"; break;
           case 'ground': iconColor = theme === 'dark' ? "text-slate-600" : "text-slate-500"; break;
           case 'switch': iconColor = theme === 'dark' ? "text-blue-600" : "text-blue-600"; break;
           case 'amplifier_half_duplex':
           case 'amplifier_full_duplex': iconColor = theme === 'dark' ? "text-purple-400" : "text-purple-600"; break;
           default: iconColor = theme === 'dark' ? "text-slate-500" : "text-slate-400";
         }
      }
      
      return { container: `${baseClass} ${activeGlow} ${bgClass}`, icon: iconColor };
  };

  const getNodeIcon = (node: CircuitNode, className: string) => {
    const size = 24;
    switch (node.type) {
      case 'source': return <Battery className={className} size={size} />;
      case 'resistor': return <Box className={className} size={size} />;
      case 'capacitor': return <Component className={className} size={size} />;
      case 'led': return <Zap className={className} size={size} fill={isSimulating && poweredNodes.has(node.id) ? "currentColor" : "none"} />;
      case 'ground': return <Circle className={className} size={size} />;
      case 'switch': return node.value === 'closed' 
          ? <ToggleRight className={className} size={size} /> 
          : <ToggleLeft className={className} size={size} />;
      
      // Advanced Components (SVGs)
      case 'transistor':
      case 'transistor_npn':
         return (
             <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                 <circle cx="12" cy="12" r="9" />
                 <path d="M12 6V12H6" />
                 <path d="M12 12L18 8" />
                 <path d="M12 12L18 16" />
                 {/* Arrow on Emitter (NPN) points out */}
                 <path d="M18 16L15 16" strokeLinecap="round"/> 
                 <path d="M18 16L17 13" strokeLinecap="round"/>
             </svg>
         );
      case 'transistor_pnp':
          return (
              <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 6V12H6" />
                  <path d="M12 12L18 8" />
                  <path d="M12 12L18 16" />
                  {/* Arrow on Emitter (PNP) points in */}
                  <path d="M15 10L12 12" strokeLinecap="round"/>
                  <path d="M14 14L12 12" strokeLinecap="round"/>
              </svg>
          );
      case 'gate_and':
         return (
            <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M6 5V19H12C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5H6Z" />
                 <line x1="2" y1="8" x2="6" y2="8" />
                 <line x1="2" y1="16" x2="6" y2="16" />
                 <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
         );
      case 'gate_or':
        return (
            <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M5 5C5 5 8 8 8 12C8 16 5 19 5 19C8 19 16 19 19 12C16 5 8 5 5 5Z" />
                 <line x1="2" y1="8" x2="6" y2="8" />
                 <line x1="2" y1="16" x2="6" y2="16" />
                 <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
         );
      case 'gate_not':
         return (
             <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M5 5L19 12L5 19V5Z" />
                 <circle cx="20" cy="12" r="2" />
             </svg>
         );
      case 'gate_xor':
         return (
             <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M6 5C6 5 9 8 9 12C9 16 6 19 6 19C9 19 17 19 20 12C17 5 9 5 6 5Z" />
                 <path d="M2 5C2 5 5 8 5 12C5 16 2 19 2 19" />
                 <line x1="19" y1="12" x2="22" y2="12" />
             </svg>
         );
      case 'd_flip_flop':
         return (
             <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                 <rect x="4" y="4" width="16" height="16" rx="2" />
                 <text x="8" y="10" fontSize="6" fill="currentColor" stroke="none">D</text>
                 <text x="8" y="18" fontSize="6" fill="currentColor" stroke="none">></text>
                 <text x="15" y="10" fontSize="6" fill="currentColor" stroke="none">Q</text>
             </svg>
         );
      case 'seven_segment':
         return (
             <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                 <rect x="5" y="4" width="14" height="16" rx="1" />
                 <path d="M8 7H16" strokeWidth="1" />
                 <path d="M8 12H16" strokeWidth="1" />
                 <path d="M8 17H16" strokeWidth="1" />
                 <path d="M16 7V12" strokeWidth="1" />
                 <path d="M16 12V17" strokeWidth="1" />
                 <path d="M8 7V12" strokeWidth="1" />
                 <path d="M8 12V17" strokeWidth="1" />
             </svg>
         );
      case 'amplifier_half_duplex':
        return (
            <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 7 L2 17 L10 12 Z" fill="currentColor" fillOpacity="0.2" />
                <path d="M22 7 L22 17 L14 12 Z" fill="currentColor" fillOpacity="0.2" />
                <path d="M2 7 L2 17 L10 12 Z" />
                <path d="M22 7 L22 17 L14 12 Z" />
            </svg>
        );
      case 'amplifier_full_duplex':
        return (
            <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6 L2 12 L10 9 Z" fill="currentColor" fillOpacity="0.2" />
                <line x1="10" y1="9" x2="22" y2="9" strokeWidth="1.5"/>
                <path d="M2 6 L2 12 L10 9 Z" />
                <path d="M22 18 L22 12 L14 15 Z" fill="currentColor" fillOpacity="0.2" />
                <line x1="14" y1="15" x2="2" y2="15" strokeWidth="1.5"/>
                <path d="M22 18 L22 12 L14 15 Z" />
            </svg>
        );
      case 'ic': 
      default: return <Cpu className={className} size={size} />;
    }
  };

  // Theme colors for rendering SVG
  const gridDotColor = theme === 'dark' ? '#475569' : '#cbd5e1'; // slate-600 vs slate-300
  const wireStrokeBase = theme === 'dark' ? '#475569' : '#94a3b8'; // slate-600 vs slate-400
  const wireStrokeActive = theme === 'dark' ? '#22d3ee' : '#0891b2'; // cyan-400 vs cyan-600
  const wireShadowActive = theme === 'dark' ? 'drop-shadow(0 0 4px #22d3ee)' : 'drop-shadow(0 0 4px rgba(8, 145, 178, 0.5))';

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'} ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
    >
      {/* Canvas Layer with Zoom/Pan Transform */}
      <div 
        style={{ 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%'
        }}
        className="relative transition-transform duration-75 ease-out"
      >
        {/* Background Grid */}
        <div className="absolute -inset-[5000px] opacity-20 pointer-events-none z-0" 
             style={{ 
               backgroundImage: `radial-gradient(${gridDotColor} 1.5px, transparent 1.5px)`, 
               backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` 
             }}>
        </div>
        
        {/* Wires Layer */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
          {data.connections.map((conn) => {
            const source = data.nodes.find(n => n.id === conn.sourceId);
            const target = data.nodes.find(n => n.id === conn.targetId);
            if (!source || !target) return null;

            const isWirePowered = isSimulating && poweredNodes.has(source.id) && poweredNodes.has(target.id);
            const pathD = getSmartWirePath(source, target, conn.id);
            
            return (
              <g key={conn.id}>
                 {/* Shadow/Outline for depth/visibility */}
                 <path
                    d={pathD}
                    stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
                    strokeWidth={isWirePowered ? 6 : 5}
                    fill="none"
                    strokeLinecap="round"
                    opacity={theme === 'dark' ? 0.5 : 0.8}
                 />
                 {/* Main Wire */}
                 <path
                    d={pathD}
                    stroke={isWirePowered ? wireStrokeActive : wireStrokeBase}
                    strokeWidth={isWirePowered ? 3 : 2}
                    fill="none"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                    style={{ filter: isWirePowered ? wireShadowActive : 'none' }}
                  />
              </g>
            );
          })}
          {/* Temporary Wiring Line */}
          {wiringStartId && (
             (() => {
               const startNode = data.nodes.find(n => n.id === wiringStartId);
               if (!startNode) return null;
               return (
                  <path
                      d={getTempWirePath(startNode, mousePos.x, mousePos.y)}
                      stroke={theme === 'dark' ? "#facc15" : "#eab308"}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      fill="none"
                      className="animate-pulse"
                  />
               );
             })()
          )}
        </svg>

        {/* Nodes Layer */}
        {data.nodes.map((node) => {
            const isPowered = poweredNodes.has(node.id);
            const styles = getNodeStyles(node, isPowered);

            return (
            <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                className={`absolute flex flex-col items-center justify-center group z-10`}
                style={{ 
                    left: node.x, 
                    top: node.y, 
                    width: 48, 
                    height: 48,
                }}
            >
                {/* Connection Points Hint */}
                <div className={`absolute inset-0 rounded-full border-2 border-transparent ${theme === 'dark' ? 'group-hover:border-slate-600' : 'group-hover:border-slate-300'} border-dashed scale-125 pointer-events-none transition-all`} />

                <div className={`relative rounded-full p-2 w-12 h-12 flex items-center justify-center ${styles.container}`}>
                    {getNodeIcon(node, styles.icon)}
                    
                    {/* Delete Action (Hover) */}
                    {!isSimulating && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 scale-75 transition-all cursor-pointer bg-red-600 rounded-full p-1 border border-red-400 hover:bg-red-500 shadow-sm">
                            <Trash2 size={12} className="text-white" />
                        </div>
                    )}
                </div>

                {/* Professional Label */}
                <div className={`absolute -bottom-8 ${theme === 'dark' ? 'bg-slate-900/90 text-slate-300 border-slate-700' : 'bg-white/90 text-slate-700 border-slate-200'} backdrop-blur px-2 py-1 rounded text-[10px] font-mono border whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20`}>
                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{node.label}</span>
                    {node.value && <span className={`${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} ml-1`}>| {node.value}</span>}
                </div>
            </div>
            );
        })}

        {/* REMOTE CURSORS & TAGS OVERLAY */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
            {collaborators && Array.from(collaborators.values()).map((collab: Collaborator) => (
                 <div 
                    key={collab.id}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${collab.x}px, ${collab.y}px)`,
                        transition: 'transform 0.1s linear'
                    }}
                 >
                    {/* Cursor Arrow */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: collab.color, filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))' }}>
                        <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="currentColor" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    
                    {/* Pill Tag */}
                    <div className="absolute left-4 top-4 flex items-center gap-2 px-2 py-1 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: collab.color }} />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{collab.username}</span>
                    </div>
                 </div>
            ))}
        </div>
      </div>

      {/* HUD / Footer Stats */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
          {/* Zoom & Coords */}
          <div className="flex items-center gap-3">
             <div className={`backdrop-blur px-4 py-2 rounded-full border flex items-center gap-3 font-mono text-sm shadow-lg ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-600'}`}>
                 <span className="font-bold text-cyan-500">Z: {Math.round(view.zoom * 100)}%</span>
                 <span className="w-px h-4 bg-slate-600/30"></span>
                 <span>X: {Math.round(mousePos.x).toString().padStart(4, ' ')}</span>
                 <span>Y: {Math.round(mousePos.y).toString().padStart(4, ' ')}</span>
             </div>
             
             {/* Status Indicator */}
             <div className={`backdrop-blur px-4 py-2 rounded-full border flex items-center gap-2 font-medium text-sm shadow-lg ${
                 isSimulating 
                    ? 'bg-green-500/10 border-green-500/30 text-green-500' 
                    : (theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-white/80 border-slate-200 text-slate-500')
             }`}>
                 {isSimulating ? <Activity size={14} className="animate-pulse" /> : <CheckCircle2 size={14} />}
                 {isSimulating ? 'Running...' : 'Ready'}
             </div>
          </div>
      </div>

      {/* Instruction Overlay (Top Center, Transient feel) */}
      {!isSimulating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none z-20 opacity-80 hover:opacity-100 transition-opacity">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm text-xs font-medium backdrop-blur-md ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white/50 border-slate-200 text-slate-600'}`}>
                <div className="bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-[10px]">Alt</div>
                <span>+ Click to Wire</span>
             </div>
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm text-xs font-medium backdrop-blur-md ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white/50 border-slate-200 text-slate-600'}`}>
                <div className="bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-[10px]">Space</div>
                <span>+ Drag to Move</span>
             </div>
        </div>
      )}
    </div>
  );
};

export default CircuitVisualizer;
