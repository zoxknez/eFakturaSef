import React from 'react';
import { useParams } from 'react-router-dom';

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Detalji fakture #{id}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Osnovni podaci</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Broj fakture:</dt>
                  <dd className="text-sm text-gray-900">2024-001</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Datum izdavanja:</dt>
                  <dd className="text-sm text-gray-900">01.10.2024</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status:</dt>
                  <dd>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Prihvaćena
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Finansijski podaci</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Osnovica:</dt>
                  <dd className="text-sm text-gray-900">41.666,67 RSD</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">PDV (20%):</dt>
                  <dd className="text-sm text-gray-900">8.333,33 RSD</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 font-medium">Ukupno:</dt>
                  <dd className="text-sm text-gray-900 font-medium">50.000,00 RSD</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};