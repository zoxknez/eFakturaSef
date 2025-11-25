import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { useAuth } from './contexts/AuthContext';
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

// Accounting module pages
const ChartOfAccounts = lazy(() => import('./pages/ChartOfAccounts'));
const JournalEntries = lazy(() => import('./pages/JournalEntries'));
const Reports = lazy(() => import('./pages/Reports'));
const VATRecords = lazy(() => import('./pages/VATRecords'));
const CreditNotes = lazy(() => import('./pages/CreditNotes'));
const BankStatements = lazy(() => import('./pages/BankStatements'));
const BankReconciliation = lazy(() => import('./pages/BankReconciliation'));
const PPPDVForm = lazy(() => import('./pages/PPPDVForm'));
const CashFlowForecast = lazy(() => import('./pages/CashFlowForecast'));
const AgingReports = lazy(() => import('./pages/AgingReports'));

// Admin pages
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const Notifications = lazy(() => import('./pages/Notifications'));

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Učitavanje...</p>
        </div>
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
              
              {/* Accounting Module Routes */}
              <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="/accounting/journal" element={<JournalEntries />} />
              <Route path="/accounting/reports" element={<Reports />} />
              <Route path="/vat" element={<VATRecords />} />
              <Route path="/vat/pppdv" element={<PPPDVForm />} />
              <Route path="/credit-notes" element={<CreditNotes />} />
              <Route path="/bank-statements" element={<BankStatements />} />
              <Route path="/bank-reconciliation" element={<BankReconciliation />} />
              <Route path="/cash-flow" element={<CashFlowForecast />} />
              <Route path="/aging" element={<AgingReports />} />
              
              {/* Admin Routes */}
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/company" element={<CompanyProfile />} />
              <Route path="/notifications" element={<Notifications />} />
              
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