import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Eye, Trash2, Send, Download, FileDown, FileX } from 'lucide-react';
import { Invoice } from '../../types/invoice';
import { invoiceService } from '../../services/invoiceService';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3003';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load invoices on component mount
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoices();
      if (response.success && response.data) {
        setInvoices(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu fakturu?')) {
      return;
    }

    try {
      await invoiceService.deleteInvoice(id);
      await loadInvoices(); // Reload the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri brisanju fakture');
    }
  };

  const handleSendToSEF = async (id: string) => {
    if (!confirm('Da li želite da pošaljete ovu fakturu u SEF sistem?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await invoiceService.sendInvoiceToSEF(id);

      if (response.success) {
        alert('Faktura je uspešno poslata u SEF sistem!');
        await loadInvoices(); // Reload to show updated status
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri slanju fakture u SEF sistem');
    } finally {
      setLoading(false);
    }
  };

  const parseFilename = (contentDisposition: string | null, fallback: string) => {
    if (!contentDisposition) return fallback;
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition);
    const encoded = (match && (match[1] || match[2])) || fallback;
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  };

  const downloadInvoice = async (id: string, format: 'xml' | 'json' | 'pdf') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/invoices/${id}/download?format=${format}` as string, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition');
      const filename = parseFilename(cd, `faktura_${id}.${format}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri preuzimanju');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'ACCEPTED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Nacrt';
      case 'SENT':
        return 'Poslato';
      case 'DELIVERED':
        return 'Dostavljeno';
      case 'ACCEPTED':
        return 'Prihvaćeno';
      case 'REJECTED':
        return 'Odbačeno';
      case 'CANCELLED':
        return 'Otkazano';
      case 'STORNO':
        return 'Stornirana';
      case 'EXPIRED':
        return 'Istekla';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Greška</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              📄 Pregled svih faktura
            </h2>
            <p className="text-gray-600 mt-1">Upravljanje, pretraga i praćenje statusa</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadInvoices}
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              🔄 Osveži
            </button>
            <button
              onClick={() => navigate('/invoices/create')}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Kreiraj novu
            </button>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  📄 Broj fakture
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  📅 Datum izdavanja
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  🏢 Partner
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  💰 Iznos
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  📊 Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ↔️ Tip
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ⚡ Akcije
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Nema kreiranih faktura</h3>
                        <p className="mt-1 text-sm text-gray-500">Početna strana - kreirajte vašu prvu fakturu</p>
                      </div>
                      <button
                        onClick={() => navigate('/invoices/create')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Kreiraj prvu fakturu
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900">
                            {invoice.invoiceNumber}
                          </span>
                          <p className="text-xs text-gray-500">ID: {invoice.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(invoice.issueDate).toLocaleDateString('sr-RS')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.direction === 'OUTGOING' ? invoice.buyer.name : invoice.supplier.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        PIB: {invoice.direction === 'OUTGOING' ? invoice.buyer.pib : invoice.supplier.pib}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.totalAmount.toLocaleString('sr-RS', {
                        style: 'currency',
                        currency: invoice.currency
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.direction === 'OUTGOING'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {invoice.direction === 'OUTGOING' ? 'Izlazna' : 'Ulazna'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Pregled"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <DropdownMenu
                          trigger={
                            <button
                              className="text-gray-700 hover:text-gray-900 p-1"
                              title="Preuzmi"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          }
                        >
                          <DropdownMenuItem
                            onClick={() => downloadInvoice(invoice.id, 'pdf')}
                            icon={<FileDown className="w-4 h-4 text-red-500" />}
                          >
                            Preuzmi PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => downloadInvoice(invoice.id, 'xml')}
                            icon={<FileX className="w-4 h-4 text-green-500" />}
                          >
                            Preuzmi XML
                          </DropdownMenuItem>
                        </DropdownMenu>

                        {invoice.status === 'DRAFT' && invoice.direction === 'OUTGOING' && (
                          <>
                            <button
                              onClick={() => handleSendToSEF(invoice.id)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Pošalji u SEF"
                              disabled={loading}
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Obriši"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;
