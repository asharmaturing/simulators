
import React, { useState } from 'react';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { generateCircuitDesign, analyzeCircuit } from '../services/geminiService';
import { CircuitData } from '../types';

interface Props {
  onCircuitGenerated: (data: CircuitData) => void;
  currentCircuit?: CircuitData;
  isOpen: boolean;
  onClose: () => void;
}

const AIPanel: React.FC<Props> = ({ onCircuitGenerated, currentCircuit, isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: "Hi! I'm your AI Circuit Assistant. Ask me to design a circuit or analyze your current one." }
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      if (userMsg.toLowerCase().includes('analyze') || userMsg.toLowerCase().includes('explain')) {
        if (!currentCircuit) {
          setMessages(prev => [...prev, { role: 'ai', text: "Please open a circuit first to analyze it." }]);
        } else {
          const analysis = await analyzeCircuit(currentCircuit);
          setMessages(prev => [...prev, { role: 'ai', text: analysis }]);
        }
      } else {
        const newData = await generateCircuitDesign(userMsg);
        if (newData) {
          onCircuitGenerated(newData);
          setMessages(prev => [...prev, { role: 'ai', text: `I've generated a circuit design for "${userMsg}". Check the editor!` }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: "I couldn't generate a valid circuit for that. Please try being more specific." }]);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden transition-colors duration-300">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="text-cyan-600 dark:text-cyan-400" size={20} />
          <h3 className="font-semibold text-slate-900 dark:text-white">CircuitMind AI</h3>
        </div>
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
              m.role === 'user' 
                ? 'bg-cyan-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Loader2 className="animate-spin text-cyan-600 dark:text-cyan-400" size={16} />
              <span className="text-xs text-slate-500 dark:text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Design an FM radio receiver..."
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
        />
        <button 
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIPanel;
