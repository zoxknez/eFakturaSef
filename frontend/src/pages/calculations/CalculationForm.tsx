import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { calculationService } from '../../services/calculationService';
import { useAuth } from '../../contexts/AuthContext';
import { Autocomplete, AutocompleteOption } from '../../components/Autocomplete';
import { logger } from '../../utils/logger';
import apiClient from '../../services/api';
import {
  FileText,
  User,
  Package,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Building2,
  Calculator,
  Save,
  ArrowLeft,
  Sparkles,
  Loader2,
  Info,
  Copy,
  FileCheck,
  Percent,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Calculation, CalculationStatus, CalculationType } from '@sef-app/shared';

// Types
interface Partner {
  id: string;
  name: string;
  pib: string;
  city?: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  unitPrice: number; // Selling price
  taxRate: number;
}

// Validation schema
const createCalculationSchema = z.object({
  number: z.string().min(1, 'Broj kalkulacije je obavezan'),
  date: z.string().min(1, 'Datum je obavezan'),
  partnerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Proizvod je obavezan'),
    productName: z.string().min(1, 'Naziv proizvoda je obavezan'),
    quantity: z.number().positive('Količina mora biti pozitivna'),
    supplierPrice: z.number().nonnegative('Nabavna cena ne može biti negativna'),
    expensePerUnit: z.number().nonnegative().default(0),
    marginPercent: z.number().default(0),
    vatRate: z.number().min(0).max(100, 'PDV stopa mora biti između 0 i 100'),
  })).min(1, 'Morate dodati bar jednu stavku')
});

type CreateCalculationForm = z.infer<typeof createCalculationSchema>;

interface CalculationLine {
  productId: string;
  productName: string;
  quantity: number;
  supplierPrice: number;
  expensePerUnit: number;
  marginPercent: number;
  vatRate: number;
  // Calculated fields for display
  costPrice?: number;
  marginAmount?: number;
  salesPriceNoVat?: number;
  salesPrice?: number;
}

// Stepper configuration
const steps = [
  { id: 1, title: 'Osnovni podaci', icon: FileText, description: 'Broj i dobavljač' },
  { id: 2, title: 'Stavke', icon: Package, description: 'Artikli i cene' },
  { id: 3, title: 'Pregled', icon: FileCheck, description: 'Finalna provera' },
];

export const CalculationForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // If editing
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  
  // Lines state
  const [lines, setLines] = useState<CalculationLine[]>([
    { 
      productId: '', 
      productName: '', 
      quantity: 1, 
      supplierPrice: 0, 
      expensePerUnit: 0, 
      marginPercent: 20, 
      vatRate: 20 
    }
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<CreateCalculationForm>({
    resolver: zodResolver(createCalculationSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      items: []
    }
  });

  const watchedValues = watch();

  // Calculate totals
  const totals = useMemo(() => {
    let totalWholesale = 0;
    let totalExpenses = 0;
    let totalMargin = 0;
    let totalTax = 0;
    let totalRetail = 0;

    lines.forEach(line => {
      const quantity = line.quantity || 0;
      const supplierPrice = line.supplierPrice || 0;
      const expensePerUnit = line.expensePerUnit || 0;
      const marginPercent = line.marginPercent || 0;
      const vatRate = line.vatRate || 0;

      const costPrice = supplierPrice + expensePerUnit;
      const marginAmount = costPrice * (marginPercent / 100);
      const salesPriceNoVat = costPrice + marginAmount;
      const taxAmount = salesPriceNoVat * (vatRate / 100);
      const salesPrice = salesPriceNoVat + taxAmount;

      totalWholesale += supplierPrice * quantity;
      totalExpenses += expensePerUnit * quantity;
      totalMargin += marginAmount * quantity;
      totalTax += taxAmount * quantity;
      totalRetail += salesPrice * quantity;
    });

    return { totalWholesale, totalExpenses, totalMargin, totalTax, totalRetail };
  }, [lines]);

  // Generate number on mount
  useEffect(() => {
    if (!id) {
      const generateNumber = async () => {
        try {
          // Simple generation logic, ideally fetch from backend
          const year = new Date().getFullYear();
          setValue('number', `KALK-${year}-XXXX`); 
        } catch {
          setValue('number', `KALK-${new Date().getFullYear()}-0001`);
        }
      };
      generateNumber();
    }
  }, [setValue, id]);

  const searchPartners = async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await apiClient.searchPartners(query);
      if (response.success && response.data) {
        return response.data.map((partner: Partner) => ({
          id: partner.id,
          label: partner.name,
          sublabel: `PIB: ${partner.pib} | ${partner.city || 'N/A'}`,
          data: partner
        }));
      }
    } catch (err) {
      logger.error('Partner search error', err);
    }
    return [];
  };

  const searchProducts = async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await apiClient.searchProducts(query);
      if (response.success && response.data) {
        return response.data.map((product: Product) => ({
          id: product.id,
          label: product.name,
          sublabel: `${product.sku || ''} | Trenutna cena: ${product.unitPrice?.toFixed(2) || '0.00'} RSD`,
          data: product
        }));
      }
    } catch (err) {
      logger.error('Product search error', err);
    }
    return [];
  };

  const handlePartnerSelect = (option: AutocompleteOption | null) => {
    if (option) {
      setSelectedPartner(option.data);
      setValue('partnerId', option.data.id);
    } else {
      setSelectedPartner(null);
      setValue('partnerId', undefined);
    }
  };

  const handleProductSelect = (index: number, option: AutocompleteOption | null) => {
    const newLines = [...lines];
    if (option) {
      newLines[index] = {
        ...newLines[index],
        productId: option.data.id,
        productName: option.data.name,
        vatRate: option.data.taxRate || 20
      };
    } else {
      newLines[index] = {
        ...newLines[index],
        productId: '',
        productName: '',
      };
    }
    setLines(newLines);
    setValue('items', newLines);
  };

  const addLine = () => {
    const newLines = [...lines, { 
      productId: '', 
      productName: '', 
      quantity: 1, 
      supplierPrice: 0, 
      expensePerUnit: 0, 
      marginPercent: 20, 
      vatRate: 20 
    }];
    setLines(newLines);
    setValue('items', newLines);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
      setValue('items', newLines);
    }
  };

  const updateLine = (index: number, field: keyof CalculationLine, value: number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
    setValue('items', newLines);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1:
        return await trigger(['number', 'date', 'partnerId']);
      case 2:
        return lines.length > 0 && lines.every(l => l.productId && l.quantity > 0);
      default:
        return true;
    }
  };

  const nextStep = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setError(null);
    } else {
      setError('Molimo popunite sva obavezna polja');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const onSubmit = async (data: CreateCalculationForm) => {
    if (!user?.company?.id) {
      setError('Nedostaju podaci o kompaniji');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const calculationData = {
        companyId: user.company.id,
        ...data,
        type: CalculationType.WHOLESALE,
        status: CalculationStatus.DRAFT,
        totalPurchaseValue: totals.totalWholesale,
        totalExpenses: totals.totalExpenses,
        totalCostValue: totals.totalWholesale + totals.totalExpenses,
        totalMargin: totals.totalMargin,
        totalTax: totals.totalTax,
        totalSellingValue: totals.totalRetail,
        items: lines.map(line => {
          const quantity = line.quantity || 0;
          const purchasePrice = line.supplierPrice || 0;
          const expenseAmount = line.expensePerUnit || 0;
          const marginPercentage = line.marginPercent || 0;
          const taxRate = line.vatRate || 0;

          const costPrice = purchasePrice + expenseAmount;
          const marginAmount = costPrice * (marginPercentage / 100);
          const sellingPriceNoVat = costPrice + marginAmount;
          const taxAmount = sellingPriceNoVat * (taxRate / 100);
          const sellingPrice = sellingPriceNoVat + taxAmount;

          return {
            productId: line.productId,
            productName: line.productName,
            quantity,
            purchasePrice,
            expenseAmount,
            costPrice,
            marginPercentage,
            marginAmount,
            sellingPriceNoVat,
            taxRate,
            taxAmount,
            sellingPrice
          };
        })
      };

      // @ts-ignore - Partial<Calculation> type mismatch with strict schema but valid for creation
      const response = await calculationService.create(calculationData);
      
      if (response.success) {
        setSuccess('Kalkulacija uspešno kreirana!');
        setTimeout(() => {
          navigate('/calculations');
        }, 1500);
      } else {
        setError(response.error || 'Greška pri kreiranju kalkulacije');
      }
    } catch {
      setError('Greška pri kreiranju kalkulacije');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/calculations')}
                className="p-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <Calculator className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Nova Kalkulacija</h1>
                    <p className="text-indigo-200 mt-1">Izrada kalkulacije cena</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Live Total */}
            <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-indigo-200">Ukupna prodajna vrednost</p>
              <p className="text-3xl font-bold">{formatCurrency(totals.totalRetail)}</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-8">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                      className={`flex flex-col items-center gap-2 transition-all duration-300 ${
                        step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                      disabled={step.id > currentStep}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' 
                          : isActive 
                            ? 'bg-white text-indigo-900 shadow-lg shadow-white/30' 
                            : 'bg-white/10'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        ) : (
                          <StepIcon className={`w-6 h-6 ${isActive ? 'text-indigo-900' : 'text-white'}`} />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-indigo-200'}`}>
                          {step.title}
                        </p>
                      </div>
                    </button>
                    
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded-full transition-colors duration-300 ${
                        currentStep > step.id ? 'bg-emerald-500' : 'bg-white/20'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Messages */}
      {(success || error) && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-xl shadow-2xl backdrop-blur-sm animate-slideIn
                        ${success ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <div className="flex items-center gap-3">
            {success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <p className="font-medium">{success || error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl overflow-hidden">
          
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="p-8 space-y-8 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Osnovni podaci</h2>
                  <p className="text-sm text-gray-500">Unesite broj kalkulacije i dobavljača</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Number */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                    Broj kalkulacije
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('number')}
                    className={`w-full px-4 py-3 bg-white/70 backdrop-blur-sm border rounded-xl shadow-sm 
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all
                               ${errors.number ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {errors.number && (
                    <p className="text-sm text-red-500">{errors.number.message}</p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Datum
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('date')}
                    type="date"
                    className={`w-full px-4 py-3 bg-white/70 backdrop-blur-sm border rounded-xl shadow-sm 
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all
                               ${errors.date ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500">{errors.date.message}</p>
                  )}
                </div>

                {/* Partner */}
                <div className="space-y-4 md:col-span-2">
                  <Autocomplete
                    label="Dobavljač"
                    placeholder="Pretražite dobavljače..."
                    required={false}
                    value={selectedPartner?.name || ''}
                    onSelect={handlePartnerSelect}
                    onSearch={searchPartners}
                    error={errors.partnerId?.message}
                    minChars={2}
                  />
                  
                  {selectedPartner && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedPartner.name}</p>
                        <p className="text-sm text-gray-500">PIB: {selectedPartner.pib}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Items */}
          {currentStep === 2 && (
            <div className="p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Stavke kalkulacije</h2>
                    <p className="text-sm text-gray-500">{lines.length} stavk{lines.length === 1 ? 'a' : 'i'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium 
                             rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all
                             flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Dodaj stavku
                </button>
              </div>

              <div className="space-y-4">
                {lines.map((line, index) => {
                  // Calculate derived values for display
                  const costPrice = (line.supplierPrice || 0) + (line.expensePerUnit || 0);
                  const marginAmount = costPrice * ((line.marginPercent || 0) / 100);
                  const salesPriceNoVat = costPrice + marginAmount;
                  const taxAmount = salesPriceNoVat * ((line.vatRate || 0) / 100);
                  const salesPrice = salesPriceNoVat + taxAmount;

                  return (
                    <div 
                      key={index} 
                      className="p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm 
                                 hover:shadow-md transition-shadow animate-fadeIn"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 
                                          rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900">
                            {line.productName || 'Nova stavka'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <Autocomplete
                          label="Proizvod"
                          placeholder="Pretražite proizvode..."
                          required={true}
                          value={line.productName}
                          onSelect={(option) => handleProductSelect(index, option)}
                          onSearch={searchProducts}
                          minChars={2}
                        />

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">Količina</label>
                            <input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                              min="0"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">Nabavna cena</label>
                            <input
                              type="number"
                              value={line.supplierPrice}
                              onChange={(e) => updateLine(index, 'supplierPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                              min="0"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">Zav. trošak</label>
                            <input
                              type="number"
                              value={line.expensePerUnit}
                              onChange={(e) => updateLine(index, 'expensePerUnit', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                              min="0"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">Marža %</label>
                            <input
                              type="number"
                              value={line.marginPercent}
                              onChange={(e) => updateLine(index, 'marginPercent', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">PDV %</label>
                            <select
                              value={line.vatRate}
                              onChange={(e) => updateLine(index, 'vatRate', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="0">0%</option>
                              <option value="10">10%</option>
                              <option value="20">20%</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">Prodajna cena</label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-700 text-right">
                              {formatCurrency(salesPrice)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Detailed breakdown per item */}
                        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                          <div>Cena koštanja: {formatCurrency(costPrice)}</div>
                          <div>Marža iznos: {formatCurrency(marginAmount)}</div>
                          <div>Prodajna bez PDV: {formatCurrency(salesPriceNoVat)}</div>
                          <div>PDV iznos: {formatCurrency(taxAmount)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pregled kalkulacije</h2>
                  <p className="text-sm text-gray-500">Proverite podatke pre čuvanja</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-4">Osnovni podaci</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Broj:</span>
                        <span className="font-medium">{watchedValues.number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Datum:</span>
                        <span className="font-medium">{new Date(watchedValues.date).toLocaleDateString('sr-RS')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dobavljač:</span>
                        <span className="font-medium">{selectedPartner?.name || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-indigo-500" />
                      Rekapitulacija
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nabavna vrednost</span>
                        <span className="font-medium">{formatCurrency(totals.totalWholesale)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Zavisni troškovi</span>
                        <span className="font-medium">{formatCurrency(totals.totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Ukupna marža</span>
                        <span className="font-medium">{formatCurrency(totals.totalMargin)}</span>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <span>Ukupan PDV</span>
                        <span className="font-medium">{formatCurrency(totals.totalTax)}</span>
                      </div>
                      <div className="pt-3 border-t border-indigo-200">
                        <div className="flex justify-between">
                          <span className="text-lg font-bold text-gray-900">Ukupna prodajna vrednost</span>
                          <span className="text-xl font-bold text-indigo-700">
                            {formatCurrency(totals.totalRetail)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={currentStep === 1 ? () => navigate('/calculations') : prevStep}
                className="px-6 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-100 
                           transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                {currentStep === 1 ? 'Otkaži' : 'Nazad'}
              </button>

              <div className="flex items-center gap-3">
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold 
                               rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 
                               transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    Dalje
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold 
                               rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 
                               transform hover:-translate-y-0.5 transition-all flex items-center gap-2
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Čuvanje...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Sačuvaj kalkulaciju
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
