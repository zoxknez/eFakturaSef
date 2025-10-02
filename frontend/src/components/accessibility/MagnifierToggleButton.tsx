import React from 'react';
import { useMagnifier } from './MagnifierProvider';

export const MagnifierToggleButton: React.FC<{
  className?: string;
  speak?: boolean;
}> = ({ className = '', speak = true }) => {
  const { enabled, toggle, zoom, setZoom, radius, setRadius } = useMagnifier();

  const say = (text: string) => {
    if (!speak) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => {
          toggle();
          say(!enabled ? 'Lupa je uključena. Pritisni Escape za izlaz.' : 'Lupa je isključena.');
        }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border-2 shadow-sm ${
          enabled
            ? 'bg-blue-100 border-blue-400 text-blue-800'
            : 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 text-blue-700'
        }`}
        aria-pressed={enabled}
        aria-label={enabled ? 'Isključi lupu' : 'Uključi lupu'}
      >
        <span className="text-lg" aria-hidden="true">🔍</span>
        <span className="font-semibold text-sm">{enabled ? 'Isključi' : 'Lupa'}</span>
      </button>

      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-600">
          Zoom
          <input
            type="range"
            min={1.2}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="ml-2 align-middle"
            aria-label="Podesi uvećanje"
          />
          <span className="ml-2 text-xs font-medium text-gray-800">{zoom.toFixed(1)}×</span>
        </label>

        <label className="text-xs text-gray-600">
          Prečnik
          <input
            type="range"
            min={160}
            max={360}
            step={10}
            value={radius * 2}
            onChange={(e) => setRadius(parseInt(e.target.value, 10) / 2)}
            className="ml-2 align-middle"
            aria-label="Podesi prečnik sočiva"
          />
          <span className="ml-2 text-xs font-medium text-gray-800">{radius * 2}px</span>
        </label>
      </div>
    </div>
  );
};
