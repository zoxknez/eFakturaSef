/**
 * Email Notifications Page
 * Upravljanje email šablonima i pregled email logova
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  Mail,
  Plus,
  Send,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '../services/api';

interface EmailTemplate {
  id: string;
  companyId: string | null;
  type: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface EmailLog {
  id: string;
  toEmail: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  templateId?: string;
  referenceType?: string;
  referenceId?: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

const TEMPLATE_TYPES = [
  { value: 'INVOICE_SENT', label: 'Faktura poslata' },
  { value: 'PAYMENT_REMINDER', label: 'Podsetnik za plaćanje' },
  { value: 'PAYMENT_OVERDUE', label: 'Faktura dospela' },
  { value: 'IOS_REQUEST', label: 'IOS zahtev' },
  { value: 'COMPENSATION', label: 'Kompenzacija' },
  { value: 'WELCOME', label: 'Dobrodošlica' },
  { value: 'CUSTOM', label: 'Prilagođeno' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Na čekanju', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SENT: { label: 'Poslato', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  FAILED: { label: 'Neuspešno', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export const EmailNotifications: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company?.id || '';

  // State
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');
  const [loading, setLoading] = useState(true);
  
  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    type: 'INVOICE_SENT',
    name: '',
    subject: '',
    bodyHtml: '',
    bodyText: '',
  });
  
  // Logs
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logFilter, setLogFilter] = useState({
    status: '',
    referenceType: '',
    search: '',
  });
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  
  // Preview
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);

  useEffect(() => {
    if (companyId) {
      if (activeTab === 'templates') {
        fetchTemplates();
      } else {
        fetchLogs();
      }
    }
  }, [companyId, activeTab, logFilter.status, logPage]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmailTemplate[]>(
        `/email-notifications/companies/${companyId}/templates`
      );
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Greška pri učitavanju šablona');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (logFilter.status) params.append('status', logFilter.status);
      if (logFilter.referenceType) params.append('referenceType', logFilter.referenceType);
      params.append('page', logPage.toString());
      params.append('limit', '20');
      
      const response = await apiClient.get<{ data: EmailLog[]; pagination: any }>(
        `/email-notifications/companies/${companyId}/logs?${params}`
      );
      if (response.success && response.data) {
        setLogs(response.data.data);
        setLogTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Greška pri učitavanju logova');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        const response = await apiClient.put(
          `/email-notifications/templates/${editingTemplate.id}`,
          templateForm
        );
        if (response.success) {
          toast.success('Šablon ažuriran');
        }
      } else {
        const response = await apiClient.post(
          `/email-notifications/companies/${companyId}/templates`,
          templateForm
        );
        if (response.success) {
          toast.success('Šablon kreiran');
        }
      }
      setShowTemplateModal(false);
      resetTemplateForm();
      fetchTemplates();
    } catch (error) {
      toast.error('Greška pri čuvanju šablona');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Obrisati ovaj šablon?')) return;
    
    try {
      const response = await apiClient.delete(`/email-notifications/templates/${id}`);
      if (response.success) {
        toast.success('Šablon obrisan');
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Greška pri brisanju šablona');
    }
  };

  const handleResendEmail = async (logId: string) => {
    try {
      const response = await apiClient.post(
        `/email-notifications/companies/${companyId}/logs/${logId}/resend`
      );
      if (response.success) {
        toast.success('Email ponovo poslat');
        fetchLogs();
      }
    } catch (error) {
      toast.error('Greška pri ponovnom slanju');
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      type: 'INVOICE_SENT',
      name: '',
      subject: '',
      bodyHtml: '',
      bodyText: '',
    });
    setEditingTemplate(null);
  };

  const openEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      type: template.type,
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText || '',
    });
    setShowTemplateModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-Latn-RS');
  };

  const getTemplateTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type;
  };

  const filteredLogs = logs.filter(log => 
    logFilter.search === '' ||
    log.toEmail.toLowerCase().includes(logFilter.search.toLowerCase()) ||
    log.subject.toLowerCase().includes(logFilter.search.toLowerCase())
  );

  if (loading && templates.length === 0 && logs.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Email Notifikacije</h1>
          <p className="text-gray-500 mt-1">Upravljanje email šablonima i pregled poslatih poruka</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Šabloni
            </div>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email logovi
            </div>
          </button>
        </nav>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetTemplateForm();
                setShowTemplateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Novi Šablon
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nema definisanih email šablona</p>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {getTemplateTypeLabel(template.type)}
                      </span>
                      {template.isDefault && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Podrazumevani
                        </span>
                      )}
                      {!template.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                          Neaktivan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditTemplate(template)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pretraži po email adresi ili temi..."
                  value={logFilter.search}
                  onChange={(e) => setLogFilter({ ...logFilter, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <select
                value={logFilter.status}
                onChange={(e) => setLogFilter({ ...logFilter, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Svi statusi</option>
                <option value="PENDING">Na čekanju</option>
                <option value="SENT">Poslato</option>
                <option value="FAILED">Neuspešno</option>
              </select>
              <select
                value={logFilter.referenceType}
                onChange={(e) => setLogFilter({ ...logFilter, referenceType: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Svi tipovi</option>
                <option value="invoice">Faktura</option>
                <option value="payment_reminder">Podsetnik</option>
                <option value="ios">IOS</option>
              </select>
              <button
                onClick={fetchLogs}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Primalac</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tema</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tip</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Datum</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>Nema email logova</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const StatusIcon = STATUS_CONFIG[log.status]?.icon || Clock;
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{log.toEmail}</p>
                              {log.toName && (
                                <p className="text-sm text-gray-500">{log.toName}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate" title={log.subject}>
                            {log.subject}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600 capitalize">
                              {log.referenceType?.replace('_', ' ') || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[log.status]?.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {STATUS_CONFIG[log.status]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(log.sentAt || log.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setPreviewLog(log)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Pregledaj"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {log.status === 'FAILED' && (
                                <button
                                  onClick={() => handleResendEmail(log.id)}
                                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                  title="Pošalji ponovo"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logTotalPages > 1 && (
              <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => setLogPage(p => Math.max(1, p - 1))}
                  disabled={logPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Prethodna
                </button>
                <span className="text-sm text-gray-600">
                  Strana {logPage} od {logTotalPages}
                </span>
                <button
                  onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))}
                  disabled={logPage === logTotalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Sledeća
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                {editingTemplate ? 'Izmeni Šablon' : 'Novi Email Šablon'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip šablona</label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!!editingTemplate}
                  >
                    {TEMPLATE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naziv šablona</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="npr. Moj šablon za fakturu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tema (subject)</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="npr. Faktura {invoiceNumber} - {companyName}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dostupne varijable: {'{companyName}'}, {'{partnerName}'}, {'{invoiceNumber}'}, {'{amount}'}, {'{dueDate}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sadržaj (HTML)</label>
                <textarea
                  value={templateForm.bodyHtml}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  rows={10}
                  placeholder="<div>Poštovani {partnerName},...</div>"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Odustani
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateForm.name || !templateForm.subject || !templateForm.bodyHtml}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Pregled Email-a</h2>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[previewLog.status]?.color}`}>
                  {STATUS_CONFIG[previewLog.status]?.label}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Primalac</p>
                  <p className="font-medium">{previewLog.toEmail}</p>
                </div>
                <div>
                  <p className="text-gray-500">Datum</p>
                  <p className="font-medium">{formatDate(previewLog.sentAt || previewLog.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-1">Tema</p>
                <p className="font-medium">{previewLog.subject}</p>
              </div>

              {previewLog.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Greška pri slanju</span>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{previewLog.errorMessage}</p>
                </div>
              )}

              <div>
                <p className="text-gray-500 text-sm mb-2">Sadržaj</p>
                <div 
                  className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: previewLog.bodyHtml }}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {previewLog.status === 'FAILED' && (
                <button
                  onClick={() => {
                    handleResendEmail(previewLog.id);
                    setPreviewLog(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Pošalji ponovo
                </button>
              )}
              <button
                onClick={() => setPreviewLog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailNotifications;
