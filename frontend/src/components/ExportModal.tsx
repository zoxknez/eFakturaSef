/**
 * Export Modal Component - omogućava izvoz podataka u Excel/PDF
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: 'invoices' | 'partners' | 'products' | 'payments' | 'vat' | 'journal';
  filters?: Record<string, string>;
  title?: string;
}

interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  includeDetails?: boolean;
}

export default function ExportModal({ isOpen, onClose, exportType, filters = {}, title }: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'excel',
    dateFrom: '',
    dateTo: '',
    status: '',
    includeDetails: true
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (options.dateFrom) params.append('dateFrom', options.dateFrom);
      if (options.dateTo) params.append('dateTo', options.dateTo);
      if (options.status) params.append('status', options.status);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }

      let endpoint = '';
      let filename = '';

      switch (exportType) {
        case 'invoices':
          endpoint = options.format === 'pdf' 
            ? `/api/exports/report/excel` 
            : `/api/exports/invoices/excel`;
          filename = `fakture-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'partners':
          endpoint = `/api/partners/export`;
          filename = `partneri-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'products':
          endpoint = `/api/products/export`;
          filename = `proizvodi-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'payments':
          endpoint = `/api/payments/export`;
          filename = `placanja-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'vat':
          endpoint = `/api/vat/export`;
          filename = `pdv-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'journal':
          endpoint = `/api/accounting/journal/export`;
          filename = `dnevnik-${new Date().toISOString().split('T')[0]}`;
          break;
      }

      const response = await apiClient.get(`${endpoint}?${params}`, {
        responseType: 'blob'
      });

      // Download file
      const blob = new Blob([response.data], {
        type: options.format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : options.format === 'pdf'
            ? 'application/pdf'
            : 'text/csv'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${options.format === 'excel' ? 'xlsx' : options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Izvoz uspešno završen!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Greška pri izvozu');
    }
  });

  const typeLabels: Record<string, string> = {
    invoices: 'Fakture',
    partners: 'Partneri',
    products: 'Proizvodi',
    payments: 'Plaćanja',
    vat: 'PDV evidencija',
    journal: 'Dnevnik knjiženja'
  };

  const statusOptions: Record<string, { value: string; label: string }[]> = {
    invoices: [
      { value: '', label: 'Svi statusi' },
      { value: 'DRAFT', label: 'Draft' },
      { value: 'SENT', label: 'Poslato' },
      { value: 'ACCEPTED', label: 'Prihvaćeno' },
      { value: 'REJECTED', label: 'Odbijeno' },
      { value: 'CANCELLED', label: 'Stornirano' }
    ],
    payments: [
      { value: '', label: 'Svi statusi' },
      { value: 'PENDING', label: 'Na čekanju' },
      { value: 'COMPLETED', label: 'Završeno' },
      { value: 'CANCELLED', label: 'Otkazano' }
    ],
    journal: [
      { value: '', label: 'Svi statusi' },
      { value: 'DRAFT', label: 'Draft' },
      { value: 'POSTED', label: 'Proknjiženo' },
      { value: 'REVERSED', label: 'Stornirano' }
    ]
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title || 'Izvoz podataka'}</h3>
            <p className="text-sm text-gray-500">{typeLabels[exportType]}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setOptions({ ...options, format: 'excel' })}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  options.format === 'excel'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">📊</span>
                <span className="text-sm font-medium">Excel</span>
              </button>
              <button
                onClick={() => setOptions({ ...options, format: 'pdf' })}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  options.format === 'pdf'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">📕</span>
                <span className="text-sm font-medium">PDF</span>
              </button>
              <button
                onClick={() => setOptions({ ...options, format: 'csv' })}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  options.format === 'csv'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">📄</span>
                <span className="text-sm font-medium">CSV</span>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum od</label>
              <input
                type="date"
                value={options.dateFrom || ''}
                onChange={(e) => setOptions({ ...options, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum do</label>
              <input
                type="date"
                value={options.dateTo || ''}
                onChange={(e) => setOptions({ ...options, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          {statusOptions[exportType] && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={options.status || ''}
                onChange={(e) => setOptions({ ...options, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions[exportType].map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Options */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeDetails}
                onChange={(e) => setOptions({ ...options, includeDetails: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Uključi detalje (stavke, napomene)</span>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-blue-500">ℹ️</span>
              <div className="text-sm text-blue-700">
                <p className="font-medium">Napomena</p>
                <p className="mt-1">
                  {options.format === 'excel' && 'Excel format je idealan za dalju analizu i obradu podataka.'}
                  {options.format === 'pdf' && 'PDF format je idealan za štampu i arhiviranje.'}
                  {options.format === 'csv' && 'CSV format je idealan za uvoz u druge sisteme.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Otkaži
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exportMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Izvozi se...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Izvezi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
