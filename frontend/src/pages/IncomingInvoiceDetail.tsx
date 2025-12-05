import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Check, X, FileText, Download, Printer, Calculator } from 'lucide-react';
import { Autocomplete } from '../components/Autocomplete';
import type { 
  IncomingInvoiceDetail as InvoiceDetailType, 
  IncomingInvoiceLineItem,
  IncomingInvoiceStatus,
  InvoicePaymentStatus,
  ProductAutocompleteItem
} from '@sef-app/shared';

export const IncomingInvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; reason: string }>({ open: false, reason: '' });

  useEffect(() => {
    if (id) loadInvoice(id);
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const response = await api.getIncomingInvoice(invoiceId);
      if (response.success && response.data) {
        setInvoice(response.data);
      } else {
        toast.error(response.error || 'Faktura nije pronađena');
        navigate('/incoming-invoices');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom učitavanja');
      navigate('/incoming-invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string, reason?: string) => {
    if (!id) return;
    
    if (status === 'REJECTED' && !reason) {
      setRejectDialog({ open: true, reason: '' });
      return;
    }

    try {
      setProcessing(true);
      const response = await api.updateIncomingInvoiceStatus(id, status, reason || undefined);
      if (response.success) {
        toast.success(status === 'ACCEPTED' ? 'Faktura odobrena' : 'Faktura odbijena');
        loadInvoice(id);
      } else {
        toast.error(response.error || 'Greška prilikom promene statusa');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom promene statusa');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectDialog.reason.trim()) {
      toast.error('Unesite razlog odbijanja');
      return;
    }
    setRejectDialog({ open: false, reason: '' });
    handleStatusChange('REJECTED', rejectDialog.reason);
  };

  const handleProductSearch = async (query: string) => {
    try {
      const response = await api.searchProducts(query);
      if (response.success && response.data) {
        return response.data.map((p) => ({
          id: p.id,
          label: p.name,
          sublabel: `${p.sku || '-'} • ${p.currentStock || 0} ${p.unit}`,
          data: p
        }));
      }
    } catch (error) {
      console.error('Product search error:', error);
    }
    return [];
  };

  const handleProductMap = async (lineId: string, product: ProductAutocompleteItem | null) => {
    if (!id) return;
    try {
      const response = await api.mapIncomingInvoiceProduct(id, lineId, product?.id || null);
      if (response.success) {
        toast.success(product ? 'Proizvod mapiran' : 'Mapiranje uklonjeno');
        loadInvoice(id);
      } else {
        toast.error(response.error || 'Greška pri mapiranju');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška pri mapiranju');
    }
  };

  const handleDownloadPDF = async () => {
    if (!id) return;
    try {
      await api.downloadIncomingInvoicePDF(id);
    } catch (error) {
      console.error(error);
      toast.error('Greška pri preuzimanju PDF-a');
    }
  };

  const handleDownloadXML = async () => {
    if (!id) return;
    try {
      await api.downloadIncomingInvoiceXML(id);
    } catch (error) {
      console.error(error);
      toast.error('Greška pri preuzimanju XML-a');
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      RECEIVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Primljena' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Na čekanju' },
      ACCEPTED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Odobrena' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Odbijena' },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Otkazana' }
    };
    
    const style = config[status?.toUpperCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Payment status badge
  const getPaymentBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      UNPAID: { bg: 'bg-red-100', text: 'text-red-800', label: 'Neplaćeno' },
      PARTIALLY_PAID: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Delimično plaćeno' },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Plaćeno' },
      OVERDUE: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Prekoračeno' }
    };
    
    const style = config[status?.toUpperCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount: number | string, currency: string = 'RSD') => {
    return new Intl.NumberFormat('sr-RS', { 
      style: 'currency', 
      currency 
    }).format(Number(amount));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 h-96 animate-pulse" />
          <div className="bg-white rounded-xl p-6 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const canProcess = invoice.status === 'RECEIVED' || invoice.status === 'PENDING';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/incoming-invoices')} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Ulazna Faktura #{invoice.invoiceNumber}
              </h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-gray-500 mt-1">
              {invoice.supplierName} • {format(new Date(invoice.issueDate), 'dd.MM.yyyy')}
              {invoice.sefId && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded border border-blue-100">
                  SEF ID: {invoice.sefId}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Download buttons */}
          <button
            onClick={handleDownloadPDF}
            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleDownloadXML}
            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            XML
          </button>
          
          {/* Create Calculation button (only for accepted invoices) */}
          {invoice.status === 'ACCEPTED' && (
            <Link
              to={`/calculations/new?incomingInvoiceId=${invoice.id}`}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Kreiraj Kalkulaciju
            </Link>
          )}
          
          {/* Status action buttons */}
          {canProcess && (
            <>
              <button
                onClick={() => handleStatusChange('REJECTED')}
                disabled={processing}
                className="px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" /> Odbij
              </button>
              <button
                onClick={() => handleStatusChange('ACCEPTED')}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Odobri
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Stavke fakture</h2>
              <span className="text-sm text-gray-500">{invoice.lines?.length || 0} stavki</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Opis</th>
                    <th className="px-6 py-3 font-medium text-gray-500 w-64">Mapirani Proizvod</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Količina</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Cena</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">PDV</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Ukupno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.lines?.map((line: IncomingInvoiceLineItem) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{line.itemName}</td>
                      <td className="px-6 py-2">
                        {canProcess ? (
                          <div className="w-64">
                            <Autocomplete
                              label=""
                              placeholder="Poveži sa proizvodom..."
                              value={line.product?.name || ''}
                              onSearch={handleProductSearch}
                              onSelect={(option) => handleProductMap(line.id, option ? option.data as ProductAutocompleteItem : null)}
                              minChars={1}
                            />
                          </div>
                        ) : (
                          <span className={line.product ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {line.product?.name || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">{Number(line.quantity).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(line.unitPrice, invoice.currency)}</td>
                      <td className="px-6 py-4 text-right text-gray-500">{Number(line.taxRate)}%</td>
                      <td className="px-6 py-4 text-right font-medium">{formatCurrency(line.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right font-medium text-gray-500">Osnovica:</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(Number(invoice.totalAmount) - Number(invoice.taxAmount), invoice.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right font-medium text-gray-500">PDV:</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(invoice.taxAmount, invoice.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right font-bold text-gray-900 text-lg">Ukupno za uplatu:</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600 text-lg">
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Rejection reason if rejected */}
          {invoice.status === 'REJECTED' && invoice.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 mb-2">Razlog odbijanja</h3>
              <p className="text-red-700">{invoice.rejectionReason}</p>
              {invoice.rejectedAt && (
                <p className="text-sm text-red-600 mt-2">
                  Odbijeno: {format(new Date(invoice.rejectedAt), 'dd.MM.yyyy HH:mm')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Podaci o dobavljaču</h3>
            <div>
              <p className="text-sm text-gray-500">Naziv</p>
              <p className="font-medium text-gray-900">{invoice.supplierName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">PIB</p>
              <p className="font-medium text-gray-900">{invoice.supplierPIB}</p>
            </div>
            {invoice.supplierAddress && (
              <div>
                <p className="text-sm text-gray-500">Adresa</p>
                <p className="font-medium text-gray-900">{invoice.supplierAddress}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Detalji plaćanja</h3>
            <div>
              <p className="text-sm text-gray-500">Status plaćanja</p>
              <div className="mt-1">
                {getPaymentBadge(invoice.paymentStatus)}
              </div>
            </div>
            {invoice.paidAmount > 0 && invoice.paymentStatus !== 'PAID' && (
              <div>
                <p className="text-sm text-gray-500">Plaćeno do sada</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(invoice.paidAmount, invoice.currency)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Rok plaćanja</p>
              <p className="font-medium text-gray-900">
                {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd.MM.yyyy') : 'Nije definisano'}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Informacije</h3>
            <div>
              <p className="text-sm text-gray-500">Datum prijema</p>
              <p className="font-medium text-gray-900">
                {format(new Date(invoice.receivedDate), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
            {invoice.acceptedAt && (
              <div>
                <p className="text-sm text-gray-500">Datum odobrenja</p>
                <p className="font-medium text-green-600">
                  {format(new Date(invoice.acceptedAt), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Kreirana</p>
              <p className="font-medium text-gray-900">
                {format(new Date(invoice.createdAt), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Reason Dialog */}
      {rejectDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Odbijanje fakture</h3>
            <textarea
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Unesite razlog odbijanja..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setRejectDialog({ open: false, reason: '' })}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Odustani
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Odbij fakturu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingInvoiceDetail;
