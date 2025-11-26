/**
 * ForgotPassword Page
 * Stranica za zahtev za reset lozinke
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch (err: unknown) {
      // Ne otkrivamo da li email postoji ili ne (sigurnost)
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Proverite vaš email
            </h2>
            
            <p className="text-gray-600 mb-6">
              Ako postoji nalog sa email adresom <strong>{email}</strong>, 
              poslaćemo vam link za reset lozinke.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-800 mb-2">📧 Šta dalje?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Proverite inbox (i spam/junk folder)</li>
                <li>2. Kliknite na link u emailu</li>
                <li>3. Link važi 24 sata</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Niste dobili email?{' '}
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Pokušajte ponovo
              </button>
            </p>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Nazad na prijavu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad na prijavu
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Zaboravili ste lozinku?
            </h2>
            <p className="text-gray-600">
              Unesite email adresu i poslaćemo vam link za reset lozinke.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email adresa
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="vas@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Šalje se...
                </span>
              ) : (
                'Pošalji link za reset'
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Potrebna pomoć?{' '}
              <a href="mailto:podrska@example.com" className="text-blue-600 hover:text-blue-700 font-medium">
                Kontaktirajte podršku
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
