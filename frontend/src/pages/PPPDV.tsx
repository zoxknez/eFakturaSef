/**
 * PPPDV Page - PDV Poreska Prijava
 * Kreiranje i upravljanje PPPDV prijavama za ePorezi
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { logger } from '../utils/logger';
import {
  FileText,
  Plus,
  Calculator,
  Send,
  Download,
  Trash2,
  RefreshCw,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import pppdvService, { PPPDVReport, PPPDVCalculation } from '../services/pppdvService';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Nacrt', color: 'bg-gray-100 text-gray-700', icon: FileText },
  CALCULATED: { label: 'Obračunato', color: 'bg-blue-100 text-blue-700', icon: Calculator },
  SUBMITTED: { label: 'Poslato', color: 'bg-yellow-100 text-yellow-700', icon: Send },
  ACCEPTED: { label: 'Prihvaćeno', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Odbijeno', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const PERIOD_TYPES = [
  { value: 'MONTHLY', label: 'Mesečno' },
  { value: 'QUARTERLY', label: 'Kvartalno' },
];

const MONTHS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

const QUARTERS = ['I kvartal', 'II kvartal', 'III kvartal', 'IV kvartal'];

export const PPPDV: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company?.id || '';

  // State
  const [reports, setReports] = useState<PPPDVReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    year: new Date().getFullYear(),
    periodType: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY',
    month: new Date().getMonth(), // 0-indexed, previous month
    quarter: Math.floor(new Date().getMonth() / 3),
  });
  const [calculating, setCalculating] = useState(false);
  const [previewData, setPreviewData] = useState<PPPDVCalculation | null>(null);

  // Confirm dialogs
  const [submitConfirm, setSubmitConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  // Fetch reports
  useEffect(() => {
    if (companyId) {
      fetchReports();
    }
  }, [companyId, selectedYear]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await pppdvService.getReports(companyId, { year: selectedYear });
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (error) {
      logger.error('Error fetching PPPDV reports:', error);
      toast.error('Greška pri učitavanju PPPDV prijava');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      const response = await pppdvService.calculate(companyId, {
        year: createData.year,
        periodType: createData.periodType,
        month: createData.periodType === 'MONTHLY' ? createData.month + 1 : undefined,
        quarter: createData.periodType === 'QUARTERLY' ? createData.quarter + 1 : undefined,
      });
      
      if (response.success && response.data) {
        setPreviewData(response.data);
      } else {
        toast.error(response.error || 'Greška pri obračunu');
      }
    } catch (error) {
      logger.error('Error calculating PPPDV:', error);
      toast.error('Greška pri obračunu PPPDV');
    } finally {
      setCalculating(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCalculating(true);
      const response = await pppdvService.create(companyId, {
        year: createData.year,
        periodType: createData.periodType,
        month: createData.periodType === 'MONTHLY' ? createData.month + 1 : undefined,
        quarter: createData.periodType === 'QUARTERLY' ? createData.quarter + 1 : undefined,
      });
      
      if (response.success) {
        toast.success('PPPDV prijava kreirana');
        setShowCreateModal(false);
        setPreviewData(null);
        fetchReports();
      } else {
        toast.error(response.error || 'Greška pri kreiranju prijave');
      }
    } catch (error) {
      logger.error('Error creating PPPDV:', error);
      toast.error('Greška pri kreiranju PPPDV prijave');
    } finally {
      setCalculating(false);
    }
  };

  const handleRecalculate = async (reportId: string) => {
    try {
      const response = await pppdvService.recalculate(companyId, reportId);
      if (response.success) {
        toast.success('Prijava ponovo obračunata');
        fetchReports();
      } else {
        toast.error(response.error || 'Greška pri ponovnom obračunu');
      }
    } catch (error) {
      toast.error('Greška pri ponovnom obračunu');
    }
  };

  const handleGenerateXML = async (reportId: string) => {
    try {
      const response = await pppdvService.generateXML(companyId, reportId);
      if (response.success && response.data) {
        // Create download link
        const blob = new Blob([response.data.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('XML fajl preuzet');
      }
    } catch (error) {
      toast.error('Greška pri generisanju XML-a');
    }
  };

  const handleSubmit = async (reportId: string) => {
    setSubmitConfirm({ open: false, id: null });
    
    try {
      const response = await pppdvService.submit(companyId, reportId);
      if (response.success) {
        toast.success('Prijava poslata na ePorezi');
        fetchReports();
      } else {
        toast.error(response.error || 'Greška pri slanju prijave');
      }
    } catch (error) {
      toast.error('Greška pri slanju prijave');
    }
  };

  const handleDelete = async (reportId: string) => {
    setDeleteConfirm({ open: false, id: null });
    
    try {
      const response = await pppdvService.delete(companyId, reportId);
      if (response.success) {
        toast.success('Prijava obrisana');
        fetchReports();
      } else {
        toast.error(response.error || 'Greška pri brisanju');
      }
    } catch (error) {
      toast.error('Greška pri brisanju prijave');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPeriodLabel = (report: PPPDVReport) => {
    if (report.periodType === 'MONTHLY' && report.month) {
      return `${MONTHS[report.month - 1]} ${report.year}`;
    } else if (report.periodType === 'QUARTERLY' && report.quarter) {
      return `${QUARTERS[report.quarter - 1]} ${report.year}`;
    }
    return `${report.year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PPPDV Poreske Prijave</h1>
          <p className="text-gray-500 mt-1">Kreiranje i upravljanje PDV prijavama za ePorezi</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Prijava
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ukupno prijava</p>
              <p className="text-xl font-bold">{reports.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Prihvaćeno</p>
              <p className="text-xl font-bold">
                {reports.filter(r => r.status === 'ACCEPTED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Na čekanju</p>
              <p className="text-xl font-bold">
                {reports.filter(r => r.status === 'SUBMITTED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calculator className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nacrti</p>
              <p className="text-xl font-bold">
                {reports.filter(r => ['DRAFT', 'CALCULATED'].includes(r.status)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nema PPPDV prijava za {selectedYear}. godinu</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Kreiraj novu prijavu
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reports.map((report) => {
              const StatusIcon = STATUS_CONFIG[report.status]?.icon || FileText;
              const isExpanded = expandedReportId === report.id;

              return (
                <div key={report.id} className="p-4">
                  {/* Report Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{getPeriodLabel(report)}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${STATUS_CONFIG[report.status]?.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_CONFIG[report.status]?.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {report.periodType === 'MONTHLY' ? 'Mesečna' : 'Kvartalna'} prijava
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">PDV obaveza</p>
                        <p className={`font-medium ${report.field401 > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(report.field401)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {['DRAFT', 'CALCULATED'].includes(report.status) && (
                          <>
                            <button
                              onClick={() => handleRecalculate(report.id)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Ponovo obračunaj"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGenerateXML(report.id)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Preuzmi XML"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSubmitConfirm({ open: true, id: report.id })}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Pošalji na ePorezi"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ open: true, id: report.id })}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Obriši"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {report.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleGenerateXML(report.id)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="Preuzmi XML"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {['ACCEPTED', 'REJECTED'].includes(report.status) && (
                          <button
                            onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Detalji"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Promet dobara i usluga */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 mb-3">Promet dobara i usluga</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">001 - Opšta stopa (20%)</span>
                              <span>{formatCurrency(report.field001)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">002 - Posebna stopa (10%)</span>
                              <span>{formatCurrency(report.field002)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">003 - Oslobođeno sa pravom</span>
                              <span>{formatCurrency(report.field003)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">004 - Oslobođeno bez prava</span>
                              <span>{formatCurrency(report.field004)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">005 - Član 6a</span>
                              <span>{formatCurrency(report.field005)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Obračunati PDV */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 mb-3">Obračunati PDV</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">201 - PDV 20%</span>
                              <span>{formatCurrency(report.field201)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">202 - PDV 10%</span>
                              <span>{formatCurrency(report.field202)}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-1">
                              <span>203 - Ukupno obračunat</span>
                              <span>{formatCurrency(report.field203)}</span>
                            </div>
                          </div>

                          <h4 className="font-medium text-gray-900 mt-4 mb-3">Prethodni PDV</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">301 - Prethodni PDV 20%</span>
                              <span>{formatCurrency(report.field301)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">302 - Prethodni PDV 10%</span>
                              <span>{formatCurrency(report.field302)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">303 - PDV pri uvozu</span>
                              <span>{formatCurrency(report.field303)}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-1">
                              <span>304 - Ukupno prethodni</span>
                              <span>{formatCurrency(report.field304)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Poreska obaveza */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 mb-3">Poreska obaveza</h4>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Obračunati PDV</span>
                              <span>{formatCurrency(report.field203)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Prethodni PDV</span>
                              <span>- {formatCurrency(report.field304)}</span>
                            </div>
                            <div className="border-t pt-2">
                              {report.field401 > 0 ? (
                                <div className="flex justify-between font-medium text-red-600">
                                  <span>401 - PDV za uplatu</span>
                                  <span>{formatCurrency(report.field401)}</span>
                                </div>
                              ) : (
                                <div className="flex justify-between font-medium text-green-600">
                                  <span>402 - PDV za povraćaj</span>
                                  <span>{formatCurrency(report.field402)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {report.submissionReference && (
                            <div className="mt-4 text-sm">
                              <p className="text-gray-600">Referenca prijave:</p>
                              <p className="font-mono text-gray-900">{report.submissionReference}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Nova PPPDV Prijava</h2>
              <p className="text-gray-500 mt-1">Kreiraj novu PDV prijavu za ePorezi</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Period selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Godina</label>
                  <select
                    value={createData.year}
                    onChange={(e) => setCreateData({ ...createData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip perioda</label>
                  <select
                    value={createData.periodType}
                    onChange={(e) => setCreateData({ 
                      ...createData, 
                      periodType: e.target.value as 'MONTHLY' | 'QUARTERLY' 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PERIOD_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {createData.periodType === 'MONTHLY' ? 'Mesec' : 'Kvartal'}
                </label>
                <select
                  value={createData.periodType === 'MONTHLY' ? createData.month : createData.quarter}
                  onChange={(e) => {
                    if (createData.periodType === 'MONTHLY') {
                      setCreateData({ ...createData, month: parseInt(e.target.value) });
                    } else {
                      setCreateData({ ...createData, quarter: parseInt(e.target.value) });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {createData.periodType === 'MONTHLY' 
                    ? MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)
                    : QUARTERS.map((q, i) => <option key={i} value={i}>{q}</option>)
                  }
                </select>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {calculating ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    Obračunaj PDV
                  </>
                )}
              </button>

              {/* Preview */}
              {previewData && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium">Pregled obračuna</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Izlazni PDV (opšta stopa)</p>
                      <p className="font-medium">{formatCurrency(previewData.outputVAT.general.tax)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Izlazni PDV (posebna stopa)</p>
                      <p className="font-medium">{formatCurrency(previewData.outputVAT.reduced.tax)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ulazni PDV (pretporez)</p>
                      <p className="font-medium">{formatCurrency(previewData.totalInputVAT)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ukupan izlazni PDV</p>
                      <p className="font-medium">{formatCurrency(previewData.totalOutputVAT)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">PDV za uplatu/povraćaj:</span>
                      <span className={`text-lg font-bold ${previewData.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(previewData.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setPreviewData(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Odustani
              </button>
              <button
                onClick={handleCreate}
                disabled={!previewData || calculating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kreiraj prijavu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={submitConfirm.open}
        onClose={() => setSubmitConfirm({ open: false, id: null })}
        onConfirm={() => submitConfirm.id && handleSubmit(submitConfirm.id)}
        title="Slanje na ePorezi"
        message="Da li ste sigurni da želite da pošaljete prijavu na ePorezi?"
        confirmText="Pošalji"
        cancelText="Odustani"
        variant="info"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => deleteConfirm.id && handleDelete(deleteConfirm.id)}
        title="Brisanje prijave"
        message="Da li ste sigurni da želite da obrišete ovu prijavu?"
        confirmText="Obriši"
        cancelText="Odustani"
        variant="danger"
      />
    </div>
  );
};

export default PPPDV;
