import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { CreateInvoiceRequest } from '../../types/invoice';
import { invoiceService } from '../../services/invoiceService';

interface InvoiceLineForm {
  itemName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    buyerPib: '',
    buyerName: '',
    buyerAddress: '',
    buyerCity: '',
    buyerPostalCode: ''
  });

  const [lines, setLines] = useState<InvoiceLineForm[]>([
    { itemName: '', quantity: 1, unitPrice: 0, vatRate: 20 }
  ]);

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalVat = 0;

    lines.forEach(line => {
      const lineTotal = line.quantity * line.unitPrice;
      const lineVat = lineTotal * (line.vatRate / 100);
      subtotal += lineTotal;
      totalVat += lineVat;
    });

    return {
      subtotal,
      totalVat,
      total: subtotal + totalVat
    };
  };

  const totals = calculateTotals();

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle line changes
  const handleLineChange = (index: number, field: keyof InvoiceLineForm, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      [field]: value
    };
    setLines(newLines);
  };

  // Add new line
  const addLine = () => {
    setLines([...lines, { itemName: '', quantity: 1, unitPrice: 0, vatRate: 20 }]);
  };

  // Remove line
  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.some(line => !line.itemName || line.quantity <= 0 || line.unitPrice <= 0)) {
      setError('Sva polja u stavkama moraju biti popunjena sa validnim vrednostima');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const invoiceData: CreateInvoiceRequest = {
        ...formData,
        lines: lines.map(line => ({
          itemName: line.itemName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate
        }))
      };

      const response = await invoiceService.createInvoice(invoiceData);

      if (response.success) {
        navigate('/invoices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri kreiranju fakture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/invoices')}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova faktura</h1>
          <p className="text-gray-600">Kreiranje nove izlazne fakture</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Osnovne informacije</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broj fakture *
              </label>
              <input
                type="text"
                required
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Unesite broj fakture"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum izdavanja *
              </label>
              <input
                type="date"
                required
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum dospeća
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Podaci o kupcu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIB *
              </label>
              <input
                type="text"
                required
                value={formData.buyerPib}
                onChange={(e) => handleInputChange('buyerPib', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="PIB kupca"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naziv *
              </label>
              <input
                type="text"
                required
                value={formData.buyerName}
                onChange={(e) => handleInputChange('buyerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Naziv kupca"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresa *
              </label>
              <input
                type="text"
                required
                value={formData.buyerAddress}
                onChange={(e) => handleInputChange('buyerAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Adresa kupca"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grad *
              </label>
              <input
                type="text"
                required
                value={formData.buyerCity}
                onChange={(e) => handleInputChange('buyerCity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Grad kupca"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poštanski Broj *
              </label>
              <input
                type="text"
                required
                value={formData.buyerPostalCode}
                onChange={(e) => handleInputChange('buyerPostalCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Poštanski broj"
              />
            </div>
          </div>
        </div>

        {/* Invoice Lines */}
        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Stavke fakture</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Dodaj stavku
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-white/10 rounded-lg">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naziv artikla *
                  </label>
                  <input
                    type="text"
                    required
                    value={line.itemName}
                    onChange={(e) => handleLineChange(index, 'itemName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Naziv artikla"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Količina *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cena (RSD) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => handleLineChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PDV (%)
                    </label>
                    <select
                      value={line.vatRate}
                      onChange={(e) => handleLineChange(index, 'vatRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0}>0%</option>
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </select>
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      title="Ukloni stavku"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ukupno</h2>
          <div className="space-y-2 text-right">
            <div className="flex justify-between">
              <span className="text-gray-600">Osnovica:</span>
              <span className="font-medium">{totals.subtotal.toFixed(2)} RSD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">PDV:</span>
              <span className="font-medium">{totals.totalVat.toFixed(2)} RSD</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Ukupno za naplatu:</span>
              <span>{totals.total.toFixed(2)} RSD</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Otkaži
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sačuvaj fakturu
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
