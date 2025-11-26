import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { pettyCashService } from '../../services/pettyCashService';
import { LoadingSpinner } from '../../components/LoadingSpinner';

interface PettyCashAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const schema = z.object({
  name: z.string().min(1, 'Naziv je obavezan'),
  currency: z.string().min(3, 'Valuta mora imati 3 slova').max(3),
});

type FormData = z.infer<typeof schema>;

export const PettyCashAccountModal: React.FC<PettyCashAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      currency: 'RSD'
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await pettyCashService.createAccount(data.name, data.currency);
      toast.success('Blagajna uspešno kreirana');
      onSuccess();
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error('Greška pri kreiranju blagajne');
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
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Nova Blagajna
                </h3>
                <div className="mt-4">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Naziv blagajne</label>
                      <input
                        type="text"
                        {...register('name')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="npr. Glavna blagajna"
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
                      <select
                        {...register('currency')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="RSD">RSD</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                      {errors.currency && <p className="text-red-500 text-xs mt-1">{errors.currency.message}</p>}
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        {loading ? <LoadingSpinner size="sm" /> : 'Kreiraj'}
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
