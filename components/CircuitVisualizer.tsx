
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CircuitData, CircuitNode, CircuitConnection } from '../types';
import { Battery, Zap, Box, Component, Cpu, Triangle, Circle, ToggleLeft, ToggleRight, Trash2, MousePointer2, Move } from 'lucide-react';

interface Props {
  data: CircuitData;
  isSimulating: boolean;
  poweredNodes: Set<string>;
  onUpdate: (data: CircuitData) => void;
}

const GRID_SIZE = 20;

const CircuitVisualizer: React.FC<Props> = ({ data, isSimulating, poweredNodes, onUpdate }) => {
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
      label: type.charAt(0).toUpperCase() + type.slice(1),
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

  // Smart Wire Routing Algorithm
  // 1. Determines dynamic start/end ports (Top, Right, Bottom, Left) based on relative positions
  // 2. Adds jitter to overlapping wires to prevent visual merging
  // 3. Uses Bezier curves with control points extending perpendicular to ports
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
    
    // Port definitions relative to center
    const ports = {
        top: { x: 0, y: -HALF_SIZE, dx: 0, dy: -1 },
        right: { x: HALF_SIZE, y: 0, dx: 1, dy: 0 },
        bottom: { x: 0, y: HALF_SIZE, dx: 0, dy: 1 },
        left: { x: -HALF_SIZE, y: 0, dx: -1, dy: 0 }
    };

    // Determine optimal ports
    // Heuristic: Choose ports that face each other to minimize path length and crossing
    let sourcePortType: keyof typeof ports = 'right';
    let targetPortType: keyof typeof ports = 'left';

    if (Math.abs(dx) > Math.abs(dy)) {
         // Horizontal dominant
         if (dx > 0) { sourcePortType = 'right'; targetPortType = 'left'; }
         else { sourcePortType = 'left'; targetPortType = 'right'; }
    } else {
         // Vertical dominant
         if (dy > 0) { sourcePortType = 'bottom'; targetPortType = 'top'; }
         else { sourcePortType = 'top'; targetPortType = 'bottom'; }
    }

    const sPort = ports[sourcePortType];
    const tPort = ports[targetPortType];

    const startX = sx + sPort.x;
    const startY = sy + sPort.y;
    const endX = tx + tPort.x;
    const endY = ty + tPort.y;

    // Calculate Control Points
    const dist = Math.hypot(endX - startX, endY - startY);
    const cpLen = Math.min(dist * 0.5, 150); // Cap curvature

    // Add jitter to separate wires that might otherwise perfectly overlap
    // Simple hash from ID to make it deterministic but unique per connection
    let hash = 0;
    for (let i = 0; i < connId.length; i++) hash = ((hash << 5) - hash) + connId.charCodeAt(i);
    // Map hash to range [-10, 10] pixels
    const jitter = (Math.abs(hash) % 20) - 10;

    // Apply jitter perpendicular to the port direction
    // If horizontal (dx != 0), jitter Y. If vertical (dy != 0), jitter X.
    const cp1x = startX + (sPort.dx * cpLen) + (sPort.dy !== 0 ? jitter : 0);
    const cp1y = startY + (sPort.dy * cpLen) + (sPort.dx !== 0 ? jitter : 0);
    
    const cp2x = endX + (tPort.dx * cpLen) + (tPort.dy !== 0 ? jitter : 0);
    const cp2y = endY + (tPort.dy * cpLen) + (tPort.dx !== 0 ? jitter : 0);

    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
  };

  // Temp wire for dragging state
  const getTempWirePath = (source: CircuitNode, mouseX: number, mouseY: number) => {
     const NODE_SIZE = 48;
     const sx = source.x + NODE_SIZE/2;
     const sy = source.y + NODE_SIZE/2;
     
     const dx = mouseX - sx;
     const dy = mouseY - sy;
     
     // Simple directionality
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
      const activeGlow = isSimulating && isPowered ? "ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]" : "border border-slate-700 hover:border-cyan-500";
      
      let bgClass = "bg-slate-900";
      let iconColor = "text-slate-400";

      if (isSimulating && isPowered) {
         if (node.type === 'led') iconColor = "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,1)]";
         else if (node.type === 'source') iconColor = "text-green-400";
         else iconColor = "text-cyan-300";
      } else {
         switch (node.type) {
           case 'source': iconColor = "text-green-600"; break;
           case 'led': iconColor = "text-red-900"; break;
           case 'resistor': iconColor = "text-orange-700"; break;
           case 'capacitor': iconColor = "text-yellow-700"; break;
           case 'ground': iconColor = "text-slate-600"; break;
           case 'switch': iconColor = "text-blue-600"; break;
           default: iconColor = "text-slate-500";
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
      case 'transistor': return <Triangle className={`${className} rotate-90`} size={size} />;
      case 'ic': return <Cpu className={className} size={size} />;
      case 'ground': return <Circle className={className} size={size} />;
      case 'switch': return node.value === 'closed' 
          ? <ToggleRight className={className} size={size} /> 
          : <ToggleLeft className={className} size={size} />;
      default: return <Box className={className} size={size} />;
    }
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full bg-slate-950 overflow-hidden select-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
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
        {/* Background Grid (Infinite feel) */}
        <div className="absolute -inset-[5000px] opacity-20 pointer-events-none z-0" 
             style={{ 
               backgroundImage: 'radial-gradient(#475569 1.5px, transparent 1.5px)', 
               backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` 
             }}>
        </div>
        
        {/* Wires Layer - Simplified to standard full overlay with visible overflow */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
          {data.connections.map((conn) => {
            const source = data.nodes.find(n => n.id === conn.sourceId);
            const target = data.nodes.find(n => n.id === conn.targetId);
            if (!source || !target) return null;

            const isWirePowered = isSimulating && poweredNodes.has(source.id) && poweredNodes.has(target.id);
            const pathD = getSmartWirePath(source, target, conn.id);
            
            return (
              <g key={conn.id}>
                 {/* Shadow for depth */}
                 <path
                    d={pathD}
                    stroke="#0f172a"
                    strokeWidth={isWirePowered ? 6 : 4}
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.5"
                 />
                 {/* Main Wire */}
                 <path
                    d={pathD}
                    stroke={isWirePowered ? "#22d3ee" : "#475569"}
                    strokeWidth={isWirePowered ? 3 : 2}
                    fill="none"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                    style={{ filter: isWirePowered ? 'drop-shadow(0 0 4px #22d3ee)' : 'none' }}
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
                      stroke="#facc15"
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
                <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-slate-600 border-dashed scale-125 pointer-events-none transition-all" />

                <div className={`relative rounded-full p-2 w-12 h-12 flex items-center justify-center ${styles.container}`}>
                    {getNodeIcon(node, styles.icon)}
                    
                    {/* Delete Action (Hover) */}
                    {!isSimulating && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 scale-75 transition-all cursor-pointer bg-red-900 rounded-full p-1 border border-red-700 hover:bg-red-700">
                            <Trash2 size={12} className="text-white" />
                        </div>
                    )}
                </div>

                {/* Professional Label */}
                <div className="absolute -bottom-8 bg-slate-900/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-700 whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <span className="font-bold text-white">{node.label}</span>
                    {node.value && <span className="text-cyan-400 ml-1">| {node.value}</span>}
                </div>
            </div>
            );
        })}
      </div>

      {/* HUD / Controls Overlay */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none z-20">
          <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-400 shadow-xl">
             ZOOM: {Math.round(view.zoom * 100)}%
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-400 shadow-xl">
             X: {Math.round(mousePos.x)} Y: {Math.round(mousePos.y)}
          </div>
      </div>

      {!isSimulating && (
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-700 shadow-2xl pointer-events-none z-20">
            <div className="text-xs text-slate-400 space-y-1 font-medium">
                <div className="flex items-center gap-2"><MousePointer2 size={12} /> <span>Alt + Click to Wire</span></div>
                <div className="flex items-center gap-2"><Move size={12} /> <span>Space + Drag to Pan</span></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CircuitVisualizer;
