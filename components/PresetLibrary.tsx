
import React from 'react';
import { PRESET_CIRCUITS } from '../services/learningData';
import { CircuitData, PresetCircuit } from '../types';
import { BookOpen, Zap, Activity, BrainCircuit, X } from 'lucide-react';

interface Props {
  onLoad: (data: CircuitData) => void;
  onClose: () => void;
}

const PresetLibrary: React.FC<Props> = ({ onLoad, onClose }) => {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Beginner': return 'text-green-400 bg-green-900/20 border-green-900/30';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-900/20 border-yellow-900/30';
      case 'Advanced': return 'text-red-400 bg-red-900/20 border-red-900/30';
      default: return 'text-slate-400';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Basics': return <BookOpen size={16} />;
      case 'Control': return <Zap size={16} />;
      case 'Logic': return <BrainCircuit size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const handleLoad = (preset: PresetCircuit) => {
    // Add small random offset to IDs to avoid conflicts if loaded multiple times (though we replace canvas usually)
    // For now, we just pass the data as is, assuming a fresh load
    onLoad(JSON.parse(JSON.stringify(preset.circuit_data)));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <BookOpen className="text-cyan-400" />
              Circuit Library
            </h2>
            <p className="text-slate-400 mt-1">Choose a preset circuit to learn from and experiment with.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRESET_CIRCUITS.map((preset) => (
              <div 
                key={preset.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all group hover:shadow-lg hover:shadow-cyan-900/10 flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`text-xs px-2 py-1 rounded border font-medium ${getDifficultyColor(preset.difficulty)}`}>
                      {preset.difficulty}
                    </div>
                    <div className="text-slate-500 flex items-center gap-1 text-xs uppercase tracking-wider font-semibold">
                      {getCategoryIcon(preset.category)}
                      {preset.category}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{preset.name}</h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{preset.description}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Components</h4>
                      <div className="flex flex-wrap gap-1">
                        {preset.components.map((comp, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Learning Goals</h4>
                      <ul className="list-disc list-inside text-xs text-slate-400">
                        {preset.learningObjectives.slice(0, 2).map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/50 border-t border-slate-800">
                  <button 
                    onClick={() => handleLoad(preset)}
                    className="w-full bg-cyan-900/30 hover:bg-cyan-600 hover:text-white text-cyan-400 border border-cyan-900/50 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Zap size={16} />
                    Load Circuit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetLibrary;
