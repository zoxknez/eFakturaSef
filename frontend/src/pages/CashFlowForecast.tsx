import React, { useState, useEffect, useMemo } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';
import { TrendingUp, Plus } from 'lucide-react';

interface CashFlowItem {
  id: string;
  date: string;
  type: 'INFLOW' | 'OUTFLOW';
  category: string;
  source: 'INVOICE' | 'PAYMENT' | 'RECURRING' | 'PROJECTED' | 'MANUAL';
  description: string;
  amount: number;
  probability: number;
  reference?: string;
  partnerId?: string;
  partnerName?: string;
  isRecurring: boolean;
  recurringFrequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

interface CashFlowProjection {
  date: string;
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netFlow: number;
  closingBalance: number;
  items: CashFlowItem[];
}

interface CashFlowScenario {
  id: string;
  name: string;
  description: string;
  adjustments: {
    inflowMultiplier: number;
    outflowMultiplier: number;
    delayDays: number;
  };
}

const CashFlowForecast: React.FC = () => {
  const [projections, setProjections] = useState<CashFlowProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(1250000);
  const [forecastDays, setForecastDays] = useState(30);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('realistic');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const scenarios: CashFlowScenario[] = [
    { id: 'optimistic', name: '🌟 Optimistični', description: 'Brže naplate, manji rashodi', adjustments: { inflowMultiplier: 1.2, outflowMultiplier: 0.9, delayDays: -5 } },
    { id: 'realistic', name: '⚖️ Realistični', description: 'Bazirano na istorijskim podacima', adjustments: { inflowMultiplier: 1.0, outflowMultiplier: 1.0, delayDays: 0 } },
    { id: 'pessimistic', name: '⚠️ Pesimistični', description: 'Sporije naplate, veći rashodi', adjustments: { inflowMultiplier: 0.8, outflowMultiplier: 1.15, delayDays: 10 } },
  ];

  const categories = {
    inflow: ['Naplata faktura', 'Uplate kupaca', 'Krediti', 'Ostali prihodi'],
    outflow: ['Dobavljači', 'Plate', 'Porezi', 'Zakup', 'Komunalije', 'Ostali rashodi']
  };

  useEffect(() => {
    generateProjections();
  }, [forecastDays, selectedScenario, currentBalance]);

  const generateProjections = () => {
    setLoading(true);
    
    try {
      const scenario = scenarios.find(s => s.id === selectedScenario)!;
      const items: CashFlowItem[] = [];
      
      // Generate mock data based on scenario
      const today = new Date();
      
      // Expected invoice collections (inflows)
      for (let i = 0; i < 15; i++) {
        const daysAhead = Math.floor(Math.random() * forecastDays) + scenario.adjustments.delayDays;
        const date = new Date(today);
        date.setDate(date.getDate() + Math.max(1, daysAhead));
        
        items.push({
          id: `inv-${i}`,
          date: date.toISOString(),
          type: 'INFLOW',
          category: 'Naplata faktura',
          source: 'INVOICE',
          description: `Faktura FAK-2024-${1000 + i}`,
          amount: Math.round((50000 + Math.random() * 200000) * scenario.adjustments.inflowMultiplier),
          probability: 70 + Math.random() * 25,
          partnerName: `Kupac ${i + 1} d.o.o.`,
          isRecurring: false,
        });
      }

      // Recurring inflows
      for (let month = 0; month < Math.ceil(forecastDays / 30); month++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() + month);
        date.setDate(15);
        
        if (date > today) {
          items.push({
            id: `rec-in-${month}`,
            date: date.toISOString(),
            type: 'INFLOW',
            category: 'Uplate kupaca',
            source: 'RECURRING',
            description: 'Mesečna pretplata - Enterprise klijenti',
            amount: Math.round(180000 * scenario.adjustments.inflowMultiplier),
            probability: 95,
            isRecurring: true,
            recurringFrequency: 'MONTHLY',
          });
        }
      }

      // Outflows - Bills and payments
      const outflowSchedule = [
        { day: 5, category: 'Plate', amount: 850000, probability: 100 },
        { day: 10, category: 'Porezi', amount: 125000, probability: 100 },
        { day: 15, category: 'Zakup', amount: 95000, probability: 100 },
        { day: 20, category: 'Komunalije', amount: 35000, probability: 95 },
      ];

      for (let month = 0; month < Math.ceil(forecastDays / 30); month++) {
        outflowSchedule.forEach(item => {
          const date = new Date(today);
          date.setMonth(date.getMonth() + month);
          date.setDate(item.day);
          
          if (date > today && date <= new Date(today.getTime() + forecastDays * 24 * 60 * 60 * 1000)) {
            items.push({
              id: `out-${month}-${item.day}`,
              date: date.toISOString(),
              type: 'OUTFLOW',
              category: item.category,
              source: 'RECURRING',
              description: `${item.category} - ${date.toLocaleDateString('sr-RS', { month: 'long' })}`,
              amount: Math.round(item.amount * scenario.adjustments.outflowMultiplier),
              probability: item.probability,
              isRecurring: true,
              recurringFrequency: 'MONTHLY',
            });
          }
        });
      }

      // Supplier payments (variable outflows)
      for (let i = 0; i < 10; i++) {
        const daysAhead = Math.floor(Math.random() * forecastDays);
        const date = new Date(today);
        date.setDate(date.getDate() + daysAhead);
        
        items.push({
          id: `sup-${i}`,
          date: date.toISOString(),
          type: 'OUTFLOW',
          category: 'Dobavljači',
          source: 'INVOICE',
          description: `Uplata dobavljaču - Faktura DOB-${2000 + i}`,
          amount: Math.round((30000 + Math.random() * 150000) * scenario.adjustments.outflowMultiplier),
          probability: 85 + Math.random() * 10,
          partnerName: `Dobavljač ${i + 1}`,
          isRecurring: false,
        });
      }

      // Sort and group by date
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Generate daily projections
      const dailyProjections: CashFlowProjection[] = [];
      let runningBalance = currentBalance;
      
      for (let d = 0; d <= forecastDays; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayItems = items.filter(item => 
          new Date(item.date).toISOString().split('T')[0] === dateStr
        );
        
        const inflows = dayItems
          .filter(i => i.type === 'INFLOW')
          .reduce((sum, i) => sum + (i.amount * i.probability / 100), 0);
        
        const outflows = dayItems
          .filter(i => i.type === 'OUTFLOW')
          .reduce((sum, i) => sum + (i.amount * i.probability / 100), 0);
        
        const netFlow = inflows - outflows;
        const closingBalance = runningBalance + netFlow;
        
        dailyProjections.push({
          date: dateStr,
          openingBalance: runningBalance,
          totalInflows: Math.round(inflows),
          totalOutflows: Math.round(outflows),
          netFlow: Math.round(netFlow),
          closingBalance: Math.round(closingBalance),
          items: dayItems,
        });
        
        runningBalance = closingBalance;
      }

      setProjections(dailyProjections);
    } catch (error) {
      logger.error('Failed to generate projections', error);
      toast.error('Greška pri generisanju projekcije');
    } finally {
      setLoading(false);
    }
  };

  const aggregatedProjections = useMemo(() => {
    if (viewMode === 'daily') return projections;
    
    const grouped: CashFlowProjection[] = [];
    let currentGroup: CashFlowProjection | null = null;
    
    projections.forEach((proj, index) => {
      const date = new Date(proj.date);
      const isNewGroup = viewMode === 'weekly' 
        ? date.getDay() === 1 || index === 0
        : date.getDate() === 1 || index === 0;
      
      if (isNewGroup || !currentGroup) {
        if (currentGroup) grouped.push(currentGroup);
        currentGroup = { ...proj, items: [...proj.items] };
      } else {
        currentGroup.totalInflows += proj.totalInflows;
        currentGroup.totalOutflows += proj.totalOutflows;
        currentGroup.netFlow += proj.netFlow;
        currentGroup.closingBalance = proj.closingBalance;
        currentGroup.items = [...currentGroup.items, ...proj.items];
      }
    });
    
    if (currentGroup) grouped.push(currentGroup);
    return grouped;
  }, [projections, viewMode]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (viewMode === 'weekly') {
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 6);
      return `${date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })}`;
    }
    if (viewMode === 'monthly') {
      return date.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });
    }
    return date.toLocaleDateString('sr-RS', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return 'text-red-600 bg-red-50';
    if (balance < 200000) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const minBalance = Math.min(...projections.map(p => p.closingBalance));
  const maxBalance = Math.max(...projections.map(p => p.closingBalance));
  const averageBalance = projections.reduce((sum, p) => sum + p.closingBalance, 0) / projections.length;

  // Chart data for visualization
  const chartData = projections.map(p => ({
    date: p.date,
    balance: p.closingBalance,
    inflows: p.totalInflows,
    outflows: p.totalOutflows,
  }));

  const chartHeight = 200;
  const chartWidth = 100;
  const maxChartValue = Math.max(maxBalance, ...projections.map(p => Math.max(p.totalInflows, p.totalOutflows)));
  const minChartValue = Math.min(minBalance, 0);
  const valueRange = maxChartValue - minChartValue;

  const getY = (value: number) => {
    return chartHeight - ((value - minChartValue) / valueRange) * chartHeight;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-2xl rotate-12 floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-xl -rotate-12 floating" style={{ animationDelay: '2s' }}></div>
          
          {/* Chart icon pattern */}
          <div className="absolute top-8 right-16 opacity-10">
            <TrendingUp className="w-24 h-24" />
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Finansijske projekcije • Prognoza
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              💰 Projekcija Novčanog Toka
            </h1>
            <p className="text-xl text-amber-100 max-w-xl">
              Prognoza priliva i odliva za naredni period sa različitim scenarijima.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-amber-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              Dodaj stavku
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Početni saldo</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period (dana)</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={forecastDays}
              onChange={(e) => setForecastDays(Number(e.target.value))}
            >
              <option value={7}>7 dana</option>
              <option value={14}>14 dana</option>
              <option value={30}>30 dana</option>
              <option value={60}>60 dana</option>
              <option value={90}>90 dana</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prikaz</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'daily' | 'weekly' | 'monthly')}
            >
              <option value="daily">Dnevni</option>
              <option value="weekly">Nedeljni</option>
              <option value="monthly">Mesečni</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scenario</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ➕ Dodaj stavku
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Trenutni saldo</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(currentBalance)}</div>
        </div>
        <div className={`rounded-xl shadow-sm p-4 ${getBalanceColor(minBalance)}`}>
          <div className="text-sm opacity-80">Najniži saldo</div>
          <div className="text-2xl font-bold">{formatCurrency(minBalance)}</div>
          {minBalance < 0 && <div className="text-xs mt-1">⚠️ Rizik od manjka!</div>}
        </div>
        <div className="bg-green-50 rounded-xl shadow-sm p-4">
          <div className="text-sm text-green-600">Prosečni saldo</div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(averageBalance)}</div>
        </div>
        <div className="bg-blue-50 rounded-xl shadow-sm p-4">
          <div className="text-sm text-blue-600">Završni saldo</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(projections[projections.length - 1]?.closingBalance || 0)}
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Vizualizacija toka</h2>
        <div className="h-64 relative overflow-hidden">
          <svg width="100%" height="100%" viewBox={`0 0 ${projections.length * 30} ${chartHeight}`} preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={ratio * chartHeight}
                x2={projections.length * 30}
                y2={ratio * chartHeight}
                stroke="#e5e7eb"
                strokeDasharray="4"
              />
            ))}
            
            {/* Zero line if applicable */}
            {minBalance < 0 && (
              <line
                x1="0"
                y1={getY(0)}
                x2={projections.length * 30}
                y2={getY(0)}
                stroke="#ef4444"
                strokeWidth="2"
              />
            )}

            {/* Balance line - only render if we have data */}
            {projections.length > 0 && (
              <path
                d={projections.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * 30 + 15} ${getY(p.closingBalance)}`).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />
            )}

            {/* Area under balance - only render if we have data */}
            {projections.length > 0 && (
              <path
                d={`${projections.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * 30 + 15} ${getY(p.closingBalance)}`).join(' ')} L ${(projections.length - 1) * 30 + 15} ${chartHeight} L 15 ${chartHeight} Z`}
                fill="url(#balanceGradient)"
                opacity="0.3"
              />
            )}

            {/* Inflow bars */}
            {projections.map((p, i) => (
              <rect
                key={`in-${i}`}
                x={i * 30 + 5}
                y={getY(p.totalInflows)}
                width="8"
                height={Math.max(0, (p.totalInflows / valueRange) * chartHeight)}
                fill="#10b981"
                opacity="0.6"
              />
            ))}

            {/* Outflow bars */}
            {projections.map((p, i) => (
              <rect
                key={`out-${i}`}
                x={i * 30 + 17}
                y={getY(p.totalOutflows)}
                width="8"
                height={Math.max(0, (p.totalOutflows / valueRange) * chartHeight)}
                fill="#ef4444"
                opacity="0.6"
              />
            ))}

            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Legend */}
          <div className="absolute bottom-0 right-0 flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Saldo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Prilivi</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Odlivi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projections Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detaljna projekcija</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Početni saldo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prilivi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Odlivi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Neto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Završni saldo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stavke
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aggregatedProjections.map((proj, index) => (
                  <React.Fragment key={proj.date}>
                    <tr 
                      className={`hover:bg-gray-50 cursor-pointer ${proj.closingBalance < 0 ? 'bg-red-50' : ''}`}
                      onClick={() => setExpandedDate(expandedDate === proj.date ? null : proj.date)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(proj.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {formatCurrency(proj.openingBalance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                        +{formatCurrency(proj.totalInflows)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                        -{formatCurrency(proj.totalOutflows)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${proj.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {proj.netFlow >= 0 ? '+' : ''}{formatCurrency(proj.netFlow)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${getBalanceColor(proj.closingBalance).split(' ')[0]}`}>
                        {formatCurrency(proj.closingBalance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {proj.items.length} {expandedDate === proj.date ? '▲' : '▼'}
                        </span>
                      </td>
                    </tr>
                    {expandedDate === proj.date && proj.items.length > 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            {proj.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-white rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className={`w-2 h-2 rounded-full ${item.type === 'INFLOW' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                  <div>
                                    <span className="font-medium">{item.description}</span>
                                    {item.partnerName && <span className="text-gray-500 ml-2">({item.partnerName})</span>}
                                    {item.isRecurring && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 rounded">ponavljajuće</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-xs text-gray-500">{item.probability.toFixed(0)}% verovatnoća</span>
                                  <span className={`font-bold ${item.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.type === 'INFLOW' ? '+' : '-'}{formatCurrency(item.amount)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Dodaj projekciju</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="INFLOW">Priliv</option>
                  <option value="OUTFLOW">Odliv</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorija</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  {[...categories.inflow, ...categories.outflow].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Iznos</label>
                <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verovatnoća (%)</label>
                <input type="number" min="0" max="100" defaultValue="100" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="recurring" className="rounded" />
                <label htmlFor="recurring" className="text-sm text-gray-700">Ponavljajuća stavka</label>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowForecast;
