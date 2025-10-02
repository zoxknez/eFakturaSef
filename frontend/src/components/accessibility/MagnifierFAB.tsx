import React, { useEffect, useRef, useState } from 'react';
import { useMagnifier } from './MagnifierProvider';

/** Plutajuće FAB dugme (draggable) za brzo paljenje lupe. */
export const MagnifierFAB: React.FC<{
  initialPos?: { right?: number; bottom?: number };
}> = ({ initialPos = { right: 20, bottom: 20 } }) => {
  const { enabled, setEnabled } = useMagnifier();
  const [pos, setPos] = useState({ right: initialPos.right ?? 20, bottom: initialPos.bottom ?? 20 });
  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean }>({ startX: 0, startY: 0, dragging: false });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      setPos((p) => ({ right: Math.max(10, p.right - (e.movementX)), bottom: Math.max(10, p.bottom - (e.movementY)) }));
    };
    const onUp = () => (dragRef.current.dragging = false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        dragRef.current.dragging = true;
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
      }}
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? 'Isključi lupu' : 'Uključi lupu'}
      style={{ position: 'fixed', right: pos.right, bottom: pos.bottom, zIndex: 2147483646 }}
      className={`rounded-full w-12 h-12 shadow-xl border-2 flex items-center justify-center transition
        ${enabled ? 'bg-blue-500 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
      `}
    >
      <span className="text-xl" aria-hidden="true">🔍</span>
    </button>
  );
};
