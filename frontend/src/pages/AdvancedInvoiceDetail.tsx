import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface InvoiceDetail {
  id: string;
  number: string;
  sefId: string;
  date: string;
  partner: {
    name: string;
    pib: string;
    address: string;
    city: string;
    email: string;
  };
  amount: number;
  currency: string;
  status: 'poslato' | 'prihvaćeno' | 'odbijeno' | 'na_čekanju' | 'storno';
  type: 'izlazna' | 'ulazna';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    amount: number;
  }>;
  paymentTerms: string;
  paymentDeadline: string;
  notes: string;
  timeline: Array<{
    date: string;
    time: string;
    event: string;
    status: 'success' | 'warning' | 'error' | 'info';
    description: string;
    details?: string;
  }>;
  attachments: Array<{
    name: string;
    type: string;
    size: string;
    url: string;
  }>;
  relatedDocuments: Array<{
    type: 'crf' | 'pdv_evidencija' | 'uvozna_deklaracija' | 'storno' | 'ispravka';
    number: string;
    status: string;
    url: string;
  }>;
}

const mockInvoice: InvoiceDetail = {
  id: '1',
  number: '2024-001',
  sefId: 'SEF-2024-001-ABC123',
  date: '2024-10-01',
  partner: {
    name: 'ABC d.o.o.',
    pib: '12345678',
    address: 'Knez Mihailova 1',
    city: 'Beograd 11000',
    email: 'fakture@abc.rs'
  },
  amount: 120000,
  currency: 'RSD',
  status: 'prihvaćeno',
  type: 'izlazna',
  items: [
    {
      description: 'Konsultantske usluge - oktobar 2024',
      quantity: 1,
      unitPrice: 100000,
      vatRate: 20,
      amount: 100000
    }
  ],
  paymentTerms: '15 dana',
  paymentDeadline: '2024-10-16',
  notes: 'Napomena: Plaćanje izvršiti na račun 160-43200-78',
  timeline: [
    {
      date: '2024-10-01',
      time: '14:30',
      event: 'Faktura kreirana',
      status: 'info',
      description: 'Dokument kreiran u sistemu'
    },
    {
      date: '2024-10-01',
      time: '14:32',
      event: 'Poslato u SEF',
      status: 'info',
      description: 'Dokument uspešno poslat u SEF sistem'
    },
    {
      date: '2024-10-01',
      time: '14:35',
      event: 'Validacija prošla',
      status: 'success',
      description: 'SEF validacija uspešno završena',
      details: 'XSD i poslovna pravila - OK'
    },
    {
      date: '2024-10-02',
      time: '09:15',
      event: 'Prihvaćeno od kupca',
      status: 'success',
      description: 'Kupac je prihvatio fakturu',
      details: 'Automatsko prihvatanje - 18h nakon slanja'
    }
  ],
  attachments: [
    {
      name: 'faktura-2024-001.pdf',
      type: 'PDF',
      size: '245 KB',
      url: '/attachments/faktura-2024-001.pdf'
    },
    {
      name: 'ugovor-osnov.pdf',
      type: 'PDF',
      size: '1.2 MB',
      url: '/attachments/ugovor-osnov.pdf'
    }
  ],
  relatedDocuments: []
};

const StatusIcon = ({ status }: { status: string }) => {
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };
  return <span className="text-lg">{icons[status as keyof typeof icons]}</span>;
};

export const AdvancedInvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('sažetak');
  const [invoice] = useState<InvoiceDetail>(mockInvoice);

  const tabs = [
    { id: 'sažetak', label: 'Sažetak', icon: '📋' },
    { id: 'stavke', label: 'Stavke i PDV', icon: '💰' },
    { id: 'xml', label: 'XML/UBL', icon: '📄' },
    { id: 'pdf', label: 'PDF', icon: '📑' },
    { id: 'istorija', label: 'Istorija/Audit', icon: '📊' },
    { id: 'povezano', label: 'Povezano', icon: '🔗' }
  ];

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: currency === 'RSD' ? 'RSD' : 'EUR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      poslato: 'bg-blue-100 text-blue-800',
      prihvaćeno: 'bg-green-100 text-green-800',
      odbijeno: 'bg-red-100 text-red-800',
      na_čekanju: 'bg-yellow-100 text-yellow-800',
      storno: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const generateQRCode = () => {
    // Mock QR data - u realnoj aplikaciji bi se generisao pravi QR kod
    const qrData = `K:PR${invoice.partner.pib}|V:${invoice.amount}|R:${invoice.number}|SF:289|S:Opis plaćanja`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              to="/invoices"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              ← Nazad
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Faktura {invoice.number}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </h1>
              <p className="text-gray-600">SEF ID: {invoice.sefId}</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="btn-primary bg-blue-500 hover:bg-blue-600 flex items-center gap-2">
              📄 PDF
            </button>
            <button className="btn-primary bg-green-500 hover:bg-green-600 flex items-center gap-2">
              📋 XML/UBL
            </button>
            <button className="btn-primary bg-red-500 hover:bg-red-600 flex items-center gap-2">
              🚫 Storno
            </button>
            <button className="btn-primary bg-gray-500 hover:bg-gray-600 flex items-center gap-2">
              ⚙️ Više
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-1">✓</div>
                <span className="text-xs text-gray-600">Kreirana</span>
              </div>
              <div className="flex-1 h-0.5 bg-green-300"></div>
              <div className="text-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-1">✓</div>
                <span className="text-xs text-gray-600">Poslata</span>
              </div>
              <div className="flex-1 h-0.5 bg-green-300"></div>
              <div className="text-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-1">✓</div>
                <span className="text-xs text-gray-600">Validirana</span>
              </div>
              <div className="flex-1 h-0.5 bg-green-300"></div>
              <div className="text-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-1">✓</div>
                <span className="text-xs text-gray-600">Prihvaćena</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200"></div>
              <div className="text-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-bold mx-auto mb-1">?</div>
                <span className="text-xs text-gray-600">Plaćena</span>
              </div>
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
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Sažetak Tab */}
          {activeTab === 'sažetak' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Osnovni podaci</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Broj fakture</label>
                      <p className="text-sm text-gray-900">{invoice.number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Datum</label>
                      <p className="text-sm text-gray-900">{invoice.date}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tip</label>
                      <p className="text-sm text-gray-900">
                        {invoice.type === 'izlazna' ? '📤 Izlazna' : '📥 Ulazna'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Rok plaćanja</label>
                      <p className="text-sm text-gray-900">{invoice.paymentDeadline}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Partner</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Naziv</label>
                      <p className="text-sm text-gray-900">{invoice.partner.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">PIB</label>
                      <p className="text-sm text-gray-900">{invoice.partner.pib}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Adresa</label>
                      <p className="text-sm text-gray-900">{invoice.partner.address}, {invoice.partner.city}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm text-gray-900">{invoice.partner.email}</p>
                    </div>
                  </div>
                </div>

                {invoice.notes && (
                  <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Napomene</h3>
                    <p className="text-sm text-gray-900">{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Right Column - Amount & QR */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Iznos</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Osnovica:</span>
                      <span className="text-sm font-medium">
                        {formatAmount(invoice.amount / 1.2, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">PDV (20%):</span>
                      <span className="text-sm font-medium">
                        {formatAmount(invoice.amount - (invoice.amount / 1.2), invoice.currency)}
                      </span>
                    </div>
                    <div className="border-t border-blue-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-gray-900">Ukupno:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatAmount(invoice.amount, invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* IPS QR Code */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">IPS QR Kod</h3>
                  <div className="flex flex-col items-center">
                    <img 
                      src={generateQRCode()} 
                      alt="IPS QR Code" 
                      className="w-40 h-40 border border-gray-200 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Skeniraj za instant plaćanje
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                {invoice.attachments.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Prilozi</h3>
                    <div className="space-y-2">
                      {invoice.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">📎</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{attachment.size}</p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Preuzmi
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stavke Tab */}
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
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatAmount(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.vatRate}%</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatAmount(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">PDV rekap</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Osnovica (20%):</span>
                    <span className="font-medium">{formatAmount(100000, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PDV (20%):</span>
                    <span className="font-medium">{formatAmount(20000, invoice.currency)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Ukupno za plaćanje:</span>
                      <span>{formatAmount(invoice.amount, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Istorija Tab */}
          {activeTab === 'istorija' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Timeline događaja</h3>
              <div className="space-y-4">
                {invoice.timeline.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                    <StatusIcon status={event.status} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{event.event}</h4>
                        <span className="text-xs text-gray-500">{event.date} {event.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      {event.details && (
                        <p className="text-xs text-gray-500 mt-1 bg-white px-2 py-1 rounded">
                          {event.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* XML Tab */}
          {activeTab === 'xml' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">XML/UBL Dokument</h3>
                <div className="flex space-x-2">
                  <button className="btn-primary bg-green-500 hover:bg-green-600">
                    ✅ Validacija OK
                  </button>
                  <button className="btn-primary bg-blue-500 hover:bg-blue-600">
                    📄 Preuzmi XML
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 text-green-400 font-mono text-sm overflow-x-auto">
                <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${invoice.number}</ID>
  <IssueDate>${invoice.date}</IssueDate>
  <InvoiceTypeCode>380</InvoiceTypeCode>
  <DocumentCurrencyCode>${invoice.currency}</DocumentCurrencyCode>
  
  <AccountingSupplierParty>
    <Party>
      <PartyTaxScheme>
        <CompanyID>${invoice.partner.pib}</CompanyID>
      </PartyTaxScheme>
      <PartyLegalEntity>
        <RegistrationName>${invoice.partner.name}</RegistrationName>
      </PartyLegalEntity>
    </Party>
  </AccountingSupplierParty>
  
  <LegalMonetaryTotal>
    <LineExtensionAmount currencyID="${invoice.currency}">100000</LineExtensionAmount>
    <TaxExclusiveAmount currencyID="${invoice.currency}">100000</TaxExclusiveAmount>
    <TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.amount}</TaxInclusiveAmount>
    <PayableAmount currencyID="${invoice.currency}">${invoice.amount}</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`}</pre>
              </div>
            </div>
          )}

          {/* PDF Tab */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">PDF Pregled</h3>
                <button className="btn-primary bg-blue-500 hover:bg-blue-600">
                  📄 Preuzmi PDF
                </button>
              </div>
              
              <div className="bg-gray-100 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-600 mb-4">PDF dokument je spreman za pregled</p>
                <button className="btn-primary bg-blue-500 hover:bg-blue-600">
                  Otvori u novom tabu
                </button>
              </div>
            </div>
          )}

          {/* Povezano Tab */}
          {activeTab === 'povezano' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Povezani dokumenti</h3>
              
              {invoice.relatedDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-gray-600">Nema povezanih dokumenata</p>
                  <div className="flex justify-center space-x-3 mt-4">
                    <button className="btn-primary bg-orange-500 hover:bg-orange-600">
                      🔗 Kreiraj CRF
                    </button>
                    <button className="btn-primary bg-purple-500 hover:bg-purple-600">
                      📊 PDV evidencija
                    </button>
                    <button className="btn-primary bg-green-500 hover:bg-green-600">
                      🚚 Uvozna deklaracija
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoice.relatedDocuments.map((doc, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{doc.type}</h4>
                          <p className="text-sm text-gray-600">{doc.number}</p>
                          <span className="text-xs text-gray-500">{doc.status}</span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800">
                          Pregled →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};