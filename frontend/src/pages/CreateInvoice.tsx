import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Autocomplete, AutocompleteOption } from '../components/Autocomplete';
import { logger } from '../utils/logger';
import type { 
  PartnerAutocompleteItem, 
  ProductAutocompleteItem, 
  CreateInvoiceDTO,
  CreateInvoiceLineDTO,
  UnitOfMeasure,
  PaymentMethod
} from '@sef-app/shared';
import { InvoiceStatus } from '@sef-app/shared';
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
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Calculator,
  Send,
  Save,
  ArrowLeft,
  Sparkles,
  Clock,
  Receipt,
  Hash,
  Loader2,
  Info,
  Copy,
  FileCheck,
  Percent,
  Banknote,
  Ruler
} from 'lucide-react';

// Unit of measure options
const UNIT_OPTIONS: { value: UnitOfMeasure | string; label: string }[] = [
  { value: 'kom', label: 'Komad' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'l', label: 'Litar' },
  { value: 'm', label: 'Metar' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'h', label: 'Sat' },
  { value: 'dan', label: 'Dan' },
  { value: 'mes', label: 'Mesec' },
  { value: 'god', label: 'Godina' },
  { value: 'pkt', label: 'Paket' },
  { value: 'set', label: 'Set' },
];

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
  paymentMethod: z.string().default('TRANSFER'),
  lines: z.array(z.object({
    name: z.string().min(1, 'Naziv stavke je obavezan'),
    quantity: z.number().positive('Količina mora biti pozitivna'),
    unitPrice: z.number().nonnegative('Cena ne može biti negativna'),
    taxRate: z.number().min(0).max(100, 'PDV stopa mora biti između 0 i 100'),
    discount: z.number().min(0).max(100).optional(),
    unit: z.string().optional()
  })).min(1, 'Morate dodati bar jednu stavku')
});

type CreateInvoiceForm = z.infer<typeof createInvoiceSchema>;

interface InvoiceLine {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  unit: string;
  productId?: string;
}

// Stepper configuration
const steps = [
  { id: 1, title: 'Osnovni podaci', icon: FileText, description: 'Broj i datumi' },
  { id: 2, title: 'Kupac', icon: User, description: 'Podaci kupca' },
  { id: 3, title: 'Stavke', icon: Package, description: 'Proizvodi/usluge' },
  { id: 4, title: 'Pregled', icon: FileCheck, description: 'Finalna provera' },
];

export const CreateInvoice: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([
    { name: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0, unit: 'kom' }
  ]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerAutocompleteItem | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Map<number, ProductAutocompleteItem>>(new Map());

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<CreateInvoiceForm>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currency: 'RSD',
      paymentMethod: 'TRANSFER',
      issueDate: new Date().toISOString().split('T')[0],
      lines: [{ name: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0 }]
    }
  });

  const watchedValues = watch();

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const discountAmount = lineSubtotal * (line.discount / 100);
      return sum + (lineSubtotal - discountAmount);
    }, 0);
    
    const tax = lines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const discountAmount = lineSubtotal * (line.discount / 100);
      const taxableAmount = lineSubtotal - discountAmount;
      return sum + (taxableAmount * (line.taxRate / 100));
    }, 0);
    
    const totalDiscount = lines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      return sum + (lineSubtotal * (line.discount / 100));
    }, 0);
    
    return { subtotal, tax, totalDiscount, total: subtotal + tax };
  }, [lines]);

  // Generate invoice number on mount
  useEffect(() => {
    const generateInvoiceNumber = async () => {
      try {
        const year = new Date().getFullYear();
        const response = await api.getInvoices({ limit: 1, sortBy: 'createdAt', sortOrder: 'desc' });
        const invoices = response?.data?.data;
        if (response?.success && invoices && invoices.length > 0) {
          const lastNumber = parseInt(invoices[0].invoiceNumber?.split('-')[1] || '0');
          setValue('invoiceNumber', `${year}-${String(lastNumber + 1).padStart(4, '0')}`);
        } else {
          setValue('invoiceNumber', `${year}-0001`);
        }
      } catch {
        setValue('invoiceNumber', `${new Date().getFullYear()}-0001`);
      }
    };
    generateInvoiceNumber();
  }, [setValue]);

  // Auto-dismiss messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const searchPartners = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await api.searchPartners(query);
      if (response.success && response.data) {
        return response.data.map((partner) => ({
          id: partner.id,
          label: partner.name,
          sublabel: `PIB: ${partner.pib} | ${partner.city || 'N/D'}`,
          data: partner
        }));
      }
    } catch (err) {
      logger.error('Partner search error', err);
    }
    return [];
  }, []);

  const searchProducts = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await api.searchProducts(query);
      if (response.success && response.data) {
        return response.data.map((product) => ({
          id: product.id,
          label: product.name,
          sublabel: `${product.sku || ''} | ${product.unitPrice?.toFixed(2) || '0.00'} RSD | PDV ${product.taxRate || 20}%`,
          data: product
        }));
      }
    } catch (err) {
      logger.error('Product search error', err);
    }
    return [];
  }, []);

  const handlePartnerSelect = (option: AutocompleteOption | null) => {
    if (option) {
      const partner = option.data as PartnerAutocompleteItem;
      setSelectedPartner(partner);
      setValue('buyerName', partner.name);
      setValue('buyerPIB', partner.pib);
      setValue('buyerAddress', partner.address || '');
      setValue('buyerCity', partner.city || '');
      setValue('buyerPostalCode', partner.postalCode || '');
      
      // Auto-set due date based on payment terms
      if (partner.defaultPaymentTerms) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + partner.defaultPaymentTerms);
        setValue('dueDate', dueDate.toISOString().split('T')[0]);
      }
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
      const product = option.data as ProductAutocompleteItem;
      newSelectedProducts.set(index, product);
      setSelectedProducts(newSelectedProducts);
      
      updateLine(index, 'name', product.name);
      updateLine(index, 'unitPrice', product.unitPrice || 0);
      updateLine(index, 'taxRate', product.taxRate || 20);
      updateLine(index, 'unit', product.unit || 'kom');
    } else {
      newSelectedProducts.delete(index);
      setSelectedProducts(newSelectedProducts);
    }
  };

  const addLine = () => {
    const newLines = [...lines, { name: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0, unit: 'kom' }];
    setLines(newLines);
    setValue('lines', newLines);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
      setValue('lines', newLines);
      
      const newSelectedProducts = new Map<number, ProductAutocompleteItem>();
      selectedProducts.forEach((product, i) => {
        if (i < index) newSelectedProducts.set(i, product);
        else if (i > index) newSelectedProducts.set(i - 1, product);
      });
      setSelectedProducts(newSelectedProducts);
    }
  };

  const duplicateLine = (index: number) => {
    const newLines = [...lines];
    newLines.splice(index + 1, 0, { ...lines[index] });
    setLines(newLines);
    setValue('lines', newLines);
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
    setValue('lines', newLines);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1:
        return await trigger(['invoiceNumber', 'issueDate']);
      case 2:
        return selectedPartner !== null || await trigger(['buyerName', 'buyerPIB']);
      case 3:
        return lines.length > 0 && lines.every(l => l.name && l.quantity > 0);
      default:
        return true;
    }
  };

  const nextStep = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      setError(null);
    } else {
      setError('Molimo popunite sva obavezna polja');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const onSubmit = async (data: CreateInvoiceForm) => {
    if (!user?.company?.id) {
      setError('Nedostaju podaci o kompaniji');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const invoiceLines: CreateInvoiceLineDTO[] = lines.map((line, index) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        discount: line.discount,
        unit: line.unit,
        productId: selectedProducts.get(index)?.id
      }));

      const invoiceData: CreateInvoiceDTO = {
        companyId: user.company.id,
        invoiceNumber: data.invoiceNumber,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        note: data.note,
        paymentMethod: data.paymentMethod as PaymentMethod,
        lines: invoiceLines,
        ...(selectedPartner?.id
          ? { partnerId: selectedPartner.id }
          : {
              buyerName: data.buyerName,
              buyerPIB: data.buyerPIB,
              buyerAddress: data.buyerAddress,
              buyerCity: data.buyerCity,
              buyerPostalCode: data.buyerPostalCode
            }
        )
      };

      const response = await api.createInvoice(invoiceData);
      
      if (response.success) {
        setSuccess('Faktura uspešno kreirana!');
        setTimeout(() => {
          navigate('/invoices');
        }, 1500);
      } else {
        setError(response.error || 'Greška pri kreiranju fakture');
      }
    } catch {
      setError('Greška pri kreiranju fakture');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: watchedValues.currency || 'RSD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Save as draft
  const saveDraft = async () => {
    if (!user?.company?.id) {
      setError('Nedostaju podaci o kompaniji');
      return;
    }

    setIsSavingDraft(true);
    setError(null);

    try {
      const invoiceLines: CreateInvoiceLineDTO[] = lines.map((line, index) => ({
        name: line.name || 'Stavka',
        quantity: line.quantity || 1,
        unitPrice: line.unitPrice || 0,
        taxRate: line.taxRate || 20,
        discount: line.discount || 0,
        unit: line.unit || 'kom',
        productId: selectedProducts.get(index)?.id
      }));

      const invoiceData: CreateInvoiceDTO = {
        companyId: user.company.id,
        invoiceNumber: watchedValues.invoiceNumber || '',
        issueDate: watchedValues.issueDate || new Date().toISOString().split('T')[0],
        dueDate: watchedValues.dueDate,
        currency: watchedValues.currency || 'RSD',
        note: watchedValues.note,
        paymentMethod: (watchedValues.paymentMethod || 'TRANSFER') as PaymentMethod,
        status: InvoiceStatus.DRAFT,
        lines: invoiceLines,
        ...(selectedPartner?.id
          ? { partnerId: selectedPartner.id }
          : {
              buyerName: watchedValues.buyerName || 'Nepoznat',
              buyerPIB: watchedValues.buyerPIB || '000000000',
              buyerAddress: watchedValues.buyerAddress,
              buyerCity: watchedValues.buyerCity,
              buyerPostalCode: watchedValues.buyerPostalCode
            }
        )
      };

      const response = await api.createInvoice(invoiceData);
      
      if (response.success) {
        setSuccess('Nacrt fakture uspešno sačuvan!');
        setTimeout(() => {
          navigate('/invoices');
        }, 1500);
      } else {
        setError(response.error || 'Greška pri čuvanju nacrta');
      }
    } catch {
      setError('Greška pri čuvanju nacrta');
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <Receipt className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Nova Faktura</h1>
                    <p className="text-indigo-200 mt-1 text-sm md:text-base">Kreiranje izlazne fakture</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Live Total */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 w-full md:w-auto">
              <div className="flex justify-between items-center md:block text-right">
                <p className="text-sm text-indigo-200">Ukupno</p>
                <p className="text-2xl md:text-3xl font-bold">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
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
                      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' 
                          : isActive 
                            ? 'bg-white text-indigo-900 shadow-lg shadow-white/30' 
                            : 'bg-white/10'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        ) : (
                          <StepIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? 'text-indigo-900' : 'text-white'}`} />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`text-xs sm:text-sm font-semibold ${isActive ? 'text-white' : 'text-indigo-200'} hidden xs:block`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-indigo-300 hidden sm:block">{step.description}</p>
                      </div>
                    </button>
                    
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full transition-colors duration-300 ${
                        currentStep > step.id ? 'bg-emerald-500' : 'bg-white/20'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Decorative */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
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
                  <h2 className="text-xl font-bold text-gray-900">Osnovni podaci fakture</h2>
                  <p className="text-sm text-gray-500">Unesite broj fakture i datume</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoice Number */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Hash className="w-4 h-4 text-gray-400" />
                    Broj fakture
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('invoiceNumber')}
                      className={`w-full px-4 py-3 bg-white/70 backdrop-blur-sm border rounded-xl shadow-sm 
                                 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all
                                 ${errors.invoiceNumber ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="2025-0001"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                  </div>
                  {errors.invoiceNumber && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.invoiceNumber.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Automatski generisan, možete promeniti</p>
                </div>

                {/* Issue Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Datum izdavanja
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('issueDate')}
                    type="date"
                    className={`w-full px-4 py-3 bg-white/70 backdrop-blur-sm border rounded-xl shadow-sm 
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all
                               ${errors.issueDate ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {errors.issueDate && (
                    <p className="text-sm text-red-500">{errors.issueDate.message}</p>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Datum dospeća
                  </label>
                  <input
                    {...register('dueDate')}
                    type="date"
                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm 
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Banknote className="w-4 h-4 text-gray-400" />
                    Valuta
                  </label>
                  <select
                    {...register('currency')}
                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm 
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="RSD">RSD - Srpski dinar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - US Dolar</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    Način plaćanja
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: 'TRANSFER', label: 'Virman', icon: Building2 },
                      { value: 'CASH', label: 'Gotovina', icon: Banknote },
                      { value: 'CARD', label: 'Kartica', icon: CreditCard },
                    ].map((method) => {
                      const Icon = method.icon;
                      return (
                        <label
                          key={method.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                                     ${watchedValues.paymentMethod === method.value
                                       ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                       : 'border-gray-200 hover:border-gray-300 bg-white/50'
                                     }`}
                        >
                          <input
                            {...register('paymentMethod')}
                            type="radio"
                            value={method.value}
                            className="sr-only"
                          />
                          <Icon className={`w-5 h-5 ${watchedValues.paymentMethod === method.value ? 'text-indigo-600' : 'text-gray-400'}`} />
                          <span className={`font-medium ${watchedValues.paymentMethod === method.value ? 'text-indigo-900' : 'text-gray-700'}`}>
                            {method.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Buyer Info */}
          {currentStep === 2 && (
            <div className="p-8 space-y-8 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Podaci o kupcu</h2>
                  <p className="text-sm text-gray-500">Izaberite partnera ili unesite ručno</p>
                </div>
              </div>

              {/* Partner Autocomplete */}
              <div className="space-y-4">
                <Autocomplete
                  label="Pretraga partnera"
                  placeholder="Počnite da kucate naziv ili PIB partnera..."
                  required={true}
                  value={watchedValues.buyerName || ''}
                  onSelect={handlePartnerSelect}
                  onSearch={searchPartners}
                  error={errors.buyerName?.message}
                  allowCustom={true}
                  minChars={2}
                />

                {selectedPartner && (
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 animate-fadeIn">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{selectedPartner.name}</h4>
                          <p className="text-sm text-gray-500">Partner iz šifarnika</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Izabran
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">PIB:</span>
                        <span className="font-medium">{selectedPartner.pib}</span>
                      </div>
                      {selectedPartner.city && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Grad:</span>
                          <span className="font-medium">{selectedPartner.city}</span>
                        </div>
                      )}
                      {selectedPartner.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{selectedPartner.email}</span>
                        </div>
                      )}
                      {selectedPartner.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{selectedPartner.phone}</span>
                        </div>
                      )}
                    </div>

                    {selectedPartner.defaultPaymentTerms && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-sm text-blue-700">
                          <Info className="w-4 h-4 inline mr-1" />
                          Automatski postavljeni uslovi plaćanja: <strong>{selectedPartner.defaultPaymentTerms} dana</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!selectedPartner && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 p-6 bg-gray-50/50 rounded-xl border border-gray-200">
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Ili unesite podatke ručno:
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        PIB kupca <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('buyerPIB')}
                        className={`w-full px-4 py-3 bg-white border rounded-xl shadow-sm 
                                   focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all
                                   ${errors.buyerPIB ? 'border-red-300' : 'border-gray-200'}`}
                        placeholder="123456789"
                        maxLength={9}
                      />
                      {errors.buyerPIB && (
                        <p className="text-sm text-red-500">{errors.buyerPIB.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Adresa</label>
                      <input
                        {...register('buyerAddress')}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm 
                                   focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="Ulica i broj"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Grad</label>
                      <input
                        {...register('buyerCity')}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm 
                                   focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="Beograd"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Poštanski broj</label>
                      <input
                        {...register('buyerPostalCode')}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm 
                                   focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="11000"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Invoice Lines */}
          {currentStep === 3 && (
            <div className="p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Stavke fakture</h2>
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
                {lines.map((line, index) => (
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
                          {line.name || 'Nova stavka'}
                        </span>
                        {selectedProducts.has(index) && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                            Iz šifarnika
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateLine(index)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Dupliciraj"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Ukloni"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Autocomplete
                        label="Proizvod/usluga"
                        placeholder="Pretražite proizvode ili unesite ručno..."
                        required={true}
                        value={line.name}
                        onSelect={(option) => handleProductSelect(index, option)}
                        onSearch={searchProducts}
                        allowCustom={true}
                        minChars={2}
                      />

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Količina</label>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg 
                                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Ruler className="w-3 h-3" /> Jedinica
                          </label>
                          <select
                            value={line.unit}
                            onChange={(e) => updateLine(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg 
                                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          >
                            {UNIT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Jed. cena</label>
                          <input
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg 
                                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Percent className="w-3 h-3" /> Popust
                          </label>
                          <input
                            type="number"
                            value={line.discount}
                            onChange={(e) => updateLine(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg 
                                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            min="0"
                            max="100"
                            step="0.5"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">PDV %</label>
                          <select
                            value={line.taxRate}
                            onChange={(e) => updateLine(index, 'taxRate', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg 
                                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          >
                            <option value="0">0%</option>
                            <option value="10">10%</option>
                            <option value="20">20%</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Iznos</label>
                          <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 
                                          rounded-lg font-bold text-indigo-700 text-center">
                            {formatCurrency(
                              (line.quantity * line.unitPrice * (1 - line.discount / 100)) * (1 + line.taxRate / 100)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Osnovica</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.subtotal)}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-sm text-amber-600">Popust</p>
                  <p className="text-lg font-bold text-amber-700">-{formatCurrency(totals.totalDiscount)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600">PDV</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.tax)}</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white">
                  <p className="text-sm text-indigo-100">Ukupno</p>
                  <p className="text-lg font-bold">{formatCurrency(totals.total)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pregled fakture</h2>
                  <p className="text-sm text-gray-500">Proverite podatke pre kreiranja</p>
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left - Details */}
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      Podaci fakture
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Broj fakture</p>
                        <p className="font-semibold text-gray-900">{watchedValues.invoiceNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Datum izdavanja</p>
                        <p className="font-semibold text-gray-900">
                          {watchedValues.issueDate && new Date(watchedValues.issueDate).toLocaleDateString('sr-RS')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Datum dospeća</p>
                        <p className="font-semibold text-gray-900">
                          {watchedValues.dueDate 
                            ? new Date(watchedValues.dueDate).toLocaleDateString('sr-RS')
                            : '-'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Način plaćanja</p>
                        <p className="font-semibold text-gray-900">
                          {watchedValues.paymentMethod === 'TRANSFER' ? 'Virman' :
                           watchedValues.paymentMethod === 'CASH' ? 'Gotovina' : 'Kartica'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Info */}
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-500" />
                      Kupac
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-gray-900 text-lg">{watchedValues.buyerName}</p>
                      <p className="text-gray-600">PIB: {watchedValues.buyerPIB}</p>
                      {(watchedValues.buyerAddress || selectedPartner?.address) && (
                        <p className="text-gray-600">
                          {watchedValues.buyerAddress || selectedPartner?.address}, {' '}
                          {watchedValues.buyerCity || selectedPartner?.city} {' '}
                          {watchedValues.buyerPostalCode || selectedPartner?.postalCode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Napomena</label>
                    <textarea
                      {...register('note')}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm 
                                 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="Dodatne napomene za fakturu..."
                    />
                  </div>
                </div>

                {/* Right - Summary */}
                <div className="space-y-6">
                  {/* Items Summary */}
                  <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-gray-400" />
                      Stavke ({lines.length})
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {lines.map((line, index) => {
                        const lineTotal = (line.quantity * line.unitPrice * (1 - line.discount / 100)) * (1 + line.taxRate / 100);
                        const unitLabel = UNIT_OPTIONS.find(u => u.value === line.unit)?.label || line.unit;
                        return (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                            <div>
                              <p className="font-medium text-gray-900">{line.name || `Stavka ${index + 1}`}</p>
                              <p className="text-xs text-gray-500">
                                {line.quantity} {unitLabel} × {formatCurrency(line.unitPrice)}
                                {line.discount > 0 && ` (-${line.discount}%)`}
                                {` + PDV ${line.taxRate}%`}
                              </p>
                            </div>
                            <p className="font-semibold text-gray-900">{formatCurrency(lineTotal)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Final Totals */}
                  <div className="p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-indigo-500" />
                      Rekapitulacija
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Osnovica</span>
                        <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                      </div>
                      {totals.totalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-amber-600">
                          <span>Popust</span>
                          <span className="font-medium">-{formatCurrency(totals.totalDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">PDV</span>
                        <span className="font-medium">{formatCurrency(totals.tax)}</span>
                      </div>
                      <div className="pt-3 border-t border-indigo-200">
                        <div className="flex justify-between">
                          <span className="text-lg font-bold text-gray-900">Ukupno</span>
                          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {formatCurrency(totals.total)}
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
                onClick={currentStep === 1 ? () => window.history.back() : prevStep}
                className="px-6 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-100 
                           transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                {currentStep === 1 ? 'Otkaži' : 'Nazad'}
              </button>

              <div className="flex items-center gap-3">
                {currentStep === 4 && (
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={isSavingDraft}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-xl 
                               hover:bg-gray-100 transition-all flex items-center gap-2
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingDraft ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {isSavingDraft ? 'Čuvanje...' : 'Sačuvaj nacrt'}
                  </button>
                )}

                {currentStep < 4 ? (
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
                        Kreiranje...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Kreiraj fakturu
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
