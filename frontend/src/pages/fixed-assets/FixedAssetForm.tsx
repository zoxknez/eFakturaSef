import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { fixedAssetService } from '../../services/fixedAssetService';
import { FixedAssetStatus } from '@sef-app/shared';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

// Schema for the form
const formSchema = z.object({
  inventoryNumber: z.string().min(1, 'Inventarski broj je obavezan'),
  name: z.string().min(1, 'Naziv je obavezan'),
  purchaseDate: z.string().min(1, 'Datum nabavke je obavezan'),
  purchaseValue: z.number({ invalid_type_error: 'Morate uneti broj' }).min(0, 'Vrednost ne može biti negativna'),
  amortizationRate: z.number({ invalid_type_error: 'Morate uneti broj' }).min(0).max(100, 'Stopa ne može biti veća od 100%'),
  supplierId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employee: z.string().optional().nullable(),
  status: z.nativeEnum(FixedAssetStatus).default(FixedAssetStatus.ACTIVE)
});

type FormData = z.infer<typeof formSchema>;

export const FixedAssetForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: FixedAssetStatus.ACTIVE,
      amortizationRate: 10 // Default 10%
    }
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadAsset(id);
    }
  }, [id, isEditMode]);

  const loadAsset = async (assetId: string) => {
    try {
      const response = await fixedAssetService.getById(assetId);
      if (response.success && response.data) {
        const asset = response.data;
        reset({
          inventoryNumber: asset.inventoryNumber,
          name: asset.name,
          purchaseDate: new Date(asset.purchaseDate).toISOString().split('T')[0],
          purchaseValue: Number(asset.purchaseValue),
          amortizationRate: Number(asset.amortizationRate),
          supplierId: asset.supplierId,
          invoiceNumber: asset.invoiceNumber,
          location: asset.location,
          employee: asset.employee,
          status: asset.status as FixedAssetStatus
        });
      }
    } catch (error) {
      console.error('Failed to load asset:', error);
      toast.error('Greška pri učitavanju podataka');
      navigate('/fixed-assets');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      // Calculate current value (initially same as purchase value for new assets)
      // For edit, backend handles it or we keep existing logic
      const payload = {
        ...data,
        currentValue: data.purchaseValue, // Initial current value
        accumulatedAmortization: 0,
        companyId: 'placeholder', // Backend fills this
        id: 'placeholder', // Backend fills this
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (isEditMode && id) {
        await fixedAssetService.update(id, data);
        toast.success('Osnovno sredstvo uspešno ažurirano');
      } else {
        await fixedAssetService.create(payload);
        toast.success('Osnovno sredstvo uspešno kreirano');
      }
      navigate('/fixed-assets');
    } catch (error) {
      console.error('Failed to save asset:', error);
      toast.error('Greška pri čuvanju podataka');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <button
          onClick={() => navigate('/fixed-assets')}
          className="flex items-center text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Nazad na listu
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Izmena osnovnog sredstva' : 'Novo osnovno sredstvo'}
        </h1>
        <p className="text-gray-500 mt-2">
          {isEditMode ? 'Izmenite podatke o osnovnom sredstvu.' : 'Unesite podatke za novo osnovno sredstvo.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">1</span>
            Osnovni podaci
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inventarski broj <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('inventoryNumber')}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="npr. OS-001"
              />
              {errors.inventoryNumber && (
                <p className="mt-1 text-sm text-red-500">{errors.inventoryNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naziv sredstva <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="npr. Laptop Dell XPS 15"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokacija
              </label>
              <input
                type="text"
                {...register('location')}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="npr. Kancelarija 101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zaduženo lice
              </label>
              <input
                type="text"
                {...register('employee')}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Ime i prezime zaposlenog"
              />
            </div>
          </div>
        </div>

        {/* Financial Info Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">2</span>
            Finansijski podaci
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum nabavke <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('purchaseDate')}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {errors.purchaseDate && (
                <p className="mt-1 text-sm text-red-500">{errors.purchaseDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nabavna vrednost (RSD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('purchaseValue', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {errors.purchaseValue && (
                <p className="mt-1 text-sm text-red-500">{errors.purchaseValue.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stopa amortizacije (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amortizationRate', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {errors.amortizationRate && (
                <p className="mt-1 text-sm text-red-500">{errors.amortizationRate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broj fakture dobavljača
              </label>
              <input
                type="text"
                {...register('invoiceNumber')}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Broj ulazne fakture"
              />
            </div>
            
            {/* Supplier selection could be a dropdown in future */}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/fixed-assets')}
            disabled={isSubmitting}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Otkaži
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Čuvanje...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sačuvaj
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
