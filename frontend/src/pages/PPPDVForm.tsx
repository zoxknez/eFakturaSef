import React, { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { 
  FileText, 
  Calendar, 
  RefreshCw, 
  Eye, 
  FileDown, 
  Send, 
  AlertTriangle,
  Calculator,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  X,
  Clock
} from 'lucide-react';

interface PPPDVField {
  code: string;
  label: string;
  description: string;
  value: number;
  editable: boolean;
  category: 'basic' | 'input' | 'output' | 'calculation' | 'other';
}

interface PPPDVFormData {
  period: {
    year: number;
    month: number;
    quarter?: number;
  };
  taxpayer: {
    pib: string;
    name: string;
    address: string;
    municipality: string;
  };
  fields: PPPDVField[];
  totalInputVAT: number;
  totalOutputVAT: number;
  balance: number;
  isQuarterly: boolean;
}

const PPPDVForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PPPDVFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<{
    pib: string;
    name: string;
    address: string;
    city: string;
  } | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<number>(new Date().getMonth()); // 0-11 for months, or 0-3 for quarters
  const [isQuarterly, setIsQuarterly] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, number>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];
  const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Okt-Dec)'];

  // Fetch company data on mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await apiClient.get('/company/profile');
        if (response.data.success && response.data.data) {
          setCompanyData({
            pib: response.data.data.pib,
            name: response.data.data.name,
            address: response.data.data.address,
            city: response.data.data.city
          });
        }
      } catch (error) {
        logger.error('Failed to fetch company data', error);
        // Fallback to user company data if available
        if (user?.company) {
          setCompanyData({
            pib: user.company.pib,
            name: user.company.name,
            address: '',
            city: ''
          });
        }
      }
    };
    fetchCompanyData();
  }, [user]);

  // Standard PP-PDV fields based on Serbian tax form
  const standardFields: PPPDVField[] = [
    // Section 1 - Output VAT (Izlazni PDV)
    { code: '001', label: 'Promet dobara i usluga po opštoj stopi (20%)', description: 'Osnovica', value: 0, editable: false, category: 'output' },
    { code: '002', label: 'PDV po opštoj stopi (20%)', description: 'Obračunati PDV', value: 0, editable: false, category: 'output' },
    { code: '003', label: 'Promet dobara i usluga po posebnoj stopi (10%)', description: 'Osnovica', value: 0, editable: false, category: 'output' },
    { code: '004', label: 'PDV po posebnoj stopi (10%)', description: 'Obračunati PDV', value: 0, editable: false, category: 'output' },
    { code: '005', label: 'Promet bez naknade', description: 'Osnovica', value: 0, editable: true, category: 'output' },
    { code: '006', label: 'PDV za promet bez naknade', description: 'Obračunati PDV', value: 0, editable: true, category: 'output' },
    { code: '007', label: 'Avansne uplate', description: 'Osnovica', value: 0, editable: true, category: 'output' },
    { code: '008', label: 'PDV na avansne uplate', description: 'Obračunati PDV', value: 0, editable: true, category: 'output' },
    { code: '009', label: 'Ukupan izlazni PDV (002+004+006+008)', description: 'Suma', value: 0, editable: false, category: 'calculation' },
    
    // Section 2 - Input VAT (Ulazni PDV - Pretporez)
    { code: '101', label: 'Nabavka dobara i usluga sa pravom na odbitak (20%)', description: 'Osnovica', value: 0, editable: false, category: 'input' },
    { code: '102', label: 'Prethodni PDV po opštoj stopi (20%)', description: 'Pretporez', value: 0, editable: false, category: 'input' },
    { code: '103', label: 'Nabavka dobara i usluga sa pravom na odbitak (10%)', description: 'Osnovica', value: 0, editable: false, category: 'input' },
    { code: '104', label: 'Prethodni PDV po posebnoj stopi (10%)', description: 'Pretporez', value: 0, editable: false, category: 'input' },
    { code: '105', label: 'PDV plaćen pri uvozu', description: 'Pretporez', value: 0, editable: true, category: 'input' },
    { code: '106', label: 'Korekcija pretporeza', description: '+/-', value: 0, editable: true, category: 'input' },
    { code: '107', label: 'Srazmerni odbitak prethodnog PDV', description: '%', value: 100, editable: true, category: 'input' },
    { code: '108', label: 'Ukupan prethodni PDV ((102+104+105)+/-106)*107%', description: 'Suma', value: 0, editable: false, category: 'calculation' },
    
    // Section 3 - Balance
    { code: '201', label: 'PDV za uplatu (009-108 ako > 0)', description: 'Poreska obaveza', value: 0, editable: false, category: 'calculation' },
    { code: '202', label: 'PDV za povrat (108-009 ako > 0)', description: 'Poreski kredit', value: 0, editable: false, category: 'calculation' },
    { code: '203', label: 'PDV kredit prenesen iz prethodnog perioda', description: 'Prenos', value: 0, editable: true, category: 'other' },
    { code: '204', label: 'PDV kredit za prenos u naredni period', description: 'Prenos', value: 0, editable: false, category: 'calculation' },
    
    // Section 4 - Exports and exempt
    { code: '301', label: 'Izvoz dobara', description: 'Oslobođeno sa pravom na odbitak', value: 0, editable: false, category: 'other' },
    { code: '302', label: 'Promet oslobođen bez prava na odbitak', description: 'Član 25 Zakona', value: 0, editable: true, category: 'other' },
    { code: '303', label: 'Promet u slobodnoj zoni', description: 'Oslobođeno', value: 0, editable: true, category: 'other' },
  ];

  const fetchPPPDVData = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate date range based on period selection
      let fromDate: Date, toDate: Date;
      
      if (isQuarterly) {
        fromDate = new Date(selectedYear, selectedPeriod * 3, 1);
        toDate = new Date(selectedYear, (selectedPeriod + 1) * 3, 0);
      } else {
        fromDate = new Date(selectedYear, selectedPeriod, 1);
        toDate = new Date(selectedYear, selectedPeriod + 1, 0);
      }

      // Fetch real VAT data from API
      const response = await apiClient.get('/vat/pppdv-data', {
        params: {
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
          isQuarterly
        }
      });

      let vatData = response.data?.data;

      // Use real company data or fallback to user company
      const taxpayerData = {
        pib: companyData?.pib || user?.company?.pib || '',
        name: companyData?.name || user?.company?.name || '',
        address: companyData?.address || '',
        municipality: companyData?.city || '',
      };

      // If API returns data, use it; otherwise use calculated values from local data
      if (vatData) {
        const formDataFromApi: PPPDVFormData = {
          period: {
            year: selectedYear,
            month: selectedPeriod + 1,
            quarter: isQuarterly ? selectedPeriod + 1 : undefined,
          },
          taxpayer: taxpayerData,
          fields: standardFields.map(field => ({
            ...field,
            value: vatData.fields?.[field.code] ?? calculateValueFromVatRecords(field.code, vatData),
          })),
          totalInputVAT: vatData.totalInputVAT || 0,
          totalOutputVAT: vatData.totalOutputVAT || 0,
          balance: vatData.balance || 0,
          isQuarterly,
        };
        recalculateFields(formDataFromApi);
        setFormData(formDataFromApi);
      } else {
        // Fallback: Calculate from VAT records
        const vatRecordsResponse = await apiClient.get('/vat/records', {
          params: {
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0]
          }
        });

        const records = vatRecordsResponse.data?.data || [];
        const calculatedData = calculatePPPDVFromRecords(records, taxpayerData, selectedYear, selectedPeriod, isQuarterly);
        recalculateFields(calculatedData);
        setFormData(calculatedData);
      }
    } catch (error) {
      logger.error('Failed to fetch PP-PDV data', error);
      // Fallback to empty form with company data
      const emptyData: PPPDVFormData = {
        period: {
          year: selectedYear,
          month: selectedPeriod + 1,
          quarter: isQuarterly ? selectedPeriod + 1 : undefined,
        },
        taxpayer: {
          pib: companyData?.pib || user?.company?.pib || '',
          name: companyData?.name || user?.company?.name || '',
          address: companyData?.address || '',
          municipality: companyData?.city || '',
        },
        fields: standardFields.map(field => ({ ...field, value: 0 })),
        totalInputVAT: 0,
        totalOutputVAT: 0,
        balance: 0,
        isQuarterly,
      };
      setFormData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedPeriod, isQuarterly, companyData, user]);

  // Helper function to calculate PP-PDV from VAT records
  const calculatePPPDVFromRecords = (
    records: any[],
    taxpayer: { pib: string; name: string; address: string; municipality: string },
    year: number,
    period: number,
    quarterly: boolean
  ): PPPDVFormData => {
    // Separate input and output records
    const outputRecords = records.filter(r => r.type === 'OUTPUT' || r.type === 'IZLAZNI');
    const inputRecords = records.filter(r => r.type === 'INPUT' || r.type === 'ULAZNI');

    // Calculate output VAT by rate
    const output20Base = outputRecords
      .filter(r => r.vatRate === 20)
      .reduce((sum, r) => sum + (r.baseAmount || 0), 0);
    const output20VAT = outputRecords
      .filter(r => r.vatRate === 20)
      .reduce((sum, r) => sum + (r.vatAmount || 0), 0);
    const output10Base = outputRecords
      .filter(r => r.vatRate === 10)
      .reduce((sum, r) => sum + (r.baseAmount || 0), 0);
    const output10VAT = outputRecords
      .filter(r => r.vatRate === 10)
      .reduce((sum, r) => sum + (r.vatAmount || 0), 0);

    // Calculate input VAT by rate
    const input20Base = inputRecords
      .filter(r => r.vatRate === 20)
      .reduce((sum, r) => sum + (r.baseAmount || 0), 0);
    const input20VAT = inputRecords
      .filter(r => r.vatRate === 20)
      .reduce((sum, r) => sum + (r.vatAmount || 0), 0);
    const input10Base = inputRecords
      .filter(r => r.vatRate === 10)
      .reduce((sum, r) => sum + (r.baseAmount || 0), 0);
    const input10VAT = inputRecords
      .filter(r => r.vatRate === 10)
      .reduce((sum, r) => sum + (r.vatAmount || 0), 0);

    // Calculate exports (0% VAT)
    const exports = outputRecords
      .filter(r => r.vatRate === 0 && r.isExport)
      .reduce((sum, r) => sum + (r.baseAmount || 0), 0);

    const fields = standardFields.map(field => {
      let value = 0;
      switch (field.code) {
        case '001': value = output20Base; break;
        case '002': value = output20VAT; break;
        case '003': value = output10Base; break;
        case '004': value = output10VAT; break;
        case '101': value = input20Base; break;
        case '102': value = input20VAT; break;
        case '103': value = input10Base; break;
        case '104': value = input10VAT; break;
        case '301': value = exports; break;
        case '107': value = 100; break; // Default proportional rate
        default: value = 0;
      }
      return { ...field, value };
    });

    const totalOutputVAT = output20VAT + output10VAT;
    const totalInputVAT = input20VAT + input10VAT;

    return {
      period: {
        year,
        month: period + 1,
        quarter: quarterly ? period + 1 : undefined,
      },
      taxpayer,
      fields,
      totalInputVAT,
      totalOutputVAT,
      balance: totalOutputVAT - totalInputVAT,
      isQuarterly: quarterly,
    };
  };

  // Helper to calculate value from VAT data response
  const calculateValueFromVatRecords = (code: string, vatData: any): number => {
    return vatData[code] || 0;
  };

  useEffect(() => {
    if (companyData || user?.company) {
      fetchPPPDVData();
    }
  }, [fetchPPPDVData, companyData, user]);

  const recalculateFields = (data: PPPDVFormData) => {
    const fields = data.fields;
    const getField = (code: string) => fields.find(f => f.code === code);
    const setFieldValue = (code: string, value: number) => {
      const field = getField(code);
      if (field) field.value = value;
    };

    // Calculate total output VAT (009)
    const outputVAT = 
      (getField('002')?.value || 0) + 
      (getField('004')?.value || 0) + 
      (getField('006')?.value || 0) + 
      (getField('008')?.value || 0);
    setFieldValue('009', outputVAT);

    // Calculate total input VAT (108)
    const proportionalRate = (getField('107')?.value || 100) / 100;
    const inputVAT = (
      (getField('102')?.value || 0) + 
      (getField('104')?.value || 0) + 
      (getField('105')?.value || 0) + 
      (getField('106')?.value || 0)
    ) * proportionalRate;
    setFieldValue('108', inputVAT);

    // Calculate balance
    const balance = outputVAT - inputVAT;
    const previousCredit = getField('203')?.value || 0;
    
    if (balance > 0) {
      setFieldValue('201', Math.max(0, balance - previousCredit));
      setFieldValue('202', 0);
      setFieldValue('204', Math.max(0, previousCredit - balance));
    } else {
      setFieldValue('201', 0);
      setFieldValue('202', Math.abs(balance) + previousCredit);
      setFieldValue('204', 0);
    }

    data.totalOutputVAT = outputVAT;
    data.totalInputVAT = inputVAT;
    data.balance = balance;
  };

  const handleFieldChange = (code: string, value: number) => {
    setEditedFields({ ...editedFields, [code]: value });
    
    if (formData) {
      const updatedData = { ...formData };
      const field = updatedData.fields.find(f => f.code === code);
      if (field) {
        field.value = value;
        recalculateFields(updatedData);
        setFormData(updatedData);
      }
    }
  };

  const generateXML = async () => {
    setGenerating(true);
    try {
      // Simulate XML generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create XML content
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PPPDV xmlns="http://efaktura.mfin.gov.rs/pppdv">
  <Header>
    <Period>
      <Year>${formData?.period.year}</Year>
      ${formData?.isQuarterly 
        ? `<Quarter>${formData?.period.quarter}</Quarter>` 
        : `<Month>${formData?.period.month}</Month>`}
    </Period>
    <Taxpayer>
      <PIB>${formData?.taxpayer.pib}</PIB>
      <Name>${formData?.taxpayer.name}</Name>
    </Taxpayer>
  </Header>
  <Data>
    ${formData?.fields.map(f => `
    <Field code="${f.code}">
      <Value>${f.value}</Value>
    </Field>`).join('')}
  </Data>
</PPPDV>`;

      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PPPDV_${formData?.period.year}_${formData?.period.month || formData?.period.quarter}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to generate XML', error);
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast('PDF generisanje će biti implementirano sa pravim PDF bibliotekom', { icon: 'ℹ️' });
    } catch (error) {
      logger.error('Failed to generate PDF', error);
      toast.error('Greška pri generisanju PDF-a');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'output': return 'Izlazni PDV';
      case 'input': return 'Ulazni PDV (Pretporez)';
      case 'calculation': return 'Obračun';
      case 'other': return 'Ostalo';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'output': return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50';
      case 'input': return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50';
      case 'calculation': return 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200/50';
      case 'other': return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200/50';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">PP-PDV Obrazac</h1>
                <p className="text-white/70 mt-1">Poreska prijava poreza na dodatu vrednost</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-semibold text-gray-900">Period obračuna</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Godina</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tip perioda</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
              value={isQuarterly ? 'quarterly' : 'monthly'}
              onChange={(e) => {
                setIsQuarterly(e.target.value === 'quarterly');
                setSelectedPeriod(0);
              }}
            >
              <option value="monthly">Mesečno</option>
              <option value="quarterly">Kvartalno</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isQuarterly ? 'Kvartal' : 'Mesec'}
            </label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            >
              {(isQuarterly ? quarters : months).map((item, index) => (
                <option key={index} value={index}>{item}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchPPPDVData}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-violet-500/25"
            >
              <RefreshCw className="w-4 h-4" />
              Učitaj podatke
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {formData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Izlazni PDV</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(formData.totalOutputVAT)}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Ulazni PDV</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(formData.totalInputVAT)}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl text-white ${formData.balance >= 0 ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}`}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">
                {formData.balance >= 0 ? 'PDV za uplatu' : 'PDV za povrat'}
              </span>
            </div>
            <div className={`text-2xl font-bold ${formData.balance >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(Math.abs(formData.balance))}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Rok za podnošenje</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {(() => {
                const deadline = new Date(selectedYear, isQuarterly ? (selectedPeriod + 1) * 3 : selectedPeriod + 1, 15);
                return deadline.toLocaleDateString('sr-RS');
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      {formData && (
        <div className="space-y-6">
          {/* Group fields by category */}
          {(['output', 'input', 'calculation', 'other'] as const).map(category => {
            const categoryFields = formData.fields.filter(f => f.category === category);
            if (categoryFields.length === 0) return null;

            return (
              <div key={category} className={`rounded-2xl border shadow-lg p-6 ${getCategoryColor(category)}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{getCategoryLabel(category)}</h3>
                </div>
                <div className="space-y-3">
                  {categoryFields.map(field => (
                    <div key={field.code} className="flex items-center gap-4 py-3 border-b border-gray-200/50 last:border-0">
                      <div className="w-16 text-sm font-mono text-gray-500 flex-shrink-0 bg-white/50 px-2 py-1 rounded-lg text-center">{field.code}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{field.label}</div>
                        <div className="text-xs text-gray-500">{field.description}</div>
                      </div>
                      <div className="w-48">
                        {field.editable ? (
                          <input
                            type="number"
                            className="w-full px-4 py-2 text-right bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                            value={editedFields[field.code] ?? field.value}
                            onChange={(e) => handleFieldChange(field.code, Number(e.target.value))}
                          />
                        ) : (
                          <div className="px-4 py-2 text-right font-bold text-gray-900 bg-white/70 rounded-xl border border-gray-100">
                            {field.code === '107' ? `${field.value}%` : formatCurrency(field.value)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all duration-200"
          >
            <Eye className="w-4 h-4" />
            Pregled
          </button>
          <button
            onClick={generateXML}
            disabled={generating}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {generating ? 'Generisanje...' : 'Generiši XML'}
          </button>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-purple-500/25 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {generating ? 'Generisanje...' : 'Generiši PDF'}
          </button>
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-green-500/25"
          >
            <Send className="w-4 h-4" />
            Podnesi elektronski
          </button>
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Pre elektronskog podnošenja obavezno proverite tačnost svih podataka
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && formData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-semibold text-gray-900">Pregled PP-PDV obrasca</h3>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Official form preview */}
              <div className="border-2 border-gray-300 rounded-xl p-6 bg-white">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">ПОРЕСКА ПРИЈАВА</h2>
                  <h3 className="text-lg text-gray-700">ПОРЕЗА НА ДОДАТУ ВРЕДНОСТ</h3>
                  <p className="text-sm text-gray-500 mt-1">Образац ПП-ПДВ</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm bg-gray-50 p-4 rounded-xl">
                  <div>
                    <span className="text-gray-500">ПИБ:</span>{' '}
                    <span className="font-semibold">{formData.taxpayer.pib}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Период:</span>{' '}
                    <span className="font-semibold">{isQuarterly ? `Q${formData.period.quarter}` : months[formData.period.month - 1]} {formData.period.year}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Назив:</span>{' '}
                    <span className="font-semibold">{formData.taxpayer.name}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">Ред. бр.</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">Опис</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold">Износ (РСД)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.fields.map((field, index) => (
                        <tr key={field.code} className={`${field.category === 'calculation' ? 'bg-violet-50 font-semibold' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="border-b border-gray-100 px-4 py-2.5 font-mono text-sm">{field.code}</td>
                          <td className="border-b border-gray-100 px-4 py-2.5">{field.label}</td>
                          <td className="border-b border-gray-100 px-4 py-2.5 text-right font-mono">
                            {field.code === '107' ? `${field.value}%` : formatCurrency(field.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PPPDVForm;
