
import React, { useState } from 'react';
import { GUIDE_CONTENT } from '../services/learningData';
import { X, Book, ChevronRight, ChevronDown, Lightbulb } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GuidePanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'getting-started': true });

  if (!isOpen) return null;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 flex flex-col transform transition-transform duration-300 pt-16">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Book className="text-cyan-600 dark:text-cyan-400" size={20} />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Learning Guide</h2>
        </div>
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {GUIDE_CONTENT.map((chapter) => (
          <div key={chapter.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/30">
            <button 
              onClick={() => toggleSection(chapter.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-200">{chapter.title}</span>
              {expandedSections[chapter.id] ? <ChevronDown size={16} className="text-slate-500 dark:text-slate-400" /> : <ChevronRight size={16} className="text-slate-500 dark:text-slate-400" />}
            </button>
            
            {expandedSections[chapter.id] && (
              <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/50 p-4 space-y-6">
                {chapter.sections.map((section) => (
                  <div key={section.id} className="animate-fadeIn">
                    <h4 className="text-cyan-600 dark:text-cyan-400 font-medium mb-2 flex items-center gap-2">
                      <Lightbulb size={14} />
                      {section.title}
                    </h4>
                    <div 
                      className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed prose prose-slate dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Footer Hint */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Keep this panel open while you build to reference concepts.
        </p>
      </div>
    </div>
  );
};

export default GuidePanel;
