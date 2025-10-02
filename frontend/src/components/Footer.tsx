import React from 'react';
import { Github, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              SEF eFakture
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Profesionalna aplikacija za upravljanje elektronskim fakturama
              u skladu sa srpskim zakonskim propisima.
            </p>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Funkcionalnosti
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• SEF API integracija</li>
              <li>• UBL 2.1 validacija</li>
              <li>• Elektronska evidencija PDV</li>
              <li>• Multi-role upravljanje</li>
            </ul>
          </div>

          {/* Developer Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Developer Kontakt
            </h3>
            <div className="space-y-3">
              <a
                href="https://github.com/zoxknez"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <Github className="w-4 h-4 mr-2" />
                github.com/zoxknez
              </a>

              <a
                href="mailto:zoxknez@hotmail.com"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                zoxknez@hotmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-gray-200/50 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center text-sm text-gray-500">
            <span>Developed by o0o0o0o</span>
          </div>
          <div className="text-sm text-gray-500 mt-2 sm:mt-0">
            © 2025 SEF eFakture • TypeScript + React + Node.js
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
