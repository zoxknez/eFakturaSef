import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  accountsApi,
  fiscalYearsApi,
  journalEntriesApi,
  reportsApi,
  vatApi,
  creditNotesApi,
  Account,
  FiscalYear,
  JournalEntry,
  VATRecord,
  CreditNote,
  CreateAccountDto,
  CreateJournalEntryDto,
  CreateVATRecordDto,
  CreateCreditNoteDto,
  downloadBlob,
} from '../services/accountingApi';

// ============ ACCOUNTS HOOKS ============

export function useAccounts(params?: { type?: string; isActive?: boolean; parentId?: string }) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => accountsApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAccountsTree() {
  return useQuery({
    queryKey: ['accounts', 'tree'],
    queryFn: () => accountsApi.getTree(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => accountsApi.getById(id!),
    enabled: !!id,
  });
}

export function useAccountBalance(id: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['accounts', id, 'balance', startDate, endDate],
    queryFn: () => accountsApi.getBalance(id!, startDate, endDate),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountDto) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAccountDto> }) =>
      accountsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.id] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// ============ FISCAL YEARS HOOKS ============

export function useFiscalYears() {
  return useQuery({
    queryKey: ['fiscalYears'],
    queryFn: () => fiscalYearsApi.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useActiveFiscalYear() {
  return useQuery({
    queryKey: ['fiscalYears', 'active'],
    queryFn: () => fiscalYearsApi.getActive(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (year: number) => fiscalYearsApi.create(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscalYears'] });
    },
  });
}

export function useCloseFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscalYears'] });
    },
  });
}

// ============ JOURNAL ENTRIES HOOKS ============

export function useJournalEntries(params?: {
  fiscalYearId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['journalEntries', params],
    queryFn: () => journalEntriesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useJournalEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['journalEntries', id],
    queryFn: () => journalEntriesApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalEntryDto) => journalEntriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateJournalEntryDto> }) =>
      journalEntriesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries', variables.id] });
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalEntriesApi.post(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries', id] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Balances changed
    },
  });
}

export function useReverseJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      journalEntriesApi.reverse(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalEntriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    },
  });
}

// ============ REPORTS HOOKS ============

export function useTrialBalance(params: { startDate: string; endDate: string; fiscalYearId?: string }) {
  return useQuery({
    queryKey: ['reports', 'trialBalance', params],
    queryFn: () => reportsApi.getTrialBalance(params),
    enabled: !!params.startDate && !!params.endDate,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useBalanceSheet(params: { asOfDate: string; fiscalYearId?: string }) {
  return useQuery({
    queryKey: ['reports', 'balanceSheet', params],
    queryFn: () => reportsApi.getBalanceSheet(params),
    enabled: !!params.asOfDate,
    staleTime: 60 * 1000,
  });
}

export function useIncomeStatement(params: { startDate: string; endDate: string; fiscalYearId?: string }) {
  return useQuery({
    queryKey: ['reports', 'incomeStatement', params],
    queryFn: () => reportsApi.getIncomeStatement(params),
    enabled: !!params.startDate && !!params.endDate,
    staleTime: 60 * 1000,
  });
}

export function useGeneralLedger(params: { accountId: string; startDate: string; endDate: string }) {
  return useQuery({
    queryKey: ['reports', 'generalLedger', params],
    queryFn: () => reportsApi.getGeneralLedger(params),
    enabled: !!params.accountId && !!params.startDate && !!params.endDate,
    staleTime: 60 * 1000,
  });
}

export function useAgingReport(params: { asOfDate: string; type: 'receivable' | 'payable' }) {
  return useQuery({
    queryKey: ['reports', 'aging', params],
    queryFn: () => reportsApi.getAgingReport(params),
    enabled: !!params.asOfDate,
    staleTime: 60 * 1000,
  });
}

export function useExportReport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPdf = useCallback(async (reportType: string, params: Record<string, string>, filename: string) => {
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportToPdf(reportType, params);
      downloadBlob(blob, `${filename}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportToExcel = useCallback(async (reportType: string, params: Record<string, string>, filename: string) => {
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportToExcel(reportType, params);
      downloadBlob(blob, `${filename}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, exportToPdf, exportToExcel };
}

// ============ VAT RECORDS HOOKS ============

export function useVATRecords(params?: {
  recordType?: 'KPO' | 'KPR';
  vatPeriod?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['vatRecords', params],
    queryFn: () => vatApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useVATRecord(id: string | undefined) {
  return useQuery({
    queryKey: ['vatRecords', id],
    queryFn: () => vatApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateVATRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVATRecordDto) => vatApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vatRecords'] });
    },
  });
}

export function useUpdateVATRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVATRecordDto> }) =>
      vatApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vatRecords'] });
      queryClient.invalidateQueries({ queryKey: ['vatRecords', variables.id] });
    },
  });
}

export function useDeleteVATRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vatApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vatRecords'] });
    },
  });
}

export function usePPPDVPreview(vatPeriod: string | undefined) {
  return useQuery({
    queryKey: ['pppdv', 'preview', vatPeriod],
    queryFn: () => vatApi.getPPPDVPreview(vatPeriod!),
    enabled: !!vatPeriod,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useExportVAT() {
  const [isExporting, setIsExporting] = useState(false);

  const generatePPPDV = useCallback(async (vatPeriod: string) => {
    setIsExporting(true);
    try {
      const blob = await vatApi.generatePPPDV(vatPeriod);
      downloadBlob(blob, `PPPDV_${vatPeriod}.xml`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportKPO = useCallback(async (vatPeriod: string, format: 'pdf' | 'excel' = 'excel') => {
    setIsExporting(true);
    try {
      const blob = await vatApi.exportKPO(vatPeriod, format);
      downloadBlob(blob, `KPO_${vatPeriod}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportKPR = useCallback(async (vatPeriod: string, format: 'pdf' | 'excel' = 'excel') => {
    setIsExporting(true);
    try {
      const blob = await vatApi.exportKPR(vatPeriod, format);
      downloadBlob(blob, `KPR_${vatPeriod}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, generatePPPDV, exportKPO, exportKPR };
}

// ============ CREDIT NOTES HOOKS ============

export function useCreditNotes(params?: {
  status?: string;
  partnerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['creditNotes', params],
    queryFn: () => creditNotesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreditNote(id: string | undefined) {
  return useQuery({
    queryKey: ['creditNotes', id],
    queryFn: () => creditNotesApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCreditNoteDto) => creditNotesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
    },
  });
}

export function useUpdateCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCreditNoteDto> }) =>
      creditNotesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', variables.id] });
    },
  });
}

export function useDeleteCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => creditNotesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
    },
  });
}

export function useSendCreditNoteToSef() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => creditNotesApi.sendToSef(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', id] });
    },
  });
}

export function useCancelCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      creditNotesApi.cancel(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', id] });
    },
  });
}

export function useExportCreditNote() {
  const [isExporting, setIsExporting] = useState(false);

  const downloadPdf = useCallback(async (id: string, creditNoteNumber: string) => {
    setIsExporting(true);
    try {
      const blob = await creditNotesApi.getPdf(id);
      downloadBlob(blob, `Knjizno_odobrenje_${creditNoteNumber}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const downloadUbl = useCallback(async (id: string, creditNoteNumber: string) => {
    setIsExporting(true);
    try {
      const xml = await creditNotesApi.getUblXml(id);
      const blob = new Blob([xml], { type: 'application/xml' });
      downloadBlob(blob, `Knjizno_odobrenje_${creditNoteNumber}.xml`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, downloadPdf, downloadUbl };
}

// ============ UTILITY HOOKS ============

/**
 * Hook to format currency values in Serbian format
 */
export function useFormatCurrency() {
  return useCallback((value: number, currency: string = 'RSD') => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);
}

/**
 * Hook to format dates in Serbian format
 */
export function useFormatDate() {
  return useCallback((date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }, []);
}

/**
 * Hook to get available VAT periods (months)
 */
export function useVATPeriods() {
  const [periods, setPeriods] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const now = new Date();
    const result: { value: string; label: string }[] = [];
    
    // Generate last 24 months
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('sr-RS', { month: 'long', year: 'numeric' }).format(date);
      result.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    
    setPeriods(result);
  }, []);

  return periods;
}
