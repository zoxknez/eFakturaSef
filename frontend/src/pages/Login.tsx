import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Check, 
  Info, 
  AtSign, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Loader2
} from 'lucide-react';

// Kontrola za demo kredencijale - isključiti u produkciji
const SHOW_DEMO_CREDENTIALS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';

export const Login: React.FC = () => {
  const [email, setEmail] = useState(SHOW_DEMO_CREDENTIALS ? 'admin@demo-preduzece.rs' : '');
  const [password, setPassword] = useState(SHOW_DEMO_CREDENTIALS ? 'admin123' : '');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, password);
    setIsLoading(false);
  };

  const features = [
    { icon: '🔐', title: 'UBL 2.1 standard', desc: 'Potpuna kompatibilnost sa SEF sistemom' },
    { icon: '⚡', title: 'Praćenje u realnom vremenu', desc: 'Trenutna obaveštenja o statusima' },
    { icon: '🛡️', title: 'Bezbednost', desc: 'Šifrovanje i bezbednosni protokoli' },
    { icon: '📊', title: 'Izveštaji', desc: 'Detaljna analitika poslovanja' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-100 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="relative max-w-md w-full">
          {/* Logo and Header */}
          <div className="text-center mb-8 animate-fadeIn">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse-glow">
                  <span className="text-white font-black text-3xl">S</span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg border-4 border-white">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">
              SEF eFakture Portal
            </h2>
            <p className="text-gray-500 text-lg">
              Dobro došli u sistem elektronskih faktura
            </p>
          </div>

          {/* Demo credentials info - samo u dev modu */}
          {SHOW_DEMO_CREDENTIALS && (
          <div className="mb-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <div className="relative bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 rounded-2xl p-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full blur-2xl"></div>
              <div className="relative flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900 mb-1">Demo pristup</p>
                  <p className="text-xs text-blue-700">
                    <span className="font-mono bg-white/50 px-2 py-0.5 rounded">admin@demo-preduzece.rs</span>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Lozinka: <span className="font-mono bg-white/50 px-2 py-0.5 rounded">admin123</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Login Form */}
          <form className="space-y-5 animate-fadeIn" style={{ animationDelay: '200ms' }} onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresa e-pošte
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <AtSign className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-gray-300"
                    placeholder="Unesite vašu email adresu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Lozinka
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-gray-300"
                    placeholder="Unesite vašu lozinku"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  Zapamti me
                </span>
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Zaboravili ste lozinku?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
            >
              <span className={`flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : ''}`}>
                Prijavite se
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 text-center animate-fadeIn" style={{ animationDelay: '300ms' }}>
            <p className="text-sm text-gray-500">
              Nemate nalog?{' '}
              <a href="mailto:podrska@example.com" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Kontaktirajte administratora
              </a>
            </p>
          </div>

          {/* Divider */}
          <div className="relative mt-8 animate-fadeIn" style={{ animationDelay: '400ms' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-4 bg-gray-50 text-gray-400 font-semibold">ili</span>
            </div>
          </div>

          {/* Alternative login options */}
          <div className="mt-6 grid grid-cols-2 gap-3 animate-fadeIn" style={{ animationDelay: '500ms' }}>
            <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Feature showcase */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"></div>
          
          {/* Floating elements */}
          <div className="absolute top-20 right-20 w-24 h-24 bg-white/5 rounded-2xl floating border border-white/10 backdrop-blur-sm"></div>
          <div className="absolute bottom-32 left-16 w-16 h-16 bg-white/5 rounded-xl floating border border-white/10" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-8 w-12 h-12 bg-white/10 rounded-lg floating" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="max-w-lg text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 border border-white/10">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Sistem Elektronskih Faktura RS
            </div>
            <h1 className="text-5xl font-black mb-6 leading-tight">
              Moderno <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">eFakturisanje</span> za Srbiju
            </h1>
            <p className="text-xl text-blue-200/80 leading-relaxed">
              Potpuno automatizovano rešenje za slanje i primanje elektronskih faktura u skladu sa zakonodavstvom Republike Srbije
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-blue-200/60">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom stats */}
          <div className="mt-12 flex items-center gap-8 text-center">
            <div>
              <p className="text-4xl font-black text-white">10K+</p>
              <p className="text-sm text-blue-200/60">Faktura dnevno</p>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div>
              <p className="text-4xl font-black text-white">99.9%</p>
              <p className="text-sm text-blue-200/60">Uptime</p>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div>
              <p className="text-4xl font-black text-white">500+</p>
              <p className="text-sm text-blue-200/60">Kompanija</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};