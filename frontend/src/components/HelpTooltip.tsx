/**
 * HelpTooltip Component - Prikazuje pomoćne informacije za početnike
 * Koristi se pored komplikovanih polja u formama
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface HelpTooltipProps {
  title: string;
  content: string | React.ReactNode;
  example?: string;
  learnMoreUrl?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

export function HelpTooltip({
  title,
  content,
  example,
  learnMoreUrl,
  position = 'top',
  className,
  iconSize = 'md'
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Zatvori tooltip na klik van
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        buttonRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Zatvori na Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent'
  };

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={cn(
          'text-gray-400 hover:text-blue-500 focus:outline-none focus:text-blue-500 transition-colors',
          'rounded-full hover:bg-blue-50 p-0.5'
        )}
        aria-label={`Pomoć: ${title}`}
        aria-expanded={isOpen}
      >
        <HelpCircle className={iconSizes[iconSize]} />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'absolute z-50 w-72 p-4 rounded-xl shadow-xl',
            'bg-gray-800 text-white',
            'animate-fadeIn',
            positionClasses[position]
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0 border-[6px]',
              arrowClasses[position]
            )}
          />

          {/* Close button za mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white md:hidden"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-blue-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              {title}
            </h4>
            
            <div className="text-sm text-gray-300 leading-relaxed">
              {content}
            </div>

            {example && (
              <div className="mt-3 p-2 bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Primer:</p>
                <code className="text-xs text-emerald-400 font-mono">
                  {example}
                </code>
              </div>
            )}

            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
              >
                Saznaj više →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Predefinisani tooltipovi za česte pojmove
export const tooltips = {
  pib: {
    title: 'PIB (Poreski Identifikacioni Broj)',
    content: 'Jedinstveni 9-cifreni broj koji dodeljuje Poreska uprava svakom poreskom obvezniku u Srbiji.',
    example: '123456789'
  },
  maticniBroj: {
    title: 'Matični broj',
    content: 'Jedinstveni 8-cifreni broj koji dodeljuje APR pri registraciji privrednog subjekta.',
    example: '12345678'
  },
  pdvStopa: {
    title: 'PDV stopa',
    content: (
      <div className="space-y-1">
        <p><strong>20%</strong> - Opšta stopa za većinu roba i usluga</p>
        <p><strong>10%</strong> - Snižena stopa (hrana, lekovi, knjige...)</p>
        <p><strong>0%</strong> - Izvoz i oslobođene usluge</p>
      </div>
    )
  },
  pozivNaBroj: {
    title: 'Poziv na broj',
    content: 'Referentni broj koji kupac koristi pri plaćanju da biste lakše identifikovali uplatu. Najčešće je to broj fakture.',
    example: '2025-001'
  },
  valuta: {
    title: 'Valuta plaćanja',
    content: 'Datum do kada kupac treba da izvrši plaćanje. Standard je 15-30 dana od datuma fakture.',
    example: '15 dana'
  },
  ublFormat: {
    title: 'UBL 2.1 Format',
    content: 'Universal Business Language - međunarodni XML standard za razmenu poslovnih dokumenata koji koristi SEF.',
    learnMoreUrl: 'https://docs.oasis-open.org/ubl/UBL-2.1.html'
  },
  sefStatus: {
    title: 'SEF Status',
    content: (
      <div className="space-y-1">
        <p><span className="text-yellow-400">●</span> <strong>Poslata</strong> - Čeka obradu</p>
        <p><span className="text-green-400">●</span> <strong>Prihvaćena</strong> - Uspešno prihvaćena</p>
        <p><span className="text-red-400">●</span> <strong>Odbijena</strong> - Kupac odbio</p>
      </div>
    )
  }
};

// Helper komponenta za česta polja
interface FieldHelpProps {
  field: keyof typeof tooltips;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function FieldHelp({ field, position = 'top' }: FieldHelpProps) {
  const tooltip = tooltips[field];
  if (!tooltip) return null;

  return (
    <HelpTooltip
      title={tooltip.title}
      content={tooltip.content}
      example={'example' in tooltip ? tooltip.example : undefined}
      learnMoreUrl={'learnMoreUrl' in tooltip ? tooltip.learnMoreUrl : undefined}
      position={position}
    />
  );
}

export default HelpTooltip;
