import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdvancedDashboard } from './pages/AdvancedDashboard';
import { Login } from './pages/Login';
import { AdvancedInvoiceList } from './pages/AdvancedInvoiceList';
import { AdvancedInvoiceDetail } from './pages/AdvancedInvoiceDetail';
import { CreateInvoice } from './pages/CreateInvoice';
import { Settings } from './pages/Settings';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Učitavanje...</div>
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
        <Route path="/invoices" element={<AdvancedInvoiceList />} />
        <Route path="/invoices/:id" element={<AdvancedInvoiceDetail />} />
        <Route path="/invoices/new" element={<CreateInvoice />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;