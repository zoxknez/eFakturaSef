import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Najbolja verzija lupe — LIVE ogledalo:
 * - Portal preko celog ekrana (pointer-events: none)
 * - Klon kompletnog target subtree-a (isti CSS, bez handlera)
 * - Pravi zoom preko transform: scale, sa preciznim poravnanjem
 * - rAF za glatko praćenje miša
 * - MutationObserver (debounce) da "živo" osvežava klon
 * - Sync scroll pozicija (najčešći slučajevi), plus window scroll offset korekcija
 * - ESC gasi; Ctrl+Alt+M toggle
 */

type MagnifierContextValue = {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
  zoom: number;
  setZoom: (z: number) => void;
  radius: number;
  setRadius: (r: number) => void;
};

const MagnifierContext = createContext<MagnifierContextValue | null>(null);
export const useMagnifier = () => {
  const ctx = useContext(MagnifierContext);
  if (!ctx) throw new Error('useMagnifier must be used within MagnifierProvider');
  return ctx;
};

type MagnifierProviderProps = PropsWithChildren<{
  /** CSS selektor korena tvoje aplikacije (preporuka: #app-root) */
  targetSelector?: string;
  /** Početni zoom (1.2–3.0 su realne vrednosti) */
  zoom?: number;
  /** Poluprečnik sočiva u px (npr. 120 = prečnik 240px) */
  radius?: number;
  /** Debounce ms za MutationObserver re-kloniranje */
  mutationDebounceMs?: number;
}>;

export const MagnifierProvider: React.FC<MagnifierProviderProps> = ({
  children,
  targetSelector = '#app-root',
  zoom: initialZoom = 2,
  radius: initialRadius = 120,
  mutationDebounceMs = 120,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [zoom, setZoom] = useState(initialZoom);
  const [radius, setRadius] = useState(initialRadius);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const portalRootRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const animRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  // Portal root
  useEffect(() => {
    const el = document.createElement('div');
    el.id = 'magnifier-portal-root';
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647', // pred svime
      pointerEvents: 'none',
      contain: 'layout style paint',
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    portalRootRef.current = el;
    return () => {
      if (document.body.contains(el)) document.body.removeChild(el);
      portalRootRef.current = null;
    };
  }, []);

  // Traži target čvor
  const resolveTarget = useCallback(() => {
    targetRef.current = document.querySelector(targetSelector) as HTMLElement | null;
  }, [targetSelector]);

  // Utility: cancel rAF
  const cancelAnim = () => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  // Utility: debounce
  const debounce = (fn: () => void, ms: number) => {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(fn, ms);
  };

  // Kloniranje targeta
  const cloneTarget = useCallback(() => {
    const lens = lensRef.current;
    const target = targetRef.current;
    if (!lens || !target) return;

    // Kloniraj subtree
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.transformOrigin = '0 0';
    clone.classList.add('magnifier-mirror');

    // Ubaci u lens
    lens.innerHTML = '';
    lens.appendChild(clone);
    mirrorRef.current = clone;

    // Preslikaj scroll pozicije (naivno, ali pokriva česte slučajeve)
    try {
      syncScrollPositions(target, clone);
    } catch {
      // No-op (bolje fail-safe nego crash)
    }
  }, []);

  // MutationObserver: re-kloniraj kad se DOM menja (debounce)
  const setupObserver = useCallback(() => {
    if (!targetRef.current) return;
    teardownObserver();

    const ob = new MutationObserver(() => {
      debounce(() => {
        cloneTarget();
        // posle re-klona opet sync scroll
        const t = targetRef.current;
        const m = mirrorRef.current;
        if (t && m) {
          try {
            syncScrollPositions(t, m);
          } catch {}
        }
      }, mutationDebounceMs);
    });

    ob.observe(targetRef.current, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    observerRef.current = ob;
  }, [cloneTarget, mutationDebounceMs]);

  const teardownObserver = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  // ESC i global hotkey (Ctrl+Alt+M)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enabled) setEnabled(false);
      if (e.key.toLowerCase() === 'm' && e.ctrlKey && e.altKey) {
        e.preventDefault();
        setEnabled((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);

  // Cursor & klasa na body
  useEffect(() => {
    if (!enabled) {
      document.body.style.cursor = '';
      document.body.classList.remove('magnifier-active');
      return;
    }
    document.body.classList.add('magnifier-active');
    document.body.style.cursor = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('magnifier-active');
    };
  }, [enabled]);

  // Praćenje miša + rAF
  useEffect(() => {
    if (!enabled) return;

    // Mouse move — pamti poslednju poziciju
    const onMove = (e: MouseEvent) => {
      // viewport coords
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    document.addEventListener('mousemove', onMove, { passive: true });

    // rAF loop — glatko ažurira poziciju i transform
    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      setMouse((prev) => {
        // lagano "lerp" za osećaj glatkoće (0.35 faktor)
        const nx = prev.x + (mouseRef.current.x - prev.x) * 0.35;
        const ny = prev.y + (mouseRef.current.y - prev.y) * 0.35;
        applyLensTransform(nx, ny);
        return { x: nx, y: ny };
      });
    };
    loop();

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnim();
    };
  }, [enabled]);

  // Interni ref za miša (bez setState jittera)
  const mouseRef = useRef({ x: 0, y: 0 });

  // Primeni transform na mirror da tačka pod kursorom bude centrirana
  const applyLensTransform = useCallback(
    (clientX: number, clientY: number) => {
      const lens = lensRef.current;
      const mirror = mirrorRef.current;
      const target = targetRef.current;
      const portal = portalRootRef.current;
      if (!lens || !mirror || !target || !portal) return;

      const r = radius;
      // Postavi sočivo (div) oko kursora
      lens.style.left = `${clientX - r}px`;
      lens.style.top = `${clientY - r}px`;
      lens.style.width = `${r * 2}px`;
      lens.style.height = `${r * 2}px`;

      // Koordinate stranice
      const pageX = clientX + window.scrollX;
      const pageY = clientY + window.scrollY;

      // Target pozicija u koordinatama stranice
      const rect = target.getBoundingClientRect();
      const targetPageX = rect.left + window.scrollX;
      const targetPageY = rect.top + window.scrollY;

      // Koordinate tačke unutar target čvora
      const tx = pageX - targetPageX;
      const ty = pageY - targetPageY;

      // Za transform origin (0,0): centriramo (tx,ty) u (r,r) nakon skaliranja
      // translate = (r - tx*zoom, r - ty*zoom)
      mirror.style.transformOrigin = '0 0';
      mirror.style.transform = `translate(${r - tx * zoom}px, ${r - ty * zoom}px) scale(${zoom})`;
    },
    [radius, zoom]
  );

  // Rešavanje targeta + setap kad se uključi lupa
  useEffect(() => {
    if (!enabled) {
      teardownObserver();
      if (lensRef.current) lensRef.current.innerHTML = '';
      mirrorRef.current = null;
      return;
    }
    resolveTarget();
    if (!targetRef.current) return;

    cloneTarget();
    setupObserver();

    const onResizeOrScroll = () => {
      // refresh transform pošto su se referentne mere promenile
      applyLensTransform(mouseRef.current.x, mouseRef.current.y);
    };
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll);
    };
  }, [enabled, resolveTarget, cloneTarget, setupObserver, applyLensTransform]);

  const ctxValue = useMemo(
    () => ({ enabled, toggle, setEnabled, zoom, setZoom, radius, setRadius }),
    [enabled, toggle, zoom, radius]
  );

  // Render portala (sočivo + okvir + overlay)
  const lensPortal =
    enabled && portalRootRef.current
      ? createPortal(
          <div
            aria-hidden="true"
            ref={(node) => {
              // kontejner za pozicioniranje sočiva
              if (node) {
                Object.assign(node.style, {
                  position: 'fixed',
                  left: '0',
                  top: '0',
                  width: '0',
                  height: '0',
                  pointerEvents: 'none',
                } as CSSStyleDeclaration);
              }
            }}
          >
            <div
              ref={lensRef}
              style={{
                position: 'fixed',
                pointerEvents: 'none',
              }}
            >
              {/* Mirror je child koga punimo klonom */}
              <div
                className="absolute inset-0 rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl bg-white/70"
                style={{
                  willChange: 'transform',
                  imageRendering: 'auto',
                  filter: 'contrast(1.08) brightness(1.02) saturate(1.04)',
                }}
              />
              {/* crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-0.5 h-6 bg-red-500/70" />
                <div className="absolute w-6 h-0.5 bg-red-500/70" />
              </div>
              {/* labela */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="bg-black/90 text-white px-2 py-1 rounded text-xs font-medium">
                  Zoom {zoom.toFixed(1)}× • <kbd className="bg-gray-700 px-1 py-0.5 rounded">ESC</kbd> izlaz
                </div>
              </div>
            </div>
          </div>,
          portalRootRef.current
        )
      : null;

  return (
    <MagnifierContext.Provider value={ctxValue}>
      {children}
      {lensPortal}
    </MagnifierContext.Provider>
  );
};

/* ----------------- Utilities ------------------ */

/** Rekurzivno preslikaj scrollTop/scrollLeft sa originala na klon kroz paralelnu DFS šetnju. */
function syncScrollPositions(original: HTMLElement, clone: HTMLElement) {
  const stack: Array<{ a: Element; b: Element }> = [{ a: original, b: clone }];
  while (stack.length) {
    const { a, b } = stack.pop()!;
    if (isScrollable(a) && b instanceof HTMLElement) {
      (b as HTMLElement).scrollTop = (a as HTMLElement).scrollTop;
      (b as HTMLElement).scrollLeft = (a as HTMLElement).scrollLeft;
    }
    const aChildren = Array.from(a.children);
    const bChildren = Array.from(b.children);
    const n = Math.min(aChildren.length, bChildren.length);
    for (let i = 0; i < n; i++) {
      stack.push({ a: aChildren[i], b: bChildren[i] });
    }
  }
}

function isScrollable(el: Element) {
  const s = getComputedStyle(el);
  const overflowY = s.overflowY;
  const overflowX = s.overflowX;
  const canScrollY = (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight;
  const canScrollX = (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth;
  return (
    (canScrollY && (overflowY === 'auto' || overflowY === 'scroll')) ||
    (canScrollX && (overflowX === 'auto' || overflowX === 'scroll'))
  );
}
