
import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, Send, X, Circle } from 'lucide-react';
import { Collaborator, ChatMessage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collaborators: Map<string, Collaborator>;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: string;
}

const CollaborationPanel: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  collaborators, 
  messages, 
  onSendMessage,
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 w-80 h-[450px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col z-40 overflow-hidden transition-colors duration-300 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
        <div className="flex space-x-1 bg-slate-200 dark:bg-slate-900 p-1 rounded-lg text-xs font-medium">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 rounded-md flex items-center gap-1 transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-700 shadow text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <MessageSquare size={14} /> Chat
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1 rounded-md flex items-center gap-1 transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 shadow text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <Users size={14} /> Users ({collaborators.size + 1})
          </button>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 dark:text-slate-500 text-xs mt-10">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
              {messages.map((msg) => (
                msg.isSystem ? (
                  <div key={msg.id} className="text-center text-[10px] text-slate-400 my-2">
                    {msg.text}
                  </div>
                ) : (
                  <div key={msg.id} className={`flex flex-col ${msg.username === currentUser ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-400 ml-1 mb-0.5">{msg.username}</span>
                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      msg.username === currentUser 
                        ? 'bg-cyan-600 text-white rounded-br-none' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 dark:text-white"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto">
             <div className="flex items-center gap-3 p-2 rounded-lg bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30">
                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                    YOU
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{currentUser}</p>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                        <Circle size={6} fill="currentColor" /> Online
                    </p>
                </div>
             </div>
             
             {Array.from(collaborators.values()).map((user: Collaborator) => (
                 <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: user.color }}>
                        {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.username}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Circle size={6} fill="#22c55e" className="text-green-500" /> Active
                        </p>
                    </div>
                 </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationPanel;
