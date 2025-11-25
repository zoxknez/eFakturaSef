import React, { useState, useRef, useCallback } from 'react';
import { apiClient } from '../services/api';
import { logger } from '../utils/logger';

export type ImportType = 'invoices' | 'partners' | 'products' | 'payments' | 'bank-statements';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: ImportType;
  title?: string;
  onSuccess?: (result: ImportResult) => void;
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: ImportError[];
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  importType,
  title,
  onSuccess
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetFields: Record<ImportType, { field: string; label: string; required: boolean }[]> = {
    invoices: [
      { field: 'invoiceNumber', label: 'Broj fakture', required: true },
      { field: 'issueDate', label: 'Datum izdavanja', required: true },
      { field: 'dueDate', label: 'Rok plaćanja', required: false },
      { field: 'buyerName', label: 'Naziv kupca', required: true },
      { field: 'buyerPIB', label: 'PIB kupca', required: true },
      { field: 'totalAmount', label: 'Ukupan iznos', required: true },
      { field: 'taxAmount', label: 'PDV', required: false },
      { field: 'currency', label: 'Valuta', required: false },
      { field: 'description', label: 'Opis', required: false }
    ],
    partners: [
      { field: 'name', label: 'Naziv', required: true },
      { field: 'pib', label: 'PIB', required: true },
      { field: 'mb', label: 'Matični broj', required: false },
      { field: 'address', label: 'Adresa', required: false },
      { field: 'city', label: 'Grad', required: false },
      { field: 'postalCode', label: 'Poštanski broj', required: false },
      { field: 'email', label: 'Email', required: false },
      { field: 'phone', label: 'Telefon', required: false },
      { field: 'bankAccount', label: 'Tekući račun', required: false },
      { field: 'type', label: 'Tip (pravno_lice/fizicko_lice/preduzetnik)', required: false }
    ],
    products: [
      { field: 'code', label: 'Šifra', required: true },
      { field: 'name', label: 'Naziv', required: true },
      { field: 'description', label: 'Opis', required: false },
      { field: 'unit', label: 'Jedinica mere', required: true },
      { field: 'price', label: 'Cena', required: true },
      { field: 'vatRate', label: 'Stopa PDV-a (%)', required: false },
      { field: 'category', label: 'Kategorija', required: false },
      { field: 'barcode', label: 'Barkod', required: false },
      { field: 'stockQuantity', label: 'Količina na lageru', required: false }
    ],
    payments: [
      { field: 'invoiceNumber', label: 'Broj fakture', required: true },
      { field: 'paymentDate', label: 'Datum uplate', required: true },
      { field: 'amount', label: 'Iznos', required: true },
      { field: 'method', label: 'Način plaćanja', required: false },
      { field: 'reference', label: 'Poziv na broj', required: false },
      { field: 'note', label: 'Napomena', required: false }
    ],
    'bank-statements': [
      { field: 'date', label: 'Datum', required: true },
      { field: 'description', label: 'Opis', required: true },
      { field: 'debit', label: 'Duguje', required: false },
      { field: 'credit', label: 'Potražuje', required: false },
      { field: 'balance', label: 'Saldo', required: false },
      { field: 'reference', label: 'Poziv na broj', required: false },
      { field: 'partnerName', label: 'Naziv partnera', required: false },
      { field: 'partnerAccount', label: 'Račun partnera', required: false }
    ]
  };

  const importTypeLabels: Record<ImportType, string> = {
    invoices: 'faktura',
    partners: 'partnera',
    products: 'proizvoda',
    payments: 'uplata',
    'bank-statements': 'izvoda'
  };

  const parseCSV = (text: string): { headers: string[]; data: any[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Fajl mora sadržati zaglavlje i najmanje jedan red podataka');
    }

    // Detect delimiter (comma, semicolon, tab)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const data = lines.slice(1).filter(line => line.trim()).map((line, index) => {
      const values = parseRow(line);
      const row: Record<string, any> = { _rowIndex: index + 2 };
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });

    return { headers, data };
  };

  const parseExcel = async (file: File): Promise<{ headers: string[]; data: any[] }> => {
    // For now, just show a message that Excel parsing requires additional setup
    throw new Error('Za Excel fajlove koristite CSV format. Excel podrška dolazi uskoro.');
  };

  const handleFile = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    try {
      let parsedData: { headers: string[]; data: any[] };

      if (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.txt')) {
        const text = await selectedFile.text();
        parsedData = parseCSV(text);
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        parsedData = await parseExcel(selectedFile);
      } else {
        throw new Error('Nepodržan format fajla. Koristite CSV ili Excel format.');
      }

      setHeaders(parsedData.headers);
      setFileData(parsedData.data);

      // Auto-map columns where names match
      const autoMappings: ColumnMapping[] = [];
      targetFields[importType].forEach(field => {
        const matchingHeader = parsedData.headers.find(h => 
          h.toLowerCase().replace(/[_\s-]/g, '') === field.field.toLowerCase().replace(/[_\s-]/g, '') ||
          h.toLowerCase().includes(field.label.toLowerCase()) ||
          field.label.toLowerCase().includes(h.toLowerCase())
        );
        if (matchingHeader) {
          autoMappings.push({ sourceColumn: matchingHeader, targetField: field.field });
        }
      });
      setColumnMappings(autoMappings);

      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Greška pri čitanju fajla');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => {
      const filtered = prev.filter(m => m.targetField !== targetField);
      if (sourceColumn) {
        return [...filtered, { sourceColumn, targetField }];
      }
      return filtered;
    });
  };

  const getMappingForField = (targetField: string): string => {
    return columnMappings.find(m => m.targetField === targetField)?.sourceColumn || '';
  };

  const validateMappings = (): boolean => {
    const requiredFields = targetFields[importType].filter(f => f.required);
    for (const field of requiredFields) {
      if (!getMappingForField(field.field)) {
        setError(`Obavezno polje "${field.label}" nije mapirano`);
        return false;
      }
    }
    return true;
  };

  const handleImport = async () => {
    if (!validateMappings()) return;

    setImporting(true);
    setError(null);
    setStep('importing');

    try {
      // Transform data according to mappings
      const transformedData = fileData.map(row => {
        const transformed: Record<string, any> = {};
        columnMappings.forEach(mapping => {
          transformed[mapping.targetField] = row[mapping.sourceColumn];
        });
        return transformed;
      });

      // Send to backend
      const response = await apiClient.post(`/api/import/${importType}`, {
        data: transformedData
      });

      if (response.data?.success) {
        setResult(response.data.data);
        setStep('result');
        onSuccess?.(response.data.data);
      } else {
        throw new Error(response.data?.error || 'Import nije uspeo');
      }
    } catch (err: any) {
      logger.error('Import error', err);
      setError(err.message || 'Greška pri importu');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setFileData([]);
    setHeaders([]);
    setColumnMappings([]);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500/75 transition-opacity" 
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {title || `Import ${importTypeLabels[importType]}`}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {step === 'upload' && 'Izaberite fajl za import (CSV format)'}
                {step === 'mapping' && 'Mapirajte kolone iz fajla na polja u sistemu'}
                {step === 'preview' && 'Pregledajte podatke pre importa'}
                {step === 'importing' && 'Import u toku...'}
                {step === 'result' && 'Rezultat importa'}
              </p>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center py-4 border-b border-gray-100">
            {['upload', 'mapping', 'preview', 'result'].map((s, index) => (
              <React.Fragment key={s}>
                {index > 0 && (
                  <div className={`w-16 h-0.5 ${
                    ['upload', 'mapping', 'preview', 'importing', 'result'].indexOf(step) > index - 1
                      ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step === s || step === 'importing' && s === 'preview'
                    ? 'bg-blue-500 text-white'
                    : ['upload', 'mapping', 'preview', 'importing', 'result'].indexOf(step) > ['upload', 'mapping', 'preview', 'result'].indexOf(s)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                  {['upload', 'mapping', 'preview', 'importing', 'result'].indexOf(step) > ['upload', 'mapping', 'preview', 'result'].indexOf(s) 
                    ? '✓' 
                    : index + 1
                  }
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Content */}
          <div className="mt-6 max-h-[60vh] overflow-y-auto">
            {/* Upload Step */}
            {step === 'upload' && (
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-5xl mb-4">📄</div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Prevucite fajl ovde ili kliknite za izbor
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Podržani formati: CSV, TXT (Excel podrška dolazi uskoro)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Izaberi fajl
                </button>

                {/* Template Download */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Potreban vam je šablon?</p>
                  <button 
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    onClick={() => {
                      // Generate and download template
                      const fields = targetFields[importType];
                      const headers = fields.map(f => f.field).join(',');
                      const example = fields.map(f => f.required ? 'OBAVEZNO' : 'opciono').join(',');
                      const blob = new Blob([`${headers}\n${example}`], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `template_${importType}.csv`;
                      a.click();
                    }}
                  >
                    📥 Preuzmi šablon za {importTypeLabels[importType]}
                  </button>
                </div>
              </div>
            )}

            {/* Mapping Step */}
            {step === 'mapping' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Fajl:</strong> {file?.name} • <strong>Redova:</strong> {fileData.length}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {targetFields[importType].map(field => (
                    <div key={field.field} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                          value={getMappingForField(field.field)}
                          onChange={(e) => updateMapping(e.target.value, field.field)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            field.required && !getMappingForField(field.field)
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">-- Izaberite kolonu --</option>
                          {headers.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      {getMappingForField(field.field) && (
                        <span className="text-green-500 mt-6">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Pregledajte prvih 5 redova pre importa. Ukupno će biti importovano <strong>{fileData.length}</strong> zapisa.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          #
                        </th>
                        {targetFields[importType].filter(f => getMappingForField(f.field)).map(field => (
                          <th key={field.field} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fileData.slice(0, 5).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {row._rowIndex}
                          </td>
                          {targetFields[importType].filter(f => getMappingForField(f.field)).map(field => (
                            <td key={field.field} className="px-4 py-2 text-sm text-gray-900">
                              {row[getMappingForField(field.field)] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {fileData.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... i još {fileData.length - 5} redova
                  </p>
                )}
              </div>
            )}

            {/* Importing Step */}
            {step === 'importing' && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg font-medium text-gray-900">Import u toku...</p>
                <p className="text-sm text-gray-500 mt-2">Molimo sačekajte, obrađuje se {fileData.length} zapisa</p>
              </div>
            )}

            {/* Result Step */}
            {step === 'result' && result && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">{result.total}</div>
                    <div className="text-sm text-blue-700 mt-1">Ukupno</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{result.imported}</div>
                    <div className="text-sm text-green-700 mt-1">Uspešno</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-red-600">{result.failed}</div>
                    <div className="text-sm text-red-700 mt-1">Greške</div>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-4">
                    <h4 className="font-medium text-red-800 mb-2">Greške pri importu:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors.map((err, index) => (
                        <p key={index} className="text-sm text-red-700">
                          Red {err.row}: {err.message} {err.field && `(${err.field})`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between">
            {step !== 'upload' && step !== 'result' && step !== 'importing' && (
              <button
                onClick={() => {
                  if (step === 'mapping') setStep('upload');
                  if (step === 'preview') setStep('mapping');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Nazad
              </button>
            )}
            {step === 'upload' && <div />}
            
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {step === 'result' ? 'Zatvori' : 'Otkaži'}
              </button>
              
              {step === 'mapping' && (
                <button
                  onClick={() => {
                    if (validateMappings()) {
                      setError(null);
                      setStep('preview');
                    }
                  }}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Nastavi →
                </button>
              )}
              
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Importujem...
                    </>
                  ) : (
                    <>
                      ✓ Importuj {fileData.length} zapisa
                    </>
                  )}
                </button>
              )}

              {step === 'result' && result && result.failed > 0 && (
                <button
                  onClick={() => {
                    // Download error report
                    const errorReport = result.errors.map(e => 
                      `Red ${e.row}: ${e.message}${e.field ? ` (${e.field})` : ''}`
                    ).join('\n');
                    const blob = new Blob([errorReport], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `import_errors_${new Date().toISOString()}.txt`;
                    a.click();
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  📥 Preuzmi izveštaj o greškama
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
