import React from 'react';
import { Github, Mail, Code, Zap, ExternalLink } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
            <Code className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            SEF eFakture Aplikacija
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Profesionalna full-stack TypeScript aplikacija za integraciju sa srpskim SEF (Sistem Elektronskih Faktura) API-jem
          </p>
        </div>

        {/* Tech Stack */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <Code className="w-6 h-6 mr-3 text-blue-600" />
            Tehnologije
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TS</span>
              </div>
              <p className="font-medium text-gray-700">TypeScript</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">⚛️</span>
              </div>
              <p className="font-medium text-gray-700">React 18</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📊</span>
              </div>
              <p className="font-medium text-gray-700">Prisma ORM</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🐘</span>
              </div>
              <p className="font-medium text-gray-700">PostgreSQL</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            🚀 Ključne funkcionalnosti
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">SEF API Integracija</h3>
                <p className="text-gray-600 text-sm">Puna integracija sa srpskim sistemom e-faktura</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">UBL 2.1 Validacija</h3>
                <p className="text-gray-600 text-sm">Automatska validacija UBL dokumenata</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Multi-role sistem</h3>
                <p className="text-gray-600 text-sm">Admin, Računovođa, Revizor, Operater</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Webhook Callbacks</h3>
                <p className="text-gray-600 text-sm">Sigurno rukovanje callback operacijama</p>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Info */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Developer
            </h2>
            <p className="text-gray-600">
              Specializovan za enterprise TypeScript aplikacije i modern web development
            </p>
          </div>

          {/* Contact Links */}
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://github.com/zoxknez"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center p-4 bg-gray-900 hover:bg-gray-800 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <Github className="w-6 h-6 text-white mr-3" />
              <div className="text-left">
                <div className="text-white font-medium">GitHub</div>
                <div className="text-gray-300 text-sm">@zoxknez</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto group-hover:text-white transition-colors" />
            </a>



            <a
              href="mailto:zoxknez@hotmail.com"
              className="group flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <Mail className="w-6 h-6 text-white mr-3" />
              <div className="text-left">
                <div className="text-white font-medium">Email</div>
                <div className="text-blue-100 text-sm">zoxknez@hotmail.com</div>
              </div>
              <ExternalLink className="w-4 h-4 text-blue-200 ml-auto group-hover:text-white transition-colors" />
            </a>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              🇷🇸 Razvijeno u Srbiji • 2025 • TypeScript + React + Node.js
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
