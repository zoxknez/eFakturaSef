import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  Send, 
  Printer, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Building2,
  Calendar,
  Hash,
  CreditCard,
  Percent,
  Receipt,
  Edit,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  type: string;
  partnerName: string;
  partnerPIB: string;
  partnerAddress: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  sefId?: string;
  sefStatus?: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  DRAFT: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Clock className="w-4 h-4" />, label: 'Nacrt' },
  SENT: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <Send className="w-4 h-4" />, label: 'Poslato' },
  APPROVED: { color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="w-4 h-4" />, label: 'Prihvaćena' },
  REJECTED: { color: 'text-red-600', bgColor: 'bg-red-100', icon: <AlertCircle className="w-4 h-4" />, label: 'Odbijena' },
  CANCELLED: { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <AlertCircle className="w-4 h-4" />, label: 'Otkazana' },
};

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    // Mock data - in production, fetch from API
    setTimeout(() => {
      setInvoice({
        id: id || '1',
        invoiceNumber: '2024-001',
        issueDate: '2024-10-01',
        dueDate: '2024-10-31',
        status: 'APPROVED',
        type: 'OUTGOING',
        partnerName: 'Test Partner d.o.o.',
        partnerPIB: '123456789',
        partnerAddress: 'Ulica Primera 123, 11000 Beograd',
        subtotal: 41666.67,
        taxAmount: 8333.33,
        total: 50000.00,
        currency: 'RSD',
        sefId: 'SEF-2024-123456',
        sefStatus: 'Prihvaćeno',
        items: [
          { id: '1', description: 'Usluge programiranja', quantity: 40, unitPrice: 1041.67, taxRate: 20, amount: 41666.67 },
        ],
      });
      setLoading(false);
    }, 500);
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sr-RS');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Faktura nije pronađena</h2>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad na listu faktura
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-cyan-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad na fakture
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
                <p className="text-white/70 mt-1">{invoice.partnerName}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-200">
                <Printer className="w-4 h-4" />
                Štampaj
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-200">
                <Download className="w-4 h-4" />
                PDF
              </button>
              {invoice.status === 'DRAFT' && (
                <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-900 rounded-xl hover:bg-white/90 transition-all duration-200 font-medium shadow-lg">
                  <Send className="w-4 h-4" />
                  Pošalji na SEF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${statusConfig.bgColor} ${statusConfig.color}`}>
          {statusConfig.icon}
          <span className="font-medium">{statusConfig.label}</span>
        </div>
        {invoice.sefId && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl">
            <ExternalLink className="w-4 h-4" />
            <span className="font-mono text-sm">{invoice.sefId}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Partner Info */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Informacije o partneru</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Naziv firme</div>
                <div className="font-semibold text-gray-900">{invoice.partnerName}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">PIB</div>
                <div className="font-mono font-semibold text-gray-900">{invoice.partnerPIB}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl md:col-span-2">
                <div className="text-sm text-gray-500 mb-1">Adresa</div>
                <div className="font-semibold text-gray-900">{invoice.partnerAddress}</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Stavke fakture</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Opis</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Količina</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Cena</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">PDV</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Iznos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-900">{item.description}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{item.taxRate}%</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Datumi</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Datum izdavanja</span>
                <span className="font-semibold text-gray-900">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Rok plaćanja</span>
                <span className="font-semibold text-gray-900">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Finansijski pregled</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Osnovica</span>
                <span className="font-mono font-semibold text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500">PDV (20%)</span>
                <span className="font-mono font-semibold text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl text-white">
                <span className="font-medium">UKUPNO</span>
                <span className="font-mono font-bold text-xl">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Akcije</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200">
                <Edit className="w-4 h-4" />
                Izmeni fakturu
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200">
                <Copy className="w-4 h-4" />
                Kopiraj fakturu
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200">
                <Trash2 className="w-4 h-4" />
                Obriši fakturu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};