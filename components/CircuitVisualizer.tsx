
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CircuitData, CircuitNode, CircuitConnection, Collaborator, SimulationResult } from '../types';
import { Trash2, Activity, Gauge, Plus, Minus, AlertTriangle, CheckCircle2, Flame, Zap, MousePointer2, Cable, Maximize, CloudFog } from 'lucide-react';

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
      // Threshold for being "active"
      const isActive = isSimulating && current > 1e-6; 
      
      let color = theme === 'dark' ? '#334155' : '#cbd5e1'; // Default inactive slate
      let width = 2;
      let animSpeed = 0;

      if (isSimulating) {
          if (visualizationMode === 'voltage') {
              // Get average voltage on the wire
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
              width = 4; // Thicker wires in voltage mode for visibility
          } else {
              // Current Mode: Color buckets + Thickness
              if (current < 1e-6) color = theme === 'dark' ? '#1e293b' : '#cbd5e1';
              else if (current < 0.01) color = '#60a5fa'; // Blue (<10mA)
              else if (current < 0.1) color = '#facc15'; // Yellow (<100mA)
              else color = '#ef4444'; // Red (>100mA)

              // Dynamic width: 2px to 8px based on current
              width = Math.min(8, Math.max(2, current * 50 + 2));
          }

          // Animation Speed Logic
          // Speed is proportional to current
          if (isActive) {
             // Clamp speed factor to avoid too fast/slow animations
             const speedFactor = Math.max(0.2, Math.min(5, current * 100)); 
             animSpeed = 1.0 / speedFactor; 
          }
      }

      return { color, width, animSpeed, isActive };
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
        onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.button, false, { alt: e.altKey, shift: e.shift