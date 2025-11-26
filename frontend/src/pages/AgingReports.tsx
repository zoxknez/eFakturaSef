import React, { useState, useEffect, useMemo } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';

interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  totalAmount: number;
  percentage: number;
  invoices: AgingInvoice[];
}

interface AgingInvoice {
  id: string;
  invoiceNumber: string;
  partnerId: string;
  partnerName: string;
  partnerPIB: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  daysOverdue: number;
  status: 'CURRENT' | 'OVERDUE' | 'CRITICAL';
}

interface PartnerAging {
  partnerId: string;
  partnerName: string;
  partnerPIB: string;
  totalOutstanding: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  maxDaysOverdue: number;
  creditLimit?: number;
  creditUtilization?: number;
  buckets: {
    current: number;
    '1-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

const AgingReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'receivables' | 'payables'>('receivables');
  const [viewMode, setViewMode] = useState<'summary' | 'detail' | 'partner'>('summary');
  const [buckets, setBuckets] = useState<AgingBucket[]>([]);
  const [partnerAgings, setPartnerAgings] = useState<PartnerAging[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'partnerName' | 'totalOutstanding' | 'daysOverdue'>('totalOutstanding');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchAgingData();
  }, [reportType]);

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      // Generate mock aging data
      const mockInvoices: AgingInvoice[] = [];
      const partnerNames = [
        'ABC Trading d.o.o.', 'XYZ Korporacija', 'Delta Supplies', 
        'Omega Tech', 'Beta Industries', 'Gamma Solutions',
        'Sigma Manufacturing', 'Alpha Logistics', 'Epsilon Services'
      ];

      const today = new Date();

      // Generate 50 mock invoices with various aging
      for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 180);
        const issueDate = new Date(today);
        issueDate.setDate(issueDate.getDate() - daysAgo);
        
        const paymentTerms = Math.random() > 0.5 ? 15 : 30;
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);
        
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        const totalAmount = Math.round(50000 + Math.random() * 500000);
        const paidPercentage = daysOverdue > 60 ? Math.random() * 0.3 : daysOverdue > 30 ? Math.random() * 0.5 : Math.random() * 0.8;
        const paidAmount = Math.round(totalAmount * paidPercentage);
        
        const partnerIndex = i % partnerNames.length;
        
        mockInvoices.push({
          id: `inv-${i}`,
          invoiceNumber: `FAK-2024-${1000 + i}`,
          partnerId: `partner-${partnerIndex}`,
          partnerName: partnerNames[partnerIndex],
          partnerPIB: `10000000${partnerIndex}`,
          issueDate: issueDate.toISOString(),
          dueDate: dueDate.toISOString(),
          totalAmount,
          paidAmount,
          remainingAmount: totalAmount - paidAmount,
          daysOverdue,
          status: daysOverdue === 0 ? 'CURRENT' : daysOverdue <= 30 ? 'OVERDUE' : 'CRITICAL',
        });
      }

      // Filter out fully paid invoices
      const unpaidInvoices = mockInvoices.filter(inv => inv.remainingAmount > 0);

      // Calculate buckets
      const bucketDefs = [
        { label: 'Tekuće', minDays: -999, maxDays: 0 },
        { label: '1-30 dana', minDays: 1, maxDays: 30 },
        { label: '31-60 dana', minDays: 31, maxDays: 60 },
        { label: '61-90 dana', minDays: 61, maxDays: 90 },
        { label: '90+ dana', minDays: 91, maxDays: null },
      ];

      const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

      const calculatedBuckets: AgingBucket[] = bucketDefs.map(def => {
        const invoicesInBucket = unpaidInvoices.filter(inv => {
          if (def.maxDays === null) return inv.daysOverdue >= def.minDays;
          return inv.daysOverdue >= def.minDays && inv.daysOverdue <= def.maxDays;
        });
        
        const bucketTotal = invoicesInBucket.reduce((sum, inv) => sum + inv.remainingAmount, 0);
        
        return {
          ...def,
          count: invoicesInBucket.length,
          totalAmount: bucketTotal,
          percentage: totalOutstanding > 0 ? (bucketTotal / totalOutstanding) * 100 : 0,
          invoices: invoicesInBucket.sort((a, b) => b.remainingAmount - a.remainingAmount),
        };
      });

      setBuckets(calculatedBuckets);

      // Calculate partner aggregations
      const partnerMap = new Map<string, PartnerAging>();
      
      unpaidInvoices.forEach(inv => {
        if (!partnerMap.has(inv.partnerId)) {
          partnerMap.set(inv.partnerId, {
            partnerId: inv.partnerId,
            partnerName: inv.partnerName,
            partnerPIB: inv.partnerPIB,
            totalOutstanding: 0,
            invoiceCount: 0,
            avgDaysOverdue: 0,
            maxDaysOverdue: 0,
            creditLimit: Math.round(500000 + Math.random() * 2000000),
            buckets: { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          });
        }
        
        const partner = partnerMap.get(inv.partnerId)!;
        partner.totalOutstanding += inv.remainingAmount;
        partner.invoiceCount++;
        partner.maxDaysOverdue = Math.max(partner.maxDaysOverdue, inv.daysOverdue);
        
        if (inv.daysOverdue <= 0) partner.buckets.current += inv.remainingAmount;
        else if (inv.daysOverdue <= 30) partner.buckets['1-30'] += inv.remainingAmount;
        else if (inv.daysOverdue <= 60) partner.buckets['31-60'] += inv.remainingAmount;
        else if (inv.daysOverdue <= 90) partner.buckets['61-90'] += inv.remainingAmount;
        else partner.buckets['90+'] += inv.remainingAmount;
      });

      // Calculate averages and credit utilization
      partnerMap.forEach(partner => {
        const partnerInvoices = unpaidInvoices.filter(inv => inv.partnerId === partner.partnerId);
        partner.avgDaysOverdue = Math.round(
          partnerInvoices.reduce((sum, inv) => sum + inv.daysOverdue, 0) / partnerInvoices.length
        );
        if (partner.creditLimit) {
          partner.creditUtilization = (partner.totalOutstanding / partner.creditLimit) * 100;
        }
      });

      setPartnerAgings(Array.from(partnerMap.values()));
    } catch (error) {
      logger.error('Failed to fetch aging data', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedPartnerAgings = useMemo(() => {
    let filtered = partnerAgings.filter(p => 
      p.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partnerPIB.includes(searchTerm)
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'partnerName':
          comparison = a.partnerName.localeCompare(b.partnerName);
          break;
        case 'totalOutstanding':
          comparison = a.totalOutstanding - b.totalOutstanding;
          break;
        case 'daysOverdue':
          comparison = a.maxDaysOverdue - b.maxDaysOverdue;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [partnerAgings, searchTerm, sortField, sortDirection]);

  const totalOutstanding = buckets.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalOverdue = buckets
    .filter(b => b.minDays > 0)
    .reduce((sum, b) => sum + b.totalAmount, 0);
  const criticalAmount = buckets
    .filter(b => b.minDays > 30)
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sr-RS');
  };

  const getBucketColor = (index: number) => {
    const colors = [
      'bg-green-500',
      'bg-yellow-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-red-700',
    ];
    return colors[index] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CURRENT': return 'bg-green-100 text-green-800';
      case 'OVERDUE': return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToExcel = () => {
    // Simulate Excel export
    alert('Izvoz u Excel će biti implementiran sa pravim Excel bibliotekom');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-rose-500 via-pink-600 to-purple-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-2xl rotate-12 floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-xl -rotate-12 floating" style={{ animationDelay: '2s' }}></div>
          
          {/* Chart icon pattern */}
          <div className="absolute top-8 right-16 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analiza dospelosti • Potraživanja i obaveze
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              📊 Starosna Struktura
            </h1>
            <p className="text-xl text-rose-100 max-w-xl">
              Analiza dospelosti potraživanja i obaveza sa detaljnim pregledom po partnerima.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Izvezi Excel
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip izveštaja</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'receivables' | 'payables')}
            >
              <option value="receivables">Potraživanja (kupci)</option>
              <option value="payables">Obaveze (dobavljači)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prikaz</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'summary' | 'detail' | 'partner')}
            >
              <option value="summary">Sumarni pregled</option>
              <option value="detail">Detaljni pregled</option>
              <option value="partner">Po partnerima</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pretraga</label>
            <input
              type="text"
              placeholder="🔍 Pretraži po nazivu ili PIB-u..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={exportToExcel}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📥 Izvezi Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Ukupno otvoreno</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {buckets.reduce((sum, b) => sum + b.count, 0)} faktura
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl shadow-sm p-4 border border-yellow-200">
          <div className="text-sm text-yellow-600">Ukupno dospelo</div>
          <div className="text-2xl font-bold text-yellow-900">{formatCurrency(totalOverdue)}</div>
          <div className="text-xs text-yellow-600 mt-1">
            {((totalOverdue / totalOutstanding) * 100 || 0).toFixed(1)}% od ukupnog
          </div>
        </div>
        <div className="bg-red-50 rounded-xl shadow-sm p-4 border border-red-200">
          <div className="text-sm text-red-600">Kritično (&gt;30 dana)</div>
          <div className="text-2xl font-bold text-red-900">{formatCurrency(criticalAmount)}</div>
          <div className="text-xs text-red-600 mt-1">
            ⚠️ Potrebna hitna akcija
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl shadow-sm p-4 border border-blue-200">
          <div className="text-sm text-blue-600">Prosečna starost</div>
          <div className="text-2xl font-bold text-blue-900">
            {Math.round(partnerAgings.reduce((sum, p) => sum + p.avgDaysOverdue, 0) / Math.max(1, partnerAgings.length))} dana
          </div>
        </div>
      </div>

      {/* Aging Buckets Visualization */}
      {viewMode !== 'partner' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Starosna struktura</h2>
          
          {/* Bar Chart */}
          <div className="flex items-end h-48 gap-4 mb-4">
            {buckets.map((bucket, index) => (
              <div 
                key={bucket.label}
                className="flex-1 flex flex-col items-center cursor-pointer group"
                onClick={() => setSelectedBucket(selectedBucket === bucket.label ? null : bucket.label)}
              >
                <div className="text-sm font-bold text-gray-900 mb-1">
                  {formatCurrency(bucket.totalAmount)}
                </div>
                <div 
                  className={`w-full rounded-t-lg transition-all ${getBucketColor(index)} ${selectedBucket === bucket.label ? 'ring-4 ring-blue-300' : 'group-hover:opacity-80'}`}
                  style={{ 
                    height: `${Math.max(20, (bucket.totalAmount / totalOutstanding) * 160)}px` 
                  }}
                />
                <div className="text-xs text-gray-600 mt-2 text-center">
                  {bucket.label}
                </div>
                <div className="text-xs text-gray-500">
                  {bucket.count} fak. ({bucket.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>

          {/* Stacked Bar */}
          <div className="h-8 flex rounded-lg overflow-hidden">
            {buckets.map((bucket, index) => (
              <div
                key={bucket.label}
                className={`${getBucketColor(index)} transition-all hover:opacity-80 cursor-pointer flex items-center justify-center`}
                style={{ width: `${bucket.percentage}%` }}
                title={`${bucket.label}: ${formatCurrency(bucket.totalAmount)}`}
              >
                {bucket.percentage > 10 && (
                  <span className="text-white text-xs font-medium">{bucket.percentage.toFixed(0)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Bucket Details */}
      {selectedBucket && viewMode === 'summary' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Fakture: {selectedBucket}
            </h2>
            <button
              onClick={() => setSelectedBucket(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Faktura</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Partner</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Datum dospeća</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Iznos</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Preostalo</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Dana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {buckets.find(b => b.label === selectedBucket)?.invoices.slice(0, 10).map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{inv.partnerName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-red-600">{formatCurrency(inv.remainingAmount)}</td>
                    <td className="px-4 py-2 text-sm text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(inv.status)}`}>
                        {inv.daysOverdue > 0 ? `+${inv.daysOverdue}` : inv.daysOverdue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partner View */}
      {viewMode === 'partner' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Starosna struktura po partnerima</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('partnerName')}
                    >
                      Partner {sortField === 'partnerName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-green-50">Tekuće</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-yellow-50">1-30</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-orange-50">31-60</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-red-50">61-90</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-red-100">90+</th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalOutstanding')}
                    >
                      Ukupno {sortField === 'totalOutstanding' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('daysOverdue')}
                    >
                      Max dana {sortField === 'daysOverdue' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedPartnerAgings.map(partner => (
                    <tr key={partner.partnerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{partner.partnerName}</div>
                        <div className="text-xs text-gray-500">PIB: {partner.partnerPIB} • {partner.invoiceCount} fak.</div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm bg-green-50/50">{formatCurrency(partner.buckets.current)}</td>
                      <td className="px-4 py-4 text-right text-sm bg-yellow-50/50">{formatCurrency(partner.buckets['1-30'])}</td>
                      <td className="px-4 py-4 text-right text-sm bg-orange-50/50">{formatCurrency(partner.buckets['31-60'])}</td>
                      <td className="px-4 py-4 text-right text-sm bg-red-50/50">{formatCurrency(partner.buckets['61-90'])}</td>
                      <td className="px-4 py-4 text-right text-sm font-bold bg-red-100/50 text-red-700">
                        {formatCurrency(partner.buckets['90+'])}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {formatCurrency(partner.totalOutstanding)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          partner.maxDaysOverdue > 60 ? 'bg-red-100 text-red-800' :
                          partner.maxDaysOverdue > 30 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {partner.maxDaysOverdue} d
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {partner.creditLimit && (
                          <div className="w-24">
                            <div className="flex justify-between text-xs mb-1">
                              <span>{partner.creditUtilization?.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  (partner.creditUtilization || 0) > 90 ? 'bg-red-500' :
                                  (partner.creditUtilization || 0) > 70 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, partner.creditUtilization || 0)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr className="font-bold">
                    <td className="px-6 py-4 text-gray-900">UKUPNO</td>
                    <td className="px-4 py-4 text-right text-green-700">
                      {formatCurrency(sortedPartnerAgings.reduce((sum, p) => sum + p.buckets.current, 0))}
                    </td>
                    <td className="px-4 py-4 text-right text-yellow-700">
                      {formatCurrency(sortedPartnerAgings.reduce((sum, p) => sum + p.buckets['1-30'], 0))}
                    </td>
                    <td className="px-4 py-4 text-right text-orange-700">
                      {formatCurrency(sortedPartnerAgings.reduce((sum, p) => sum + p.buckets['31-60'], 0))}
                    </td>
                    <td className="px-4 py-4 text-right text-red-600">
                      {formatCurrency(sortedPartnerAgings.reduce((sum, p) => sum + p.buckets['61-90'], 0))}
                    </td>
                    <td className="px-4 py-4 text-right text-red-700">
                      {formatCurrency(sortedPartnerAgings.reduce((sum, p) => sum + p.buckets['90+'], 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatCurrency(sortedPartnerAgings.reduce((sum, p) => sum + p.totalOutstanding, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail View - All Invoices */}
      {viewMode === 'detail' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sve otvorene fakture</h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faktura</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum izdavanja</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum dospeća</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ukupno</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Plaćeno</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preostalo</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buckets.flatMap(b => b.invoices).sort((a, b) => b.daysOverdue - a.daysOverdue).map(inv => (
                    <tr key={inv.id} className={`hover:bg-gray-50 ${inv.daysOverdue > 60 ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{inv.partnerName}</div>
                        <div className="text-xs text-gray-500">{inv.partnerPIB}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.issueDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(inv.paidAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{formatCurrency(inv.remainingAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(inv.status)}`}>
                          {inv.daysOverdue > 0 ? `+${inv.daysOverdue}d` : 'Tekuće'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          📧 Podsetnik
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgingReports;
