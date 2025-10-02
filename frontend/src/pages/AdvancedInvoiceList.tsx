import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Invoice {
  id: string;
  number: string;
  date: string;
  partner: string;
  pib: string;
  amount: number;
  currency: string;
  status: 'poslato' | 'prihvaćeno' | 'odbijeno' | 'na_čekanju' | 'storno';
  type: 'izlazna' | 'ulazna';
  vatBase: number;
  vatRate: number;
  vatAmount: number;
  isCorrection?: boolean;
  isStorno?: boolean;
  hasReverseCharge?: boolean;
  paymentDeadline?: string;
  modified: string;
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: '2024-001',
    date: '2024-10-01',
    partner: 'ABC d.o.o.',
    pib: '12345678',
    amount: 120000,
    currency: 'RSD',
    status: 'prihvaćeno',
    type: 'izlazna',
    vatBase: 100000,
    vatRate: 20,
    vatAmount: 20000,
    modified: '2024-10-01 14:30'
  },
  {
    id: '2',
    number: '2024-002',
    date: '2024-10-02',
    partner: 'XYZ d.o.o.',
    pib: '87654321',
    amount: 84000,
    currency: 'RSD',
    status: 'na_čekanju',
    type: 'ulazna',
    vatBase: 70000,
    vatRate: 20,
    vatAmount: 14000,
    paymentDeadline: '2024-10-17',
    modified: '2024-10-02 09:15'
  },
  {
    id: '3',
    number: '2024-003-ISPRAVKA',
    date: '2024-10-03',
    partner: 'Test Company',
    pib: '11111111',
    amount: -50000,
    currency: 'RSD',
    status: 'odbijeno',
    type: 'izlazna',
    vatBase: -41667,
    vatRate: 20,
    vatAmount: -8333,
    isCorrection: true,
    modified: '2024-10-03 16:45'
  }
];

const StatusBadge = ({ status }: { status: Invoice['status'] }) => {
  const styles = {
    poslato: 'bg-blue-100 text-blue-800',
    prihvaćeno: 'bg-green-100 text-green-800',
    odbijeno: 'bg-red-100 text-red-800',
    na_čekanju: 'bg-yellow-100 text-yellow-800',
    storno: 'bg-gray-100 text-gray-800'
  };

  const labels = {
    poslato: 'Poslato',
    prihvaćeno: 'Prihvaćeno',
    odbijeno: 'Odbijeno', 
    na_čekanju: 'Na čekanju',
    storno: 'Storno'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const TypeBadge = ({ type }: { type: Invoice['type'] }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
    type === 'izlazna' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }`}>
    {type === 'izlazna' ? '📤 Izlazna' : '📥 Ulazna'}
  </span>
);

const SpecialBadge = ({ invoice }: { invoice: Invoice }) => {
  if (invoice.isCorrection) {
    return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">ISPRAVKA</span>;
  }
  if (invoice.isStorno) {
    return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">STORNO</span>;
  }
  if (invoice.hasReverseCharge) {
    return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">RC</span>;
  }
  return null;
};

export const AdvancedInvoiceList: React.FC = () => {
  const [invoices] = useState<Invoice[]>(mockInvoices);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState('svi');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSideDrawer, setShowSideDrawer] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  
  const views = [
    { id: 'svi', label: 'Svi', count: invoices.length },
    { id: 'izlazne', label: 'Izlazne', count: invoices.filter(i => i.type === 'izlazna').length },
    { id: 'ulazne', label: 'Ulazne', count: invoices.filter(i => i.type === 'ulazna').length },
    { id: 'na_čekanju', label: 'Na čekanju', count: invoices.filter(i => i.status === 'na_čekanju').length },
    { id: 'odbijene', label: 'Odbijene', count: invoices.filter(i => i.status === 'odbijeno').length }
  ];

  const savedViews = [
    'Visoki iznosi > 100k',
    'Prosečni mesec',
    'Kritični rokovi',
    'Export ready'
  ];

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAll = () => {
    setSelectedInvoices(
      selectedInvoices.length === invoices.length ? [] : invoices.map(i => i.id)
    );
  };

  const handleRowClick = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
    setShowSideDrawer(true);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: currency === 'RSD' ? 'RSD' : 'EUR'
    }).format(amount);
  };

  const selectedInvoice = selectedInvoiceId ? invoices.find(i => i.id === selectedInvoiceId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fakture</h1>
          <p className="text-gray-600 mt-1">Upravljanje izlaznim i ulaznim fakturama</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-primary bg-blue-500 hover:bg-blue-600">
            📄 Nova faktura
          </button>
          <button className="btn-primary bg-green-500 hover:bg-green-600">
            📊 Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži po broju, partneru, PIB-u, statusu..."
                className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
              <option>Svi statusi</option>
              <option>Poslato</option>
              <option>Prihvaćeno</option>
              <option>Odbijeno</option>
              <option>Na čekanju</option>
            </select>
            
            <select className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
              <option>Svi tipovi</option>
              <option>Izlazne</option>
              <option>Ulazne</option>
            </select>
            
            <select className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
              <option>Ovaj mesec</option>
              <option>Prošli mesec</option>
              <option>Ovaj kvartal</option>
              <option>Ova godina</option>
            </select>
          </div>
        </div>

        {/* Saved Views */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-600">Saved views:</span>
          {savedViews.map((view, index) => (
            <button
              key={index}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              {view}
            </button>
          ))}
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors">
            + Sačuvaj view
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setCurrentView(view.id)}
              className={`px-6 py-4 font-medium transition-colors ${
                currentView === view.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {view.label}
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                {view.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.length > 0 && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedInvoices.length} dokumenata izabrano
              </span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                  ✅ Prihvati
                </button>
                <button className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                  ❌ Odbij
                </button>
                <button className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">
                  🔄 Ponovo pošalji
                </button>
                <button className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">
                  📄 Export
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === invoices.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Broj/Datum
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner/PIB
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Iznos/PDV
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status/Tip
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rok/Izmena
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr 
                  key={invoice.id}
                  className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(invoice)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => handleSelectInvoice(invoice.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{invoice.number}</span>
                        <SpecialBadge invoice={invoice} />
                      </div>
                      <div className="text-sm text-gray-500">{invoice.date}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.partner}</div>
                      <div className="text-sm text-gray-500">PIB: {invoice.pib}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(invoice.amount, invoice.currency)}
                      </div>
                      <div className="text-sm text-gray-500">
                        PDV: {formatAmount(invoice.vatAmount, invoice.currency)} ({invoice.vatRate}%)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={invoice.status} />
                      <TypeBadge type={invoice.type} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {invoice.paymentDeadline && (
                        <div className="text-sm text-gray-900">Rok: {invoice.paymentDeadline}</div>
                      )}
                      <div className="text-sm text-gray-500">Izmena: {invoice.modified}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Pregled"
                      >
                        👁️
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="text-green-600 hover:text-green-900"
                        title="PDF"
                      >
                        📄
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="text-purple-600 hover:text-purple-900"
                        title="XML"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer */}
      {showSideDrawer && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSideDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Faktura {selectedInvoice.number}
                  </h3>
                  <button 
                    onClick={() => setShowSideDrawer(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Partner</label>
                    <p className="text-sm text-gray-900">{selectedInvoice.partner}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">PIB</label>
                    <p className="text-sm text-gray-900">{selectedInvoice.pib}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Iznos</label>
                    <p className="text-sm text-gray-900">
                      {formatAmount(selectedInvoice.amount, selectedInvoice.currency)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <StatusBadge status={selectedInvoice.status} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">PDV detalji</label>
                    <div className="text-sm text-gray-900 space-y-1">
                      <p>Osnovica: {formatAmount(selectedInvoice.vatBase, selectedInvoice.currency)}</p>
                      <p>Stopa: {selectedInvoice.vatRate}%</p>
                      <p>PDV: {formatAmount(selectedInvoice.vatAmount, selectedInvoice.currency)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Link 
                    to={`/invoices/${selectedInvoice.id}`}
                    className="flex-1 btn-primary bg-blue-500 hover:bg-blue-600 text-center"
                  >
                    📄 Detaljan pregled
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};