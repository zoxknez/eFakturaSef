/**
 * PasswordStrengthMeter Component
 * Vizualni prikaz snage lozinke sa indikatorom i sugestijama
 */

import React, { useMemo } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { 
  validatePassword, 
  getStrengthLabel, 
  getStrengthColor,
  PasswordValidationResult 
} from '../utils/passwordValidation';
import { cn } from '../lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  showSuggestions?: boolean;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  showRequirements = true,
  showSuggestions = true,
  className
}: PasswordStrengthMeterProps) {
  const validation = useMemo(
    () => validatePassword(password),
    [password]
  );

  if (!password) return null;

  const { strength, score, errors, suggestions } = validation;
  const strengthPercent = (score / 5) * 100;

  const requirements = [
    { 
      label: 'Minimum 8 karaktera', 
      met: password.length >= 8 
    },
    { 
      label: 'Veliko slovo (A-Z)', 
      met: /[A-Z]/.test(password) 
    },
    { 
      label: 'Malo slovo (a-z)', 
      met: /[a-z]/.test(password) 
    },
    { 
      label: 'Broj (0-9)', 
      met: /[0-9]/.test(password) 
    },
    { 
      label: 'Specijalni karakter (!@#$%)', 
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      optional: true
    }
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Snaga lozinke:</span>
          <span className={cn(
            'font-medium',
            strength === 'weak' && 'text-red-600',
            strength === 'fair' && 'text-orange-600',
            strength === 'good' && 'text-yellow-600',
            strength === 'strong' && 'text-green-600',
            strength === 'very-strong' && 'text-emerald-600'
          )}>
            {getStrengthLabel(strength)}
          </span>
        </div>
        
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              getStrengthColor(strength)
            )}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Zahtevi:
          </p>
          <ul className="space-y-1">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                {req.met ? (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <X className={cn(
                    'w-4 h-4 flex-shrink-0',
                    req.optional ? 'text-gray-400' : 'text-red-500'
                  )} />
                )}
                <span className={cn(
                  req.met 
                    ? 'text-green-700 dark:text-green-400' 
                    : req.optional 
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-red-700 dark:text-red-400'
                )}>
                  {req.label}
                  {req.optional && (
                    <span className="text-gray-400 ml-1">(opciono)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Predlozi za poboljšanje:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-0.5">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
