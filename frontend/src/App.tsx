import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdvancedDashboard } from './pages/AdvancedDashboard';
import { Login } from './pages/Login';
import { AdvancedInvoiceDetail } from './pages/AdvancedInvoiceDetail';
import InvoiceList from './components/invoices/InvoiceList';
import CreateInvoiceComponent from './components/invoices/CreateInvoice';
import { Settings } from './pages/Settings';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <div className="text-lg font-medium text-gray-700 animate-pulse">Učitavanje...</div>
          <div className="text-sm text-gray-500 mt-1">SEF eFakture Portal</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AdvancedDashboard />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<AdvancedInvoiceDetail />} />
        <Route path="/invoices/create" element={<CreateInvoiceComponent />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
