/**
 * Onboarding / Welcome Tutorial Component
 * Guides new users through the application features
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Dobrodošli u SEF Portal! 🎉',
    description: 'Ova aplikacija vam omogućava jednostavno upravljanje elektronskim fakturama u skladu sa srpskim zakonom. Hajde da prođemo kroz osnovne funkcionalnosti.',
    icon: '👋',
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Komandna tabla',
    description: 'Ovde imate pregled svih važnih informacija - ukupan broj faktura, promet, dospeća i upozorenja.',
    icon: '📊',
    position: 'center',
  },
  {
    id: 'invoices',
    title: 'Upravljanje fakturama',
    description: 'Kreirajte, pregledajte i šaljite fakture direktno na SEF sistem. Pratite status svake fakture u realnom vremenu.',
    icon: '📄',
    position: 'center',
  },
  {
    id: 'partners',
    title: 'Šifarnik partnera',
    description: 'Vodite evidenciju o svim vašim kupcima i dobavljačima. Jednom uneti podaci se automatski popunjavaju na fakturama.',
    icon: '👥',
    position: 'center',
  },
  {
    id: 'products',
    title: 'Šifarnik proizvoda',
    description: 'Definišite proizvode i usluge sa cenama i PDV stopama. Ubrzajte kreiranje faktura!',
    icon: '📦',
    position: 'center',
  },
  {
    id: 'accounting',
    title: 'Računovodstvo',
    description: 'Kontni plan, dnevnik knjiženja i finansijski izveštaji - sve na jednom mestu.',
    icon: '📑',
    position: 'center',
  },
  {
    id: 'shortcuts',
    title: 'Prečice na tastaturi',
    description: 'Koristite Ctrl+K za brzu pretragu, Ctrl+Shift+N za novu fakturu, i ? za listu svih prečica.',
    icon: '⌨️',
    position: 'center',
  },
  {
    id: 'finish',
    title: 'Spremni ste! 🚀',
    description: 'Sada znate osnove. Ako vam treba pomoć, kliknite na ? ikonu u donjem desnom uglu. Srećno sa radom!',
    icon: '✅',
    position: 'center',
  },
];

interface OnboardingTutorialProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const goToNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const goToPrev = () => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape') onSkip();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`
        w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden
        transform transition-all duration-200
        ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
      `}>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/30">
              {step.icon}
            </div>
          </div>

          {/* Title & Description */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {step.title}
          </h2>
          <p className="text-gray-600 text-center leading-relaxed">
            {step.description}
          </p>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${index === currentStep 
                    ? 'w-8 bg-blue-500' 
                    : index < currentStep 
                      ? 'bg-blue-300' 
                      : 'bg-gray-200'
                  }
                `}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Preskoči vodič
          </button>
          
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={goToPrev}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Nazad
              </button>
            )}
            <button
              onClick={goToNext}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            >
              {isLastStep ? 'Završi' : 'Dalje →'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Hook to manage onboarding state
export const useOnboarding = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const storageKey = 'sef-onboarding-completed';

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay showing tutorial to let the app load first
      const timer = setTimeout(() => setShowTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTutorial = () => {
    localStorage.setItem(storageKey, 'true');
    setShowTutorial(false);
  };

  const skipTutorial = () => {
    localStorage.setItem(storageKey, 'skipped');
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem(storageKey);
    setShowTutorial(true);
  };

  return {
    showTutorial,
    completeTutorial,
    skipTutorial,
    resetTutorial,
  };
};

export default OnboardingTutorial;
