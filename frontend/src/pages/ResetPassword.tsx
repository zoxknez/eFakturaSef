/**
 * ResetPassword Page
 * Stranica za unos nove lozinke
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { validatePassword } from '../utils/passwordValidation';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Provera validnosti tokena
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        return;
      }

      try {
        await apiClient.get(`/auth/verify-reset-token?token=${token}`);
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      }
    };

    verifyToken();
  }, [token]);

  const validation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = validation.isValid && passwordsMatch && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password
      });
      setIsSuccess(true);
      
      // Redirektuj na login nakon 3 sekunde
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Došlo je do greške. Pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Token nije validan
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Link nije validan
            </h2>
            
            <p className="text-gray-600 mb-6">
              Link za reset lozinke je istekao ili je već iskorišćen. 
              Zatražite novi link za reset.
            </p>

            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-center"
              >
                Zatraži novi link
              </Link>
              
              <Link
                to="/login"
                className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center"
              >
                Nazad na prijavu
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading dok se proverava token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Proveravam link...</p>
        </div>
      </div>
    );
  }

  // Uspešan reset
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Lozinka je promenjena!
            </h2>
            
            <p className="text-gray-600 mb-6">
              Vaša nova lozinka je sačuvana. Bićete preusmereni na stranicu za prijavu...
            </p>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Prijavite se sada
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
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Kreirajte novu lozinku
            </h2>
            <p className="text-gray-600">
              Unesite novu lozinku za vaš nalog.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Nova lozinka */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Nova lozinka
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Unesite novu lozinku"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              
              {/* Password strength meter */}
              {password && (
                <div className="mt-3">
                  <PasswordStrengthMeter password={password} />
                </div>
              )}
            </div>

            {/* Potvrda lozinke */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Potvrdite lozinku
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  placeholder="Ponovite lozinku"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="mt-2 text-sm text-red-600">
                  Lozinke se ne poklapaju
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Čuvam...
                </span>
              ) : (
                'Sačuvaj novu lozinku'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
