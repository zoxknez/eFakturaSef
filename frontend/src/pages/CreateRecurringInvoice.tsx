import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { recurringInvoiceService, RecurringFrequency } from '../services/recurringInvoiceService';
import api from '../services/api';
import { Autocomplete, AutocompleteOption } from '../components/Autocomplete';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { logger } from '../utils/logger';
import type { PartnerAutocompleteItem, ProductAutocompleteItem } from '@sef-app/shared';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  vatRate: number;
  unit: string;
}

// Validation schema
const createRecurringSchema = z.object({
  frequency: z.nativeEnum(RecurringFrequency),
  startDate: z.string().min(1, 'Datum početka je obavezan'),
  endDate: z.string().optional(),
  currency: z.string().default('RSD'),
  note: z.string().optional(),
  items: z.array(z.object({
    name: z.string().min(1, 'Naziv stavke je obavezan'),
    quantity: z.number().positive('Količina mora biti pozitivna'),
    price: z.number().nonnegative('Cena ne može biti negativna'),
    vatRate: z.number().min(0).max(100, 'PDV stopa mora biti između 0 i 100'),
    unit: z.string().default('kom')
  })).min(1, 'Morate dodati bar jednu stavku')
});

type CreateRecurringForm = z.infer<typeof createRecurringSchema>;

export const CreateRecurringInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPartner, setSelectedPartner] = useState<PartnerAutocompleteItem | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([{ name: '', quantity: 1, price: 0, vatRate: 20, unit: 'kom' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<CreateRecurringForm>({
    resolver: zodResolver(createRecurringSchema),
    defaultValues: {
      frequency: RecurringFrequency.MONTHLY,
      currency: 'RSD',
      startDate: new Date().toISOString().split('T')[0],
      items: [{ name: '', quantity: 1, price: 0, vatRate: 20, unit: 'kom' }]
    }
  });

  const searchPartners = async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await api.searchPartners(query);
      if (response.success && response.data) {
        return response.data.map((partner) => ({
          id: partner.id,
          label: partner.name,
          sublabel: `PIB: ${partner.pib}`,
          data: partner
        }));
      }
    } catch (err) {
      logger.error('Error searching partners', err);
    }
    return [];
  };

  const searchProducts = async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await api.searchProducts(query);
      if (response.success && response.data) {
        return response.data.map((product) => ({
          id: product.id,
          label: product.name,
          sublabel: `${product.unitPrice} RSD`,
          data: product
        }));
      }
    } catch (err) {
      logger.error('Error searching products', err);
    }
    return [];
  };

  const handlePartnerSelect = (option: AutocompleteOption | null) => {
    setSelectedPartner(option ? option.data as PartnerAutocompleteItem : null);
  };

  const handleProductSelect = (index: number, option: AutocompleteOption | null) => {
    if (option) {
      const product = option.data as ProductAutocompleteItem;
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        name: product.name,
        price: product.unitPrice,
        vatRate: product.taxRate
      };
      setItems(newItems);
      setValue('items', newItems);
    }
  };

  const addItem = () => {
    const newItems = [...items, { name: '', quantity: 1, price: 0, vatRate: 20, unit: 'kom' }];
    setItems(newItems);
    setValue('items', newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      setValue('items', newItems);
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    setValue('items', newItems);
  };

  const onSubmit = async (data: CreateRecurringForm) => {
    if (!selectedPartner) {
      toast.error('Morate izabrati partnera');
      return;
    }

    setIsSubmitting(true);
    try {
      const { items: formItems, ...restData } = data;
      const items = formItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        taxRate: item.vatRate,
        totalAmount: item.quantity * item.price * (1 + item.vatRate / 100)
      }));

      const response = await recurringInvoiceService.create({
        ...restData,
        items,
        partnerId: selectedPartner.id
      });

      if (response.success) {
        toast.success('Uspešno kreirano');
        navigate('/recurring-invoices');
      } else {
        toast.error(response.error || 'Greška prilikom kreiranja');
      }
    } catch (error) {
      logger.error('Error creating recurring invoice', error);
      toast.error('Greška prilikom kreiranja');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nova Periodična Faktura</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Osnovni podaci</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Partner</label>
              <Autocomplete
                label=""
                placeholder="Pretražite partnera..."
                onSearch={searchPartners}
                onSelect={handlePartnerSelect}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Frekvencija</label>
              <select
                {...register('frequency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={RecurringFrequency.WEEKLY}>Nedeljno</option>
                <option value={RecurringFrequency.MONTHLY}>Mesečno</option>
                <option value={RecurringFrequency.QUARTERLY}>Kvartalno</option>
                <option value={RecurringFrequency.YEARLY}>Godišnje</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Datum početka</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Datum završetka (opciono)</label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Napomena</label>
            <textarea
              {...register('note')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">Stavke</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Dodaj stavku
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-4">
                  <Autocomplete
                    label="Proizvod/Usluga"
                    placeholder="Pretražite ili unesite..."
                    value={item.name}
                    onSearch={searchProducts}
                    onSelect={(opt) => handleProductSelect(index, opt)}
                    allowCustom
                  />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Količina</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 border rounded"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Jed. Cena</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 border rounded"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">PDV %</label>
                      <select
                        value={item.vatRate}
                        onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="0">0%</option>
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ukupno</label>
                      <div className="px-2 py-1 bg-gray-100 rounded text-right font-medium">
                        {(item.quantity * item.price * (1 + item.vatRate / 100)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-6"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Otkaži
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Čuvanje...' : 'Sačuvaj'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRecurringInvoice;
