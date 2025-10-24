import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Autocomplete, AutocompleteOption } from '../components/Autocomplete';
import { logger } from '../utils/logger';

// Types (until @sef-app/shared rebuild is recognized)
interface Partner {
  id: string;
  name: string;
  pib: string;
  type?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  defaultPaymentTerms?: number;
  vatPayer?: boolean;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  unitPrice: number;
  taxRate: number;
}

// Validation schema
const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Broj fakture je obavezan'),
  issueDate: z.string().min(1, 'Datum izdavanja je obavezan'),
  dueDate: z.string().optional(),
  buyerName: z.string().min(1, 'Naziv kupca je obavezan'),
  buyerPIB: z.string().length(9, 'PIB mora imati 9 cifara'),
  buyerAddress: z.string().optional(),
  buyerCity: z.string().optional(),
  buyerPostalCode: z.string().optional(),
  currency: z.string().default('RSD'),
  note: z.string().optional(),
  lines: z.array(z.object({
    name: z.string().min(1, 'Naziv stavke je obavezan'),
    quantity: z.number().positive('Količina mora biti pozitivna'),
    unitPrice: z.number().nonnegative('Cena ne može biti negativna'),
    taxRate: z.number().min(0).max(100, 'PDV stopa mora biti između 0 i 100')
  })).min(1, 'Morate dodati bar jednu stavku')
});

type CreateInvoiceForm = z.infer<typeof createInvoiceSchema>;

interface InvoiceLine {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export const CreateInvoice: React.FC = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([
    { name: '', quantity: 1, unitPrice: 0, taxRate: 20 }
  ]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Map<number, Product>>(new Map());

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CreateInvoiceForm>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currency: 'RSD',
      lines: [{ name: '', quantity: 1, unitPrice: 0, taxRate: 20 }]
    }
  });

  const searchPartners = async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await api.searchPartners(query);
      if (response.success && response.data) {
        return response.data.map((partner: Partner) => ({
          id: partner.id,
          label: partner.name,
          sublabel: `PIB: ${partner.pib} | ${partner.city || 'N/A'}`,
          data: partner
        }));
      }
    } catch (error) {
      logger.error('Partner search error', error);
    }
    return [];
  };

  const searchProducts = async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await api.searchProducts(query);
      if (response.success && response.data) {
        return response.data.map((product: Product) => ({
          id: product.id,
          label: product.name,
          sublabel: `${product.sku || ''} | ${product.unitPrice?.toFixed(2) || '0.00'} RSD | PDV ${product.taxRate || 20}%`,
          data: product
        }));
      }
    } catch (error) {
      logger.error('Product search error', error);
    }
    return [];
  };

  const handlePartnerSelect = (option: AutocompleteOption | null) => {
    if (option) {
      setSelectedPartner(option.data);
      setValue('buyerName', option.data.name);
      setValue('buyerPIB', option.data.pib);
      setValue('buyerAddress', option.data.address || '');
      setValue('buyerCity', option.data.city || '');
      setValue('buyerPostalCode', option.data.postalCode || '');
    } else {
      setSelectedPartner(null);
      setValue('buyerName', '');
      setValue('buyerPIB', '');
      setValue('buyerAddress', '');
      setValue('buyerCity', '');
      setValue('buyerPostalCode', '');
    }
  };

  const handleProductSelect = (index: number, option: AutocompleteOption | null) => {
    const newSelectedProducts = new Map(selectedProducts);
    
    if (option) {
      newSelectedProducts.set(index, option.data);
      setSelectedProducts(newSelectedProducts);
      
      updateLine(index, 'name', option.data.name);
      updateLine(index, 'unitPrice', option.data.unitPrice || 0);
      updateLine(index, 'taxRate', option.data.vatRate || 20);
    } else {
      newSelectedProducts.delete(index);
      setSelectedProducts(newSelectedProducts);
    }
  };

  const addLine = () => {
    const newLines = [...lines, { name: '', quantity: 1, unitPrice: 0, taxRate: 20 }];
    setLines(newLines);
    setValue('lines', newLines);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
      setValue('lines', newLines);
    }
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
    setValue('lines', newLines);
  };

  const onSubmit = async (data: CreateInvoiceForm) => {
    if (!user?.company?.id) {
      setError('Nedostaju podaci o kompaniji');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const invoiceData: any = {
        companyId: user.company.id,
        invoiceNumber: data.invoiceNumber,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        note: data.note,
        lines: data.lines.map((line, index) => ({
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          // Include productId if product was selected from autocomplete
          productId: selectedProducts.has(index) ? selectedProducts.get(index)?.id : null
        }))
      };

      // Partner Integration: Send partnerId if partner was selected from autocomplete
      if (selectedPartner?.id) {
        invoiceData.partnerId = selectedPartner.id;
        // Partner data will be fetched from database on backend
        // No need to send legacy fields
      } else {
        // Legacy: Manual input - send buyer fields
        invoiceData.buyerName = data.buyerName;
        invoiceData.buyerPIB = data.buyerPIB;
        invoiceData.buyerAddress = data.buyerAddress;
        invoiceData.buyerCity = data.buyerCity;
        invoiceData.buyerPostalCode = data.buyerPostalCode;
      }

      const response = await api.createInvoice(invoiceData);
      
      if (response.success) {
        // Redirect to invoice list or show success message
        window.location.href = '/invoices';
      } else {
        setError(response.error || 'Greška pri kreiranju fakture');
      }
    } catch (err) {
      setError('Greška pri kreiranju fakture');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Kreiraj novu fakturu
          </h3>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Broj fakture *
                </label>
                <input
                  {...register('invoiceNumber')}
                  className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    errors.invoiceNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="2024-001"
                />
                {errors.invoiceNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Datum izdavanja *
                </label>
                <input
                  {...register('issueDate')}
                  type="date"
                  className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    errors.issueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.issueDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.issueDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Datum dospijeća
                </label>
                <input
                  {...register('dueDate')}
                  type="date"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valuta
                </label>
                <select
                  {...register('currency')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="RSD">RSD</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Podaci o kupcu</h4>
                {selectedPartner && (
                  <span className="text-sm text-green-600 font-medium">
                    ✅ Partner iz šifarnika
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <Autocomplete
                  label="Izaberite partnera ili unesite ručno"
                  placeholder="Počnite da kucate naziv ili PIB partnera..."
                  required={true}
                  value={watch('buyerName') || ''}
                  onSelect={handlePartnerSelect}
                  onSearch={searchPartners}
                  error={errors.buyerName?.message}
                  allowCustom={true}
                  minChars={2}
                />
              </div>

              {!selectedPartner && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      PIB kupca *
                    </label>
                    <input
                      {...register('buyerPIB')}
                      className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        errors.buyerPIB ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="123456789"
                      maxLength={9}
                    />
                    {errors.buyerPIB && (
                      <p className="mt-1 text-sm text-red-600">{errors.buyerPIB.message}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedPartner && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">PIB:</span>
                      <span className="ml-2 font-medium">{selectedPartner.pib}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tip:</span>
                      <span className="ml-2 font-medium">
                        {selectedPartner.type === 'BUYER' ? 'Kupac' : 
                         selectedPartner.type === 'SUPPLIER' ? 'Dobavljač' : 'Kupac/Dobavljač'}
                      </span>
                    </div>
                    {selectedPartner.address && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600">Adresa:</span>
                        <span className="ml-2">{selectedPartner.address}, {selectedPartner.city} {selectedPartner.postalCode}</span>
                      </div>
                    )}
                    {selectedPartner.email && (
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2">{selectedPartner.email}</span>
                      </div>
                    )}
                    {selectedPartner.phone && (
                      <div>
                        <span className="text-gray-600">Telefon:</span>
                        <span className="ml-2">{selectedPartner.phone}</span>
                      </div>
                    )}
                    {selectedPartner.defaultPaymentTerms && (
                      <div>
                        <span className="text-gray-600">Uslovi plaćanja:</span>
                        <span className="ml-2 font-medium">{selectedPartner.defaultPaymentTerms} dana</span>
                      </div>
                    )}
                    {selectedPartner.vatPayer !== undefined && (
                      <div>
                        <span className="text-gray-600">Poreski obveznik:</span>
                        <span className="ml-2">{selectedPartner.vatPayer ? '✅ Da' : '❌ Ne'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selectedPartner && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Adresa
                    </label>
                    <input
                      {...register('buyerAddress')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Adresa"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Grad
                    </label>
                    <input
                      {...register('buyerCity')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Grad"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Poštanski broj
                    </label>
                    <input
                      {...register('buyerPostalCode')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="11000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Lines */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Stavke fakture</h4>
                <button
                  type="button"
                  onClick={addLine}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  + Dodaj stavku
                </button>
              </div>
              
              {lines.map((line, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 gap-4 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Stavka #{index + 1}
                        {selectedProducts.has(index) && (
                          <span className="ml-2 text-xs text-green-600">✅ Iz šifarnika</span>
                        )}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                        >
                          🗑️ Ukloni
                        </button>
                      )}
                    </div>
                    
                    <Autocomplete
                      label="Proizvod/usluga"
                      placeholder="Počnite da kucate naziv, šifru ili barkod..."
                      required={true}
                      value={line.name}
                      onSelect={(option) => handleProductSelect(index, option)}
                      onSearch={searchProducts}
                      allowCustom={true}
                      minChars={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Količina *
                    </label>
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Jedinična cena *
                    </label>
                    <input
                      type="number"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      PDV stopa *
                    </label>
                    <select
                      value={line.taxRate}
                      onChange={(e) => updateLine(index, 'taxRate', parseFloat(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="0">0%</option>
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="text-sm">
                      <span className="text-gray-600">Iznos:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {(line.quantity * line.unitPrice).toFixed(2)} RSD
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700">
                Napomena
              </label>
              <textarea
                {...register('note')}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Dodatne informacije o fakturi..."
              />
            </div>

            {/* Invoice Summary */}
            <div className="border-t pt-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h4 className="text-md font-medium text-gray-900 mb-4">Rekapitulacija</h4>
                <div className="space-y-2">
                  {lines.map((line, index) => {
                    const subtotal = line.quantity * line.unitPrice;
                    const taxAmount = subtotal * (line.taxRate / 100);
                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {line.name || `Stavka ${index + 1}`} ({line.quantity} × {line.unitPrice.toFixed(2)})
                        </span>
                        <span className="font-medium">{subtotal.toFixed(2)} RSD</span>
                      </div>
                    );
                  })}
                  
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Osnovica:</span>
                      <span className="font-medium">
                        {lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0).toFixed(2)} RSD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">PDV:</span>
                      <span className="font-medium">
                        {lines.reduce((sum, line) => {
                          const subtotal = line.quantity * line.unitPrice;
                          return sum + (subtotal * (line.taxRate / 100));
                        }, 0).toFixed(2)} RSD
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2">
                      <span className="text-gray-900">Ukupno za plaćanje:</span>
                      <span className="text-blue-600">
                        {lines.reduce((sum, line) => {
                          const subtotal = line.quantity * line.unitPrice;
                          const taxAmount = subtotal * (line.taxRate / 100);
                          return sum + subtotal + taxAmount;
                        }, 0).toFixed(2)} RSD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => window.history.back()}
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Kreira se...' : 'Kreiraj fakturu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};