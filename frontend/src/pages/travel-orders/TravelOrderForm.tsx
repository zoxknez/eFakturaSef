import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TravelOrderSchema, TravelOrder, TravelOrderStatus, TravelOrderExpenseType } from '@sef-app/shared';
import { travelOrderService } from '../../services/travelOrderService';
import { logger } from '../../utils/logger';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const TravelOrderForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isEdit = !!id;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TravelOrder>({
    resolver: zodResolver(TravelOrderSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true, 
      number: true,
      totalExpenses: true,
      totalPayout: true,
      companyId: true
    })),
    defaultValues: {
      status: TravelOrderStatus.DRAFT,
      expenses: [],
      advanceAmount: 0,
      country: 'RS'
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "expenses"
  });

  // Watch values for calculations
  const expenses = watch('expenses');
  const advanceAmount = watch('advanceAmount');

  // Calculate totals
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0;
  const totalPayout = totalExpenses - (Number(advanceAmount) || 0);

  useEffect(() => {
    if (isEdit) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await travelOrderService.getTravelOrderById(id!);
      if (response.success && response.data) {
        const data = response.data;
        // Format dates for input
        setValue('employeeName', data.employeeName);
        setValue('destination', data.destination);
        setValue('country', data.country);
        setValue('vehicle', data.vehicle);
        setValue('advanceAmount', data.advanceAmount);
        setValue('status', data.status);
        setValue('expenses', data.expenses);
        
        if (data.departureDate) {
            setValue('departureDate', new Date(data.departureDate).toISOString().split('T')[0]);
        }
        if (data.returnDate) {
            setValue('returnDate', new Date(data.returnDate).toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      logger.error('Failed to load order:', error);
      toast.error('Greška pri učitavanju naloga');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      
      // Ensure dates are Date objects or ISO strings
      const payload = {
        ...data,
        departureDate: new Date(data.departureDate),
        returnDate: new Date(data.returnDate),
        expenses: data.expenses.map((exp: any) => ({
            ...exp,
            amount: Number(exp.amount),
            date: new Date(exp.date)
        }))
      };

      if (isEdit) {
        await travelOrderService.updateTravelOrder(id!, payload);
        toast.success('Putni nalog ažuriran');
      } else {
        await travelOrderService.createTravelOrder(payload);
        toast.success('Putni nalog kreiran');
      }
      navigate('/travel-orders');
    } catch (error) {
      logger.error('Failed to save order:', error);
      toast.error('Greška pri čuvanju naloga');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Izmena putnog naloga' : 'Novi putni nalog'}
          </h1>
          <p className="text-gray-500">
            {isEdit ? 'Izmenite detalje naloga i troškova' : 'Unesite detalje službenog puta'}
          </p>
        </div>
        <button
          onClick={() => navigate('/travel-orders')}
          className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Odustani
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-4">
            Osnovni podaci
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Zaposleni</label>
              <input
                {...register('employeeName')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Ime i prezime"
              />
              {errors.employeeName && <p className="text-sm text-red-500">{errors.employeeName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Vozilo</label>
              <input
                {...register('vehicle')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Registracija ili tip vozila"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Destinacija</label>
              <input
                {...register('destination')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Grad, Mesto"
              />
              {errors.destination && <p className="text-sm text-red-500">{errors.destination.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Država</label>
              <select
                {...register('country')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="RS">Srbija</option>
                <option value="ME">Crna Gora</option>
                <option value="BA">Bosna i Hercegovina</option>
                <option value="HR">Hrvatska</option>
                <option value="EU">Evropska Unija</option>
                <option value="OTHER">Ostalo</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Datum polaska</label>
              <input
                type="date"
                {...register('departureDate')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {errors.departureDate && <p className="text-sm text-red-500">{errors.departureDate.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Datum povratka</label>
              <input
                type="date"
                {...register('returnDate')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {errors.returnDate && <p className="text-sm text-red-500">{errors.returnDate.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Akontacija (RSD)</label>
              <input
                type="number"
                step="0.01"
                {...register('advanceAmount', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                {Object.values(TravelOrderStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Troškovi</h2>
            <button
              type="button"
              onClick={() => append({ 
                type: TravelOrderExpenseType.OTHER, 
                date: new Date().toISOString().split('T')[0], 
                amount: 0, 
                currency: 'RSD',
                description: '' 
              })}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              + Dodaj trošak
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-gray-50 rounded-xl">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tip</label>
                  <select
                    {...register(`expenses.${index}.type`)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  >
                    {Object.values(TravelOrderExpenseType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Datum</label>
                  <input
                    type="date"
                    {...register(`expenses.${index}.date`)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Opis</label>
                  <input
                    {...register(`expenses.${index}.description`)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    placeholder="Opis troška"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Iznos</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`expenses.${index}.amount`, { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valuta</label>
                  <select
                    {...register(`expenses.${index}.currency`)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="RSD">RSD</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div className="md:col-span-1 pt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            
            {fields.length === 0 && (
              <p className="text-center text-gray-500 py-4">Nema unetih troškova.</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row justify-end gap-8">
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Ukupni troškovi</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalExpenses.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Akontacija</p>
              <p className="text-2xl font-bold text-gray-500">
                -{Number(advanceAmount || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
              </p>
            </div>
            <div className="text-right border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-8">
              <p className="text-sm text-gray-500 mb-1">Za isplatu</p>
              <p className={`text-3xl font-bold ${totalPayout >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {totalPayout.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/travel-orders')}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Odustani
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Čuvanje...' : 'Sačuvaj nalog'}
          </button>
        </div>
      </form>
    </div>
  );
};
