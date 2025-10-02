import React from 'react';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Podešavanja sistema
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">SEF API konfiguracija</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Okruženje
                  </label>
                  <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option value="demo">Demo</option>
                    <option value="production">Produkcija</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    API ključ
                  </label>
                  <input
                    type="password"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Unesite API ključ"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Podaci kompanije</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Naziv kompanije
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Naziv vaše kompanije"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    PIB
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Adresa
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ulica i broj"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Grad
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Beograd"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Notifikacije</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    defaultChecked
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Email notifikacije za nove ulazne fakture
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    defaultChecked
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    SMS notifikacije za promene statusa
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Desktop notifikacije
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                Sačuvaj podešavanja
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};