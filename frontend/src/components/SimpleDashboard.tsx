import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { Invoice } from '../types/invoice';

interface DashboardStats {
  totalInvoices: number;
  draftInvoices: number;
  sentInvoices: number;
  totalAmount: number;
}

const SimpleDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    draftInvoices: 0,
    sentInvoices: 0,
    totalAmount: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await invoiceService.getInvoices();
      if (response.success && response.data) {
        const invoices = response.data;
        
        // Calculate stats
        const draftCount = invoices.filter(inv => inv.status === 'DRAFT').length;
        const sentCount = invoices.filter(inv => inv.status === 'SENT').length;
        const totalAmount = invoices
          .filter(inv => inv.direction === 'OUTGOING')
          .reduce((sum, inv) => sum + inv.totalAmount, 0);

        setStats({
          totalInvoices: invoices.length,
          draftInvoices: draftCount,
          sentInvoices: sentCount,
          totalAmount
        });

        // Set recent invoices (last 5)
        setRecentInvoices(invoices.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Pregled poslovanja i faktura</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ukupno faktura</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft fakture</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draftInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Poslate fakture</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sentInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ukupna vrednost</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalAmount.toLocaleString('sr-RS', {
                  style: 'currency',
                  currency: 'RSD'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-gray-900">Najnovije fakture</h2>
        </div>
        <div className="p-6">
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nema faktura</h3>
              <p className="mt-1 text-sm text-gray-500">Kreirajte vašu prvu fakturu.</p>
              <div className="mt-6">
                <button
                  onClick={() => window.location.href = '/invoices/create'}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Nova Faktura
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/invoices/${invoice.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invoice.direction === 'OUTGOING' ? invoice.buyer.name : invoice.supplier.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.totalAmount.toLocaleString('sr-RS', {
                        style: 'currency',
                        currency: invoice.currency
                      })}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === 'DRAFT'
                        ? 'bg-gray-100 text-gray-800'
                        : invoice.status === 'SENT'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={() => window.location.href = '/invoices'}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Pogledaj sve fakture →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;