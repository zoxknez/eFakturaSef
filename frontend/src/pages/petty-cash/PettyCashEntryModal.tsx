import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Minus } from 'lucide-react';
import { pettyCashService } from '../../services/pettyCashService';
import { PettyCashEntrySchema, PettyCashType } from '@sef-app/shared';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { logger } from '../../utils/logger';

interface PettyCashEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountId: string;
  type: PettyCashType;
}

type FormData = z.infer<typeof PettyCashEntrySchema>;

export const PettyCashEntryModal: React.FC<PettyCashEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  type
}) => {
  const [loading, setLoading] = useState(false);
  const [entryNumber, setEntryNumber] = useState('');

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(PettyCashEntrySchema),
    defaultValues: {
      accountId,
      type,
      date: new Date().toISOString().split('T')[0],
      amount: 0
    }
  });

  useEffect(() => {
    if (isOpen && accountId) {
      fetchNextNumber();
      setValue('accountId', accountId);
      setValue('type', type);
    }
  }, [isOpen, accountId, type]);

  const fetchNextNumber = async () => {
    try {
      const response = await pettyCashService.getNextEntryNumber(accountId);
      if (response.success && response.data) {
        setEntryNumber(response.data.number);
        setValue('entryNumber', response.data.number);
      }
    } catch (error) {
      logger.error('Failed to fetch next number', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await pettyCashService.createEntry(data);
      toast.success(type === PettyCashType.DEPOSIT ? 'Uplata evidentirana' : 'Isplata evidentirana');
      onSuccess();
      onClose();
      reset();
    } catch (error) {
      logger.error('Failed to create entry', error);
      toast.error('Greška pri kreiranju naloga');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                type === PettyCashType.DEPOSIT ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {type === PettyCashType.DEPOSIT ? (
                  <Plus className="h-6 w-6 text-green-600" />
                ) : (
                  <Minus className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {type === PettyCashType.DEPOSIT ? 'Nova Uplata' : 'Nova Isplata'}
                </h3>
                <div className="mt-4">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Broj naloga</label>
                        <input
                          type="text"
                          {...register('entryNumber')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                        <input
                          type="date"
                          {...register('date')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Iznos (RSD)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('amount', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                        placeholder="0.00"
                      />
                      {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Unesite opis transakcije..."
                      />
                      {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                    </div>

                    {type === PettyCashType.WITHDRAWAL && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategorija troška</label>
                        <input
                          type="text"
                          {...register('expenseCategory')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="npr. Gorivo, Reprezentacija..."
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Partner / Lice</label>
                      <input
                        type="text"
                        {...register('partnerName')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ime i prezime ili naziv firme"
                      />
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                          type === PettyCashType.DEPOSIT 
                            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                            : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        }`}
                      >
                        {loading ? <LoadingSpinner size="sm" /> : 'Sačuvaj'}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Otkaži
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
