import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorProvider } from './contexts/ErrorContext';
import { ToastProvider } from './contexts/ToastContext';
import { Toaster } from './components/Toaster';
import { LoadingSpinner } from './components/LoadingSpinner';
import { GlobalSearch } from './components/GlobalSearch';
import { KeyboardHelp } from './components/KeyboardHelp';
import { OnboardingTutorial, useOnboarding } from './components/OnboardingTutorial';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy load heavy pages for better initial load performance
const AdvancedDashboard = lazy(() => import('./pages/AdvancedDashboard').then(m => ({ default: m.AdvancedDashboard })));
const AdvancedInvoiceList = lazy(() => import('./pages/AdvancedInvoiceList').then(m => ({ default: m.AdvancedInvoiceList })));
const AdvancedInvoiceDetail = lazy(() => import('./pages/AdvancedInvoiceDetail').then(m => ({ default: m.AdvancedInvoiceDetail })));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice').then(m => ({ default: m.CreateInvoice })));
const RecurringInvoices = lazy(() => import('./pages/RecurringInvoices'));
const CreateRecurringInvoice = lazy(() => import('./pages/CreateRecurringInvoice'));
const IncomingInvoices = lazy(() => import('./pages/IncomingInvoices'));
const IncomingInvoiceDetail = lazy(() => import('./pages/IncomingInvoiceDetail'));
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

// New modules
const KPO = lazy(() => import('./pages/KPO'));
const Compensations = lazy(() => import('./pages/Compensations'));
const IOS = lazy(() => import('./pages/IOS'));
const ExchangeRates = lazy(() => import('./pages/ExchangeRates'));
const PPPDV = lazy(() => import('./pages/PPPDV'));
const AdvanceInvoices = lazy(() => import('./pages/AdvanceInvoices'));
const CashFlow = lazy(() => import('./pages/CashFlow'));
const EmailNotifications = lazy(() => import('./pages/EmailNotifications'));
const SEFPortal = lazy(() => import('./pages/SEFPortal'));

// Calculations
const CalculationList = lazy(() => import('./pages/calculations/CalculationList').then(m => ({ default: m.CalculationList })));
const CalculationForm = lazy(() => import('./pages/calculations/CalculationForm').then(m => ({ default: m.CalculationForm })));

// Fixed Assets
const FixedAssetList = lazy(() => import('./pages/fixed-assets/FixedAssetList').then(m => ({ default: m.FixedAssetList })));
const FixedAssetForm = lazy(() => import('./pages/fixed-assets/FixedAssetForm').then(m => ({ default: m.FixedAssetForm })));

// Petty Cash
const PettyCashList = lazy(() => import('./pages/petty-cash/PettyCashList').then(m => ({ default: m.PettyCashList })));

// Travel Orders
const TravelOrderList = lazy(() => import('./pages/travel-orders/TravelOrderList').then(m => ({ default: m.TravelOrderList })));
const TravelOrderForm = lazy(() => import('./pages/travel-orders/TravelOrderForm').then(m => ({ default: m.TravelOrderForm })));

// Admin pages
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const Notifications = lazy(() => import('./pages/Notifications'));

// App wrapper with global features
const AppContent: React.FC = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { showTutorial, completeTutorial, skipTutorial } = useOnboarding();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Listen for global events
  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    const handleOpenHelp = () => setHelpOpen(true);
    const handleEscape = () => {
      setSearchOpen(false);
      setHelpOpen(false);
    };

    window.addEventListener('openGlobalSearch', handleOpenSearch);
    window.addEventListener('openKeyboardHelp', handleOpenHelp);
    window.addEventListener('escapePressed', handleEscape);

    return () => {
      window.removeEventListener('openGlobalSearch', handleOpenSearch);
      window.removeEventListener('openKeyboardHelp', handleOpenHelp);
      window.removeEventListener('escapePressed', handleEscape);
    };
  }, []);

  return (
    <>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<AdvancedDashboard />} />
            <Route path="/invoices" element={<AdvancedInvoiceList />} />
            <Route path="/invoices/:id" element={<AdvancedInvoiceDetail />} />
            <Route path="/invoices/new" element={<CreateInvoice />} />
            <Route path="/recurring-invoices" element={<RecurringInvoices />} />
            <Route path="/recurring-invoices/new" element={<CreateRecurringInvoice />} />
            <Route path="/incoming-invoices" element={<IncomingInvoices />} />
            <Route path="/incoming-invoices/:id" element={<IncomingInvoiceDetail />} />
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
            
            {/* New Module Routes */}
            <Route path="/sef" element={<SEFPortal />} />
            <Route path="/kpo" element={<KPO />} />
            <Route path="/compensations" element={<Compensations />} />
            <Route path="/ios" element={<IOS />} />
            <Route path="/exchange-rates" element={<ExchangeRates />} />
            <Route path="/pppdv" element={<PPPDV />} />
            <Route path="/advance-invoices" element={<AdvanceInvoices />} />
            <Route path="/cash-flow-forecast" element={<CashFlow />} />
            <Route path="/email-notifications" element={<EmailNotifications />} />
            
            {/* Calculations Routes */}
            <Route path="/calculations" element={<CalculationList />} />
            <Route path="/calculations/new" element={<CalculationForm />} />
            <Route path="/calculations/:id" element={<CalculationForm />} />

            {/* Fixed Assets Routes */}
            <Route path="/fixed-assets" element={<FixedAssetList />} />
            <Route path="/fixed-assets/new" element={<FixedAssetForm />} />
            <Route path="/fixed-assets/:id" element={<FixedAssetForm />} />

            {/* Petty Cash Routes */}
            <Route path="/petty-cash" element={<PettyCashList />} />

            {/* Travel Orders Routes */}
            <Route path="/travel-orders" element={<TravelOrderList />} />
            <Route path="/travel-orders/new" element={<TravelOrderForm />} />
            <Route path="/travel-orders/:id" element={<TravelOrderForm />} />

            {/* Admin Routes */}
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/company" element={<CompanyProfile />} />
            <Route path="/notifications" element={<Notifications />} />
            
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </Layout>
      
      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      
      {/* Keyboard Help Modal */}
      <KeyboardHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      
      {/* Onboarding Tutorial */}
      <OnboardingTutorial 
        isOpen={showTutorial} 
        onComplete={completeTutorial} 
        onSkip={skipTutorial} 
      />
      
      {/* Help Button - Fixed Position */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 transition-all z-50 flex items-center justify-center text-xl font-bold"
        title="Pomoć (pritisni ?)"
      >
        ?
      </button>
    </>
  );
};

// Unauthenticated routes component
const UnauthenticatedRoutes: React.FC = () => {
  const location = useLocation();
  
  return (
    <Routes>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );
};

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
          <UnauthenticatedRoutes />
          <Toaster />
        </ErrorBoundary>
      </ErrorProvider>
    );
  }

  return (
    <ErrorProvider>
      <ErrorBoundary>
        <ToastProvider>
          <AppContent />
          <Toaster />
        </ToastProvider>
      </ErrorBoundary>
    </ErrorProvider>
  );
}

export default App;