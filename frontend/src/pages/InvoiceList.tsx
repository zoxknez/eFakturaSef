import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const InvoiceCard = ({ invoice }: { invoice: any }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Prihvaćena':
        return { 
          class: 'bg-gradient-to-r from-green-500 to-emerald-500', 
          icon: '✅',
          text: 'text-white'
        };
      case 'Poslata':
        return { 
          class: 'bg-gradient-to-r from-blue-500 to-cyan-500', 
          icon: '📤',
          text: 'text-white'
        };
      case 'Na čekanju':
        return { 
          class: 'bg-gradient-to-r from-yellow-500 to-orange-500', 
          icon: '⏳',
          text: 'text-white'
        };
      case 'Odbijena':
        return { 
          class: 'bg-gradient-to-r from-red-500 to-pink-500', 
          icon: '❌',
          text: 'text-white'
        };
      default:
        return { 
          class: 'bg-gray-100', 
          icon: '📄',
          text: 'text-gray-800'
        };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 card-hover border border-gray-200/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="text-lg font-bold text-gray-900">{invoice.number}</h3>
            <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.class} ${statusConfig.text}`}>
              {statusConfig.icon} {invoice.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">{invoice.buyerName}</p>
          <p className="text-xs text-gray-500">{invoice.date}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {Number(invoice.amount).toLocaleString('sr-RS')}
          </p>
          <p className="text-sm text-gray-500">RSD</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
        <div className="flex space-x-2">
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            📄 Pregled
          </button>
          <button className="text-xs text-purple-600 hover:text-purple-700 font-medium">
            📄 PDF
          </button>
          <button className="text-xs text-green-600 hover:text-green-700 font-medium">
            📧 Pošalji
          </button>
        </div>
        <Link
          to={`/invoices/${invoice.id}`}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-medium transition-colors"
        >
          Detalji →
        </Link>
      </div>
    </div>
  );
};

export const InvoiceList: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const mockInvoices = [
    { 
      id: '1', 
      number: '2024-001', 
      date: '01.10.2024', 
      amount: '50000.00', 
      status: 'Prihvaćena',
      buyerName: 'ABC Solutions d.o.o.'
    },
    { 
      id: '2', 
      number: '2024-002', 
      date: '02.10.2024', 
      amount: '75000.00', 
      status: 'Poslata',
      buyerName: 'XYZ Corporation d.o.o.'
    },
    { 
      id: '3', 
      number: '2024-003', 
      date: '02.10.2024', 
      amount: '25000.00', 
      status: 'Na čekanju',
      buyerName: 'Tech Innovations d.o.o.'
    },
    { 
      id: '4', 
      number: '2024-004', 
      date: '03.10.2024', 
      amount: '120000.00', 
      status: 'Prihvaćena',
      buyerName: 'Digital Services d.o.o.'
    },
    { 
      id: '5', 
      number: '2024-005', 
      date: '03.10.2024', 
      amount: '35000.00', 
      status: 'Odbijena',
      buyerName: 'Local Business d.o.o.'
    },
  ];

  const tabs = [
    { id: 'all', name: 'Sve fakture', count: mockInvoices.length },
    { id: 'sent', name: 'Poslate', count: mockInvoices.filter(i => i.status === 'Poslata').length },
    { id: 'accepted', name: 'Prihvaćene', count: mockInvoices.filter(i => i.status === 'Prihvaćena').length },
    { id: 'pending', name: 'Na čekanju', count: mockInvoices.filter(i => i.status === 'Na čekanju').length },
  ];

  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesSearch = invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.buyerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'sent') return matchesSearch && invoice.status === 'Poslata';
    if (activeTab === 'accepted') return matchesSearch && invoice.status === 'Prihvaćena';
    if (activeTab === 'pending') return matchesSearch && invoice.status === 'Na čekanju';
    
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fakture</h1>
          <p className="text-gray-600 mt-1">Upravljajte vašim elektronskim fakturama</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors">
            📥 Import
          </button>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors">
            📤 Export
          </button>
          <Link
            to="/invoices/new"
            className="btn-primary"
          >
            ➕ Nova faktura
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Pretragite po broju fakture ili kupcu..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              📅 Filter po datumu
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              💰 Filter po iznosu
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50">
        <div className="border-b border-gray-200/50">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Invoice Grid */}
        <div className="p-6">
          {filteredInvoices.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredInvoices.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nema faktura za prikaz
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Pokušajte sa drugačijim pretragom.' : 'Počnite kreiranje vaše prve fakture.'}
              </p>
              {!searchTerm && (
                <Link
                  to="/invoices/new"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  ➕ Kreiraj prvu fakturu
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Prikazano <span className="font-medium">1</span> do <span className="font-medium">{filteredInvoices.length}</span> od{' '}
                <span className="font-medium">{filteredInvoices.length}</span> rezultata
              </p>
              <div className="flex space-x-2">
                <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  ← Prethodna
                </button>
                <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Sledeća →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};