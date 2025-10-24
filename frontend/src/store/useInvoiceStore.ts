// Zustand store for invoice-specific state
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface InvoiceFilters {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface InvoiceState {
  // Filters
  filters: InvoiceFilters;
  
  // Selected invoices (for bulk operations)
  selectedInvoiceIds: Set<string>;
  
  // Actions
  setFilters: (filters: InvoiceFilters) => void;
  resetFilters: () => void;
  toggleInvoiceSelection: (id: string) => void;
  selectAllInvoices: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useInvoiceStore = create<InvoiceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      filters: {},
      selectedInvoiceIds: new Set(),

      // Actions
      setFilters: (filters) => set({ filters }),
      resetFilters: () => set({ filters: {} }),

      toggleInvoiceSelection: (id) =>
        set((state) => {
          const newSelection = new Set(state.selectedInvoiceIds);
          if (newSelection.has(id)) {
            newSelection.delete(id);
          } else {
            newSelection.add(id);
          }
          return { selectedInvoiceIds: newSelection };
        }),

      selectAllInvoices: (ids) =>
        set({ selectedInvoiceIds: new Set(ids) }),

      clearSelection: () => set({ selectedInvoiceIds: new Set() }),

      isSelected: (id) => get().selectedInvoiceIds.has(id),
    }),
    { name: 'Invoice Store' }
  )
);

