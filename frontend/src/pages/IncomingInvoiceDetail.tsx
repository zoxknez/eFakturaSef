import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Autocomplete } from '../components/Autocomplete';

interface Product {
  id: string;
  name: string;
  code: string;
  unit: string;
  currentStock: number;
}

interface InvoiceLine {
  id: string;
  itemName: string;
  productId?: string;
  product?: {
    name: string;
  };
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierPIB: string;
  supplierAddress?: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  paymentStatus: string;
  currency: string;
  totalAmount: number;
  taxAmount: number;
  lines: InvoiceLine[];
}

export const IncomingInvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) loadInvoice(id);
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const response = await api.getIncomingInvoice(invoiceId);
      if (response.success) {
        setInvoice(response.data);
      } else {
        toast.error('Faktura nije pronađena');
        navigate('/incoming-invoices');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom učitavanja');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    
    const reason = status === 'REJECTED' ? prompt('Unesite razlog odbijanja:') : undefined;
    if (status === 'REJECTED' && !reason) return;

    try {
      setProcessing(true);
      const response = await api.updateIncomingInvoiceStatus(id, status, reason || undefined);
      if (response.success) {
        toast.success(status === 'ACCEPTED' ? 'Faktura odobrena' : 'Faktura odbijena');
        loadInvoice(id);
      } else {
        toast.error('Greška prilikom promene statusa');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom promene statusa');
    } finally {
      setProcessing(false);
    }
  };

  const handleProductSearch = async (query: string) => {
    const response = await api.searchProducts(query);
    if (response.success && response.data) {
      return response.data.map((p: Product) => ({
        id: p.id,
        label: p.name,
        sublabel: `${p.code} • ${p.currentStock || 0} ${p.unit}`,
        data: p
      }));
    }
    return [];
  };

  const handleProductMap = async (lineId: string, product: Product | null) => {
    if (!id) return;
    try {
      await api.mapIncomingInvoiceProduct(id, lineId, product?.id || null);
      toast.success('Proizvod mapiran');
      // Optimistic update or reload
      loadInvoice(id);
    } catch (error) {
      console.error(error);
      toast.error('Greška pri mapiranju');
    }
  };

  if (loading) return <div className="p-8 text-center">Učitavanje...</div>;
  if (!invoice) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ulazna Faktura #{invoice.invoiceNumber}
            </h1>
            <p className="text-gray-500">
              {invoice.supplierName} • {format(new Date(invoice.issueDate), 'dd.MM.yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {invoice.status === 'RECEIVED' || invoice.status === 'PENDING' ? (
            <>
              <button
                onClick={() => handleStatusChange('REJECTED')}
                disabled={processing}
                className="px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Odbij
              </button>
              <button
                onClick={() => handleStatusChange('ACCEPTED')}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Odobri
              </button>
            </>
          ) : (
            <div className={`px-4 py-2 rounded-lg font-medium ${
              invoice.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 
              invoice.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
            }`}>
              Status: {invoice.status === 'ACCEPTED' ? 'Odobrena' : invoice.status === 'REJECTED' ? 'Odbijena' : invoice.status}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Stavke fakture</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Opis</th>
                    <th className="px-6 py-3 font-medium text-gray-500 w-64">Mapirani Proizvod</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Količina</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Cena</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Ukupno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.lines?.map((line: InvoiceLine) => (
                    <tr key={line.id}>
                      <td className="px-6 py-4 font-medium text-gray-900">{line.itemName}</td>
                      <td className="px-6 py-2">
                        {invoice.status === 'RECEIVED' || invoice.status === 'PENDING' ? (
                          <div className="w-64">
                            <Autocomplete
                              label=""
                              placeholder="Poveži sa proizvodom..."
                              value={line.product?.name || (line.productId ? 'Učitavanje...' : '')}
                              onSearch={handleProductSearch}
                              onSelect={(option) => handleProductMap(line.id, option ? option.data : null)}
                              minChars={1}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-600">
                            {line.product?.name || (line.productId ? 'Mapiran proizvod' : '-')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">{Number(line.quantity).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">{Number(line.unitPrice).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-medium">{Number(line.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-medium text-gray-500">Osnovica:</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {(Number(invoice.totalAmount) - Number(invoice.taxAmount)).toFixed(2)} {invoice.currency}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-medium text-gray-500">PDV:</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {Number(invoice.taxAmount).toFixed(2)} {invoice.currency}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-bold text-gray-900 text-lg">Ukupno za uplatu:</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600 text-lg">
                      {Number(invoice.totalAmount).toFixed(2)} {invoice.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
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
              <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                invoice.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {invoice.paymentStatus === 'PAID' ? 'Plaćeno' : 'Nije plaćeno'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rok plaćanja</p>
              <p className="font-medium text-gray-900">
                {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd.MM.yyyy') : 'Nije definisano'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingInvoiceDetail;
