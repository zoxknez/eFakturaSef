/**
 * Keyboard Shortcuts Help Dialog
 * Shows all available keyboard shortcuts
 */
import React from 'react';
import { createPortal } from 'react-dom';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Otvori globalnu pretragu', category: 'Navigacija' },
  { keys: ['Ctrl', 'H'], description: 'Idi na početnu', category: 'Navigacija' },
  { keys: ['Ctrl', 'I'], description: 'Idi na listu faktura', category: 'Navigacija' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Idi na partnere', category: 'Navigacija' },
  { keys: ['Esc'], description: 'Zatvori modal/dijalog', category: 'Navigacija' },
  
  // Actions
  { keys: ['Ctrl', 'Shift', 'N'], description: 'Kreiraj novu fakturu', category: 'Akcije' },
  { keys: ['Ctrl', 'S'], description: 'Sačuvaj (u formama)', category: 'Akcije' },
  { keys: ['Ctrl', 'Enter'], description: 'Pošalji formu', category: 'Akcije' },
  
  // Help
  { keys: ['?'], description: 'Prikaži ovu pomoć', category: 'Pomoć' },
];

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = [...new Set(shortcuts.map(s => s.category))];

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">⌨️ Prečice na tastaturi</h2>
            <p className="text-sm text-gray-500 mt-1">Brže navigirajte kroz aplikaciju</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcuts by category */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {categories.map(category => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={key}>
                            <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-200 shadow-sm">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-400 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-gray-500 text-center">
            Pritisnite <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded">Esc</kbd> da zatvorite
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KeyboardHelp;
