import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorProvider } from './contexts/ErrorContext';
import { Toaster } from './components/Toaster';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load heavy pages for better initial load performance
const AdvancedDashboard = lazy(() => import('./pages/AdvancedDashboard').then(m => ({ default: m.AdvancedDashboard })));
const AdvancedInvoiceList = lazy(() => import('./pages/AdvancedInvoiceList').then(m => ({ default: m.AdvancedInvoiceList })));
const AdvancedInvoiceDetail = lazy(() => import('./pages/AdvancedInvoiceDetail').then(m => ({ default: m.AdvancedInvoiceDetail })));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice').then(m => ({ default: m.CreateInvoice })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Partners = lazy(() => import('./pages/Partners'));
const Products = lazy(() => import('./pages/Products'));

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
    return (
      <ErrorProvider>
        <ErrorBoundary>
          <Login />
          <Toaster />
        </ErrorBoundary>
      </ErrorProvider>
    );
  }

  return (
    <ErrorProvider>
      <ErrorBoundary>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<AdvancedDashboard />} />
              <Route path="/invoices" element={<AdvancedInvoiceList />} />
              <Route path="/invoices/:id" element={<AdvancedInvoiceDetail />} />
              <Route path="/invoices/new" element={<CreateInvoice />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/products" element={<Products />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </Layout>
        <Toaster />
      </ErrorBoundary>
    </ErrorProvider>
  );
}

export default App;