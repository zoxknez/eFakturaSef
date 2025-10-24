import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import PaymentModal from '../components/PaymentModal';
import PaymentHistory from '../components/PaymentHistory';
import { logger } from '../utils/logger';

/** ==== Types (tvoja šema, sa par helpera) ==== */

interface Partner {
  id: string;
  name: string;
  pib: string;
  type: 'pravno_lice' | 'fizicko_lice' | 'preduzetnik';
  address?: string;
  city?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  vatPayer: boolean;
  defaultPaymentTerms: number;
}

interface InvoiceLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;     // npr. 0, 10, 20
  totalAmount: number; // ukupno sa PDV-om ili bez? -> pretpostavi sa PDV-om; niže ćemo obračunati oprezno
  productId?: string;
}

interface TimelineEvent {
  date: string;
  time: string;
  event: string;
  status: 'success' | 'warning' | 'error' | 'info';
  description: string;
  details?: string;
}

interface Attachment {
  name: string;
  type: string;
  size: string;
  url: string;
}

interface RelatedDoc {
  type: 'crf' | 'pdv_evidencija' | 'uvozna_deklaracija' | 'storno' | 'ispravka';
  number: string;
  status: string;
  url: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  sefId?: string;
  issueDate: string;
  dueDate?: string;

  // Partner (novo) + legacy fallback polja
  partnerId?: string;
  partner?: Partner;
  buyerName?: string;
  buyerPIB?: string;
  buyerAddress?: string;
  buyerCity?: string;

  totalAmount: number; // ukupno (sa PDV-om)
  taxAmount: number;   // samo PDV deo (ako dostupno)
  paidAmount?: number;
  currency: string;    // RSD/EUR...
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  type: 'OUTGOING' | 'INCOMING';
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

  lines?: InvoiceLine[];

  note?: string;
  ublXml?: string;

  createdAt: string;
  updatedAt: string;
  sentAt?: string;

  timeline?: TimelineEvent[];
  attachments?: Attachment[];
  relatedDocuments?: RelatedDoc[];
}

/** ==== UI helpers ==== */

const StatusIcon = ({ status }: { status: TimelineEvent['status'] }) => {
  const icons: Record<TimelineEvent['status'], string> = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
  };
  return <span className="text-lg">{icons[status]}</span>;
};

const PartnerTypeBadge = ({ type }: { type: Partner['type'] }) => {
  const styles: Record<Partner['type'], string> = {
    pravno_lice: 'bg-blue-100 text-blue-800',
    fizicko_lice: 'bg-purple-100 text-purple-800',
    preduzetnik: 'bg-green-100 text-green-800',
  };
  const labels: Record<Partner['type'], string> = {
    pravno_lice: '🏢 Pravno lice',
    fizicko_lice: '👤 Fizičko lice',
    preduzetnik: '💼 Preduzetnik',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>{labels[type]}</span>;
};

const PartnerSourceBadge = ({ invoice }: { invoice: InvoiceDetail }) => {
  if (invoice.partnerId && invoice.partner) {
    return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✅ Iz šifarnika</span>;
  }
  return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">📝 Ručni unos</span>;
};

const srStatusLabel: Record<InvoiceDetail['status'], string> = {
  DRAFT: 'Nacrt',
  SENT: 'Poslato',
  ACCEPTED: 'Prihvaćeno',
  REJECTED: 'Odbačeno',
  CANCELLED: 'Storno',
};

const statusBadgeClass = (s: InvoiceDetail['status']) => {
  switch (s) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'SENT':
      return 'bg-blue-100 text-blue-800';
    case 'ACCEPTED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-zinc-100 text-zinc-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const paymentBadge = (s?: InvoiceDetail['paymentStatus']) => {
  switch (s) {
    case 'PAID':
      return { text: '✅ Plaćeno', cls: 'bg-green-100 text-green-800' };
    case 'PARTIALLY_PAID':
      return { text: '⏳ Delimično plaćeno', cls: 'bg-yellow-100 text-yellow-800' };
    case 'OVERDUE':
      return { text: '⛔ Kašnjenje', cls: 'bg-red-100 text-red-800' };
    default:
      return { text: '❌ Neplaćeno', cls: 'bg-red-100 text-red-800' };
  }
};

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('sr-RS', { style: 'currency', currency: currency || 'RSD' }).format(amount);

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('sr-RS') : '—');

/** Obračun PDV-a iz stavki (grupisanje po stopi). Ako nema linija, koristi total/taxAmount kao fallback. */
const computeVatBreakdown = (invoice: InvoiceDetail) => {
  const result: Array<{ rate: number; base: number; tax: number; total: number }> = [];

  if (invoice.lines?.length) {
    const map = new Map<number, { base: number; tax: number; total: number }>();
    for (const l of invoice.lines) {
      const rate = Number(l.taxRate) || 0;
      // pretpostavka: l.totalAmount je sa PDV-om; bazu računamo: base = total / (1 + rate/100)
      const total = l.totalAmount;
      const base = rate > 0 ? total / (1 + rate / 100) : total;
      const tax = total - base;
      const agg = map.get(rate) || { base: 0, tax: 0, total: 0 };
      agg.base += base;
      agg.tax += tax;
      agg.total += total;
      map.set(rate, agg);
    }
    for (const [rate, v] of map) result.push({ rate, base: v.base, tax: v.tax, total: v.total });
  } else {
    // fallback: jedna grupa sa implicitnom stopom (ako se može izvesti)
    result.push({
      rate: 0,
      base: invoice.totalAmount - (invoice.taxAmount || 0),
      tax: invoice.taxAmount || 0,
      total: invoice.totalAmount,
    });
  }

  // zaokruživanje na 2 decimale radi prikaza
  return result.map((r) => ({
    rate: r.rate,
    base: Math.round(r.base * 100) / 100,
    tax: Math.round(r.tax * 100) / 100,
    total: Math.round(r.total * 100) / 100,
  }));
};

/** IPS QR data (mock but closer-to-real). */
const buildIPSQRData = (inv: InvoiceDetail) => {
  const pib = inv.partner?.pib || inv.buyerPIB || '';
  const amount = (inv.totalAmount || 0).toFixed(2).replace(',', '.');
  const ref = inv.invoiceNumber;
  const curr = inv.currency || 'RSD';
  // K:PR = kreditni transfer, SF:289 (model), R: poziv na broj (ovde broj fakture)
  // OVO JE MOCK STRING ZA DEMO – prilagodi prema tvojoj IPS implementaciji
  return `K:PR|V:${amount}|C:${curr}|P:${pib}|R:${ref}|SF:289|S:Placanje fakture ${ref}`;
};

export const AdvancedInvoiceDetail: React.FC = () => {
  const params = useParams();
  const id = params.id as string | undefined;

  const [activeTab, setActiveTab] = useState<'sažetak' | 'plaćanja' | 'stavke' | 'xml' | 'pdf' | 'istorija' | 'povezano'>('sažetak');
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.getInvoice(id);
      if (response?.success && response.data) {
        setInvoice(response.data as InvoiceDetail);
      } else {
        setError(response?.error || 'Greška pri učitavanju fakture.');
      }
    } catch (err: any) {
      logger.error('Error fetching invoice', err);
      setError(err?.message || 'Greška pri učitavanju fakture.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const onPaymentRecorded = () => fetchInvoice();
  const onPaymentCancelled = () => fetchInvoice();

  const tabs = [
    { id: 'sažetak', label: 'Sažetak', icon: '📋' },
    { id: 'plaćanja', label: 'Plaćanja', icon: '💰' },
    { id: 'stavke', label: 'Stavke i PDV', icon: '🧾' },
    { id: 'xml', label: 'XML/UBL', icon: '📄' },
    { id: 'pdf', label: 'PDF', icon: '📑' },
    { id: 'istorija', label: 'Istorija/Audit', icon: '🕓' },
    { id: 'povezano', label: 'Povezano', icon: '🔗' },
  ] as const;

  const qrURL = useMemo(() => {
    if (!invoice) return '';
    const data = buildIPSQRData(invoice);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  }, [invoice]);

  const vatSummary = useMemo(() => (invoice ? computeVatBreakdown(invoice) : []), [invoice]);

  const paid = invoice?.paidAmount ?? 0;
  const remaining = Math.max((invoice?.totalAmount ?? 0) - paid, 0);

  const openPDF = async () => {
    if (!invoice) return;
    try {
      // prilagodi prema tvom API-ju
      const blob = await api.downloadInvoicePDF(invoice.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      logger.error('Failed to download PDF', e);
      alert('Nije moguće preuzeti PDF.');
    }
  };

  const downloadXML = async () => {
    if (!invoice) return;
    try {
      const blob = await api.downloadInvoiceXML(invoice.id); // ili skloni i koristi invoice.ublXml
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      logger.error('Failed to download XML', e);
      alert('Nije moguće preuzeti XML.');
    }
  };

  const copySEF = async () => {
    if (!invoice?.sefId) return;
    try {
      await navigator.clipboard.writeText(invoice.sefId);
      // mali vizuelni feedback – možeš zameniti toastom
      alert('SEF ID je kopiran.');
    } catch {}
  };

  const stepDone = (step: 'created' | 'sent' | 'accepted' | 'paid') => {
    if (!invoice) return false;
    if (step === 'created') return true;
    if (step === 'sent') return ['SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED'].includes(invoice.status);
    if (step === 'accepted') return invoice.status === 'ACCEPTED';
    if (step === 'paid') return invoice.paymentStatus === 'PAID';
    return false;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
          {error}
        </div>
        <button onClick={fetchInvoice} className="mt-4 btn-primary bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white">
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4">
          Faktura nije pronađena.
        </div>
      </div>
    );
  }

  const typeLabel = invoice.type === 'OUTGOING' ? '📤 Izlazna' : '📥 Ulazna';
  const payBadge = paymentBadge(invoice.paymentStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/invoices" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              ← Nazad
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Faktura {invoice.invoiceNumber}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(invoice.status)}`}>
                  {srStatusLabel[invoice.status]}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${payBadge.cls}`}>{payBadge.text}</span>
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                SEF ID: {invoice.sefId ? <span className="font-mono">{invoice.sefId}</span> : '—'}
                {invoice.sefId && (
                  <button onClick={copySEF} className="text-blue-600 hover:text-blue-800 text-sm underline">
                    kopiraj
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {invoice.paymentStatus !== 'PAID' && (
              <button onClick={() => setShowPaymentModal(true)} className="btn-primary bg-green-500 hover:bg-green-600 flex items-center gap-2 px-3 py-2 rounded-lg text-white">
                💰 Evidentiraj Plaćanje
              </button>
            )}
            <button onClick={openPDF} className="btn-primary bg-blue-500 hover:bg-blue-600 flex items-center gap-2 px-3 py-2 rounded-lg text-white">
              📄 PDF
            </button>
            <button onClick={downloadXML} className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 px-3 py-2 rounded-lg text-white">
              📋 XML/UBL
            </button>
            <button className="btn-primary bg-red-500/90 hover:bg-red-600 flex items-center gap-2 px-3 py-2 rounded-lg text-white">
              🚫 Storno
            </button>
            <button className="btn-primary bg-gray-500 hover:bg-gray-600 flex items-center gap-2 px-3 py-2 rounded-lg text-white">
              ⚙️ Više
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
          <div className="flex items-center space-x-6">
            {/* Kreirana */}
            <div className="text-center">
              <div className={`w-8 h-8 ${stepDone('created') ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-1`}>
                {stepDone('created') ? '✓' : '•'}
              </div>
              <span className="text-xs text-gray-600">Kreirana</span>
            </div>
            <div className={`flex-1 h-0.5 ${stepDone('sent') ? 'bg-green-300' : 'bg-gray-200'}`} />
            {/* Poslata */}
            <div className="text-center">
              <div className={`w-8 h-8 ${stepDone('sent') ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-1`}>
                {stepDone('sent') ? '✓' : '•'}
              </div>
              <span className="text-xs text-gray-600">Poslata</span>
            </div>
            <div className={`flex-1 h-0.5 ${stepDone('accepted') ? 'bg-green-300' : 'bg-gray-200'}`} />
            {/* Prihvaćena */}
            <div className="text-center">
              <div className={`w-8 h-8 ${stepDone('accepted') ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-1`}>
                {stepDone('accepted') ? '✓' : '•'}
              </div>
              <span className="text-xs text-gray-600">Prihvaćena</span>
            </div>
            <div className={`flex-1 h-0.5 ${stepDone('paid') ? 'bg-green-300' : 'bg-gray-200'}`} />
            {/* Plaćena */}
            <div className="text-center">
              <div className={`w-8 h-8 ${stepDone('paid') ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-1`}>
                {stepDone('paid') ? '✓' : '?'}
              </div>
              <span className="text-xs text-gray-600">Plaćena</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Sažetak */}
          {activeTab === 'sažetak' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Osnovni podaci</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Broj fakture</label>
                      <p className="text-sm text-gray-900">{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Datum</label>
                      <p className="text-sm text-gray-900">{formatDate(invoice.issueDate)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tip</label>
                      <p className="text-sm text-gray-900">{typeLabel}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Rok plaćanja</label>
                      <p className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Partner</h3>
                    <PartnerSourceBadge invoice={invoice} />
                  </div>
                  {invoice.partner ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Naziv</span>
                        <PartnerTypeBadge type={invoice.partner.type} />
                      </div>
                      <p className="text-sm text-gray-900 font-medium">{invoice.partner.name}</p>
                      <div>
                        <label className="text-sm font-medium text-gray-500">PIB</label>
                        <p className="text-sm text-gray-900">{invoice.partner.pib}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Adresa</label>
                        <p className="text-sm text-gray-900">
                          {[invoice.partner.address, invoice.partner.city, invoice.partner.postalCode].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm text-gray-900">{invoice.partner.email || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Platni uslovi</label>
                        <p className="text-sm text-gray-900">{invoice.partner.defaultPaymentTerms} dana</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">PDV obveznik</label>
                        <p className="text-sm text-gray-900">{invoice.partner.vatPayer ? '✅ Da' : '❌ Ne'}</p>
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <Link 
                          to={`/partners?highlight=${invoice.partner.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          ✏️ Uredi partnera →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 font-medium">Legacy kupac (ručni unos)</p>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Naziv</label>
                        <p className="text-sm text-gray-900">{invoice.buyerName || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">PIB</label>
                        <p className="text-sm text-gray-900">{invoice.buyerPIB || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Adresa</label>
                        <p className="text-sm text-gray-900">
                          {[invoice.buyerAddress, invoice.buyerCity].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {invoice.note && (
                  <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Napomene</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{invoice.note}</p>
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Iznos</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Osnovica (≈):</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(Math.max(invoice.totalAmount - (invoice.taxAmount || 0), 0), invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">PDV:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(invoice.taxAmount || 0, invoice.currency)}
                      </span>
                    </div>
                    <div className="border-t border-blue-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-gray-900">Ukupno:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* IPS QR */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">IPS QR Kod</h3>
                  <div className="flex flex-col items-center">
                    {qrURL ? (
                      <img src={qrURL} alt="IPS QR Code" className="w-40 h-40 border border-gray-200 rounded-lg" />
                    ) : (
                      <div className="w-40 h-40 border border-gray-200 rounded-lg grid place-items-center text-gray-400">N/A</div>
                    )}
                    <p className="text-xs text-gray-500 mt-2 text-center">Skeniraj za instant plaćanje</p>
                  </div>
                </div>

                {/* Attachments */}
                {invoice.attachments?.length ? (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Prilozi</h3>
                    <div className="space-y-2">
                      {invoice.attachments.map((attachment, idx) => (
                        <div key={`${attachment.url}-${idx}`} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">📎</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                              <p className="text-xs text-gray-500">
                                {attachment.type} • {attachment.size}
                              </p>
                            </div>
                          </div>
                          <a href={attachment.url} className="text-blue-600 hover:text-blue-800 text-sm" target="_blank" rel="noreferrer">
                            Preuzmi
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Plaćanja */}
          {activeTab === 'plaćanja' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Status plaćanja</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Ukupan iznos:</span>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Plaćeno:</span>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(paid, invoice.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Preostalo:</span>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(remaining, invoice.currency)}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`ml-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${payBadge.cls}`}>
                    {payBadge.text}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Istorija plaćanja</h3>
                  {invoice.paymentStatus !== 'PAID' && (
                    <button onClick={() => setShowPaymentModal(true)} className="btn-primary bg-green-500 hover:bg-green-600 flex items-center gap-2 px-3 py-2 rounded-lg text-white">
                      ➕ Dodaj plaćanje
                    </button>
                  )}
                </div>
                <PaymentHistory invoiceId={invoice.id} onPaymentCancelled={onPaymentCancelled} />
              </div>
            </div>
          )}

          {/* Stavke i PDV */}
          {activeTab === 'stavke' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Količina</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jed. cena</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PDV stopa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Iznos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.lines?.map((l) => (
                      <tr key={l.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{l.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{l.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(l.unitPrice, invoice.currency)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{l.taxRate}%</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(l.totalAmount, invoice.currency)}</td>
                      </tr>
                    )) || (
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
                          Nema stavki.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">PDV rekap</h3>
                <div className="space-y-2">
                  {vatSummary.map((row) => (
                    <div key={row.rate} className="flex justify-between text-sm">
                      <span>Osnovica ({row.rate}%):</span>
                      <span className="font-medium">{formatCurrency(row.base, invoice.currency)}</span>
                    </div>
                  ))}
                  {vatSummary.map((row) => (
                    <div key={`t-${row.rate}`} className="flex justify-between text-sm">
                      <span>PDV ({row.rate}%):</span>
                      <span className="font-medium">{formatCurrency(row.tax, invoice.currency)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Ukupno za plaćanje:</span>
                      <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Istorija/Audit */}
          {activeTab === 'istorija' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Timeline događaja</h3>
              <div className="space-y-4">
                {invoice.timeline?.length ? (
                  invoice.timeline.map((event, index) => (
                    <div key={`${event.event}-${index}`} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                      <StatusIcon status={event.status} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{event.event}</h4>
                          <span className="text-xs text-gray-500">
                            {event.date} {event.time}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        {event.details && <p className="text-xs text-gray-500 mt-1 bg-white px-2 py-1 rounded">{event.details}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Nema događaja.</div>
                )}
              </div>
            </div>
          )}

          {/* XML/UBL */}
          {activeTab === 'xml' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">XML/UBL Dokument</h3>
                <div className="flex gap-2">
                  <button className="btn-primary bg-green-500 hover:bg-green-600 px-3 py-2 rounded-lg text-white">✅ Validacija OK</button>
                  <button onClick={downloadXML} className="btn-primary bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg text-white">
                    📄 Preuzmi XML
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6 text-green-400 font-mono text-sm overflow-x-auto">
                <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${invoice.invoiceNumber}</ID>
  <IssueDate>${invoice.issueDate}</IssueDate>
  <InvoiceTypeCode>380</InvoiceTypeCode>
  <DocumentCurrencyCode>${invoice.currency}</DocumentCurrencyCode>
  <AccountingSupplierParty>
    <Party>
      <PartyTaxScheme>
        <CompanyID>${invoice.partner?.pib || invoice.buyerPIB || ''}</CompanyID>
      </PartyTaxScheme>
      <PartyLegalEntity>
        <RegistrationName>${invoice.partner?.name || invoice.buyerName || ''}</RegistrationName>
      </PartyLegalEntity>
    </Party>
  </AccountingSupplierParty>
  <LegalMonetaryTotal>
    <LineExtensionAmount currencyID="${invoice.currency}">${Math.max(
      invoice.totalAmount - (invoice.taxAmount || 0),
      0
    ).toFixed(2)}</LineExtensionAmount>
    <TaxExclusiveAmount currencyID="${invoice.currency}">${Math.max(
      invoice.totalAmount - (invoice.taxAmount || 0),
      0
    ).toFixed(2)}</TaxExclusiveAmount>
    <TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.totalAmount.toFixed(2)}</TaxInclusiveAmount>
    <PayableAmount currencyID="${invoice.currency}">${invoice.totalAmount.toFixed(2)}</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`}</pre>
              </div>
            </div>
          )}

          {/* PDF */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">PDF Pregled</h3>
                <button onClick={openPDF} className="btn-primary bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg text-white">
                  📄 Preuzmi / Otvori PDF
                </button>
              </div>
              <div className="bg-gray-100 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-600 mb-4">PDF dokument je spreman za pregled.</p>
                <button onClick={openPDF} className="btn-primary bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg text-white">
                  Otvori u novom tabu
                </button>
              </div>
            </div>
          )}

          {/* Povezano */}
          {activeTab === 'povezano' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Povezani dokumenti</h3>
              {invoice.relatedDocuments?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoice.relatedDocuments.map((doc, index) => (
                    <div key={`${doc.type}-${doc.number}-${index}`} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 uppercase">{doc.type}</h4>
                          <p className="text-sm text-gray-600">{doc.number}</p>
                          <span className="text-xs text-gray-500">{doc.status}</span>
                        </div>
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                          Pregled →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-gray-600">Nema povezanih dokumenata</p>
                  <div className="flex justify-center space-x-3 mt-4">
                    <button className="btn-primary bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-lg text-white">🔗 Kreiraj CRF</button>
                    <button className="btn-primary bg-purple-500 hover:bg-purple-600 px-3 py-2 rounded-lg text-white">📊 PDV evidencija</button>
                    <button className="btn-primary bg-green-500 hover:bg-green-600 px-3 py-2 rounded-lg text-white">🚚 Uvozna deklaracija</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {invoice && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount ?? 0,
            paymentStatus: invoice.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : (invoice.paymentStatus as 'UNPAID' | 'PAID' | 'OVERDUE'),
            currency: invoice.currency,
          }}
          onPaymentRecorded={onPaymentRecorded}
        />
      )}
    </div>
  );
};
