/**
 * EmptyState Component - Prikazuje poruku i uputstvo kada nema podataka
 * Pomaže početnicima da razumeju šta treba da urade
 */

import React from 'react';
import { 
  FileText, 
  Users, 
  Package, 
  CreditCard, 
  Search, 
  Plus,
  ArrowRight,
  FolderOpen,
  Inbox,
  Filter,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';

type EmptyStateType = 
  | 'invoices' 
  | 'partners' 
  | 'products' 
  | 'payments' 
  | 'search' 
  | 'filter' 
  | 'general';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const defaultContent: Record<EmptyStateType, {
  icon: typeof FileText;
  title: string;
  description: string;
  actionLabel: string;
}> = {
  invoices: {
    icon: FileText,
    title: 'Nemate faktura',
    description: 'Kreirajte prvu fakturu da biste započeli sa fakturisanjem. Naš čarobnjak će vas voditi korak po korak.',
    actionLabel: 'Nova faktura'
  },
  partners: {
    icon: Users,
    title: 'Nemate partnera',
    description: 'Dodajte svoje kupce i dobavljače da biste mogli da kreirate fakture. Možete uneti PIB za automatsko povlačenje podataka.',
    actionLabel: 'Dodaj partnera'
  },
  products: {
    icon: Package,
    title: 'Nemate proizvoda',
    description: 'Kreirajte katalog proizvoda i usluga sa cenama i PDV stopama. To će vam ubrzati kreiranje faktura.',
    actionLabel: 'Dodaj proizvod'
  },
  payments: {
    icon: CreditCard,
    title: 'Nema plaćanja',
    description: 'Ovde će se prikazivati evidencija plaćanja kada počnete da primate uplate po fakturama.',
    actionLabel: 'Dodaj plaćanje'
  },
  search: {
    icon: Search,
    title: 'Nema rezultata pretrage',
    description: 'Probajte sa drugim ključnim rečima ili uklonite neke filtere.',
    actionLabel: 'Obriši pretragu'
  },
  filter: {
    icon: Filter,
    title: 'Nema rezultata za izabrane filtere',
    description: 'Pokušajte da promenite ili uklonite neke filtere da biste videli više rezultata.',
    actionLabel: 'Resetuj filtere'
  },
  general: {
    icon: FolderOpen,
    title: 'Nema podataka',
    description: 'Još uvek nema ničega za prikaz. Počnite dodavanjem novog unosa.',
    actionLabel: 'Dodaj novi'
  }
};

export function EmptyState({
  type = 'general',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
  className,
  compact = false
}: EmptyStateProps) {
  const content = defaultContent[type];
  const Icon = icon ? null : content.icon;

  const displayTitle = title || content.title;
  const displayDescription = description || content.description;
  const displayActionLabel = actionLabel || content.actionLabel;

  if (compact) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        className
      )}>
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
          {icon || (Icon && <Icon className="w-6 h-6 text-gray-400" />)}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {displayTitle}
        </p>
        {onAction && (
          <button
            onClick={onAction}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {displayActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4',
      className
    )}>
      {/* Illustration */}
      <div className="relative mb-6">
        {/* Background decoration */}
        <div className="absolute inset-0 -m-4">
          <div className="w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-2xl opacity-50" />
        </div>
        
        {/* Icon container */}
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center shadow-lg">
          {icon || (Icon && (
            <Icon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          ))}
        </div>

        {/* Small decorative elements */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg rotate-12" />
        <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full" />
      </div>

      {/* Text content */}
      <div className="text-center max-w-md">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {displayTitle}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          {displayDescription}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {onAction && (
          <button
            onClick={onAction}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium',
              'bg-blue-600 text-white hover:bg-blue-700',
              'shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
              'transition-all duration-200 transform hover:-translate-y-0.5'
            )}
          >
            <Plus className="w-5 h-5" />
            {displayActionLabel}
          </button>
        )}

        {onSecondaryAction && secondaryActionLabel && (
          <button
            onClick={onSecondaryAction}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
          >
            {secondaryActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tips for beginners */}
      {type !== 'search' && type !== 'filter' && (
        <div className="mt-10 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl max-w-md">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Savet za početnike
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {getTip(type)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTip(type: EmptyStateType): string {
  const tips: Record<EmptyStateType, string> = {
    invoices: 'Pre kreiranja fakture, preporučujemo da prvo dodate partnere i proizvode. Tako ćete brže popunjavati fakture.',
    partners: 'Unesite PIB partnera i kliknite ikonu pretrage da automatski povučete podatke iz APR registra.',
    products: 'Definišite PDV stopu za svaki proizvod. Sistem će automatski računati iznos PDV-a na fakturama.',
    payments: 'Plaćanja možete evidentirati ručno ili automatski uvozom bankovnih izvoda.',
    search: '',
    filter: '',
    general: 'Koristite prečice na tastaturi za brži rad. Pritisnite Ctrl+/ da vidite listu prečica.'
  };
  return tips[type];
}

// Varijante za specifične slučajeve
export function NoSearchResults({ 
  query, 
  onClear 
}: { 
  query: string; 
  onClear: () => void;
}) {
  return (
    <EmptyState
      type="search"
      title={`Nema rezultata za "${query}"`}
      description="Proverite da li ste ispravno uneli pojam za pretragu ili probajte sa drugim ključnim rečima."
      actionLabel="Obriši pretragu"
      onAction={onClear}
      icon={<Search className="w-12 h-12 text-gray-400" />}
    />
  );
}

export function NoFilterResults({ 
  onReset 
}: { 
  onReset: () => void;
}) {
  return (
    <EmptyState
      type="filter"
      actionLabel="Resetuj filtere"
      onAction={onReset}
      secondaryActionLabel="Pogledaj sve"
      onSecondaryAction={onReset}
      icon={<Filter className="w-12 h-12 text-gray-400" />}
    />
  );
}

export function NoPeriodData({ 
  period,
  onChangePeriod 
}: { 
  period: string;
  onChangePeriod: () => void;
}) {
  return (
    <EmptyState
      type="general"
      title={`Nema podataka za ${period}`}
      description="Odaberite drugi vremenski period ili proverite da li postoje unosi za ovaj opseg datuma."
      actionLabel="Promeni period"
      onAction={onChangePeriod}
      icon={<Calendar className="w-12 h-12 text-gray-400" />}
    />
  );
}

export default EmptyState;
