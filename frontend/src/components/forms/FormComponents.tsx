/**
 * Form Components with enhanced validation
 * Komponente za forme sa naprednom validacijom i boljim UX-om
 */

import React, { useState, forwardRef } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

// Types
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  success?: boolean;
  containerClassName?: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
  containerClassName?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  containerClassName?: string;
}

// Form Input Component
export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    hint, 
    icon, 
    rightIcon, 
    success, 
    className, 
    containerClassName,
    type = 'text',
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{icon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full rounded-lg border px-3 py-2.5 text-sm transition-all duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              'dark:bg-gray-800 dark:text-white',
              icon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-600'
                : success
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-200 dark:border-green-600'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-700',
              className
            )}
            {...props}
          />
          
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          
          {rightIcon && !isPassword && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {rightIcon}
            </div>
          )}
          
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          )}
          
          {success && !error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

// Form Textarea Component
export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    label, 
    error, 
    hint, 
    maxLength, 
    showCount = true,
    className, 
    containerClassName,
    value,
    ...props 
  }, ref) => {
    const charCount = typeof value === 'string' ? value.length : 0;
    const isNearLimit = maxLength && charCount >= maxLength * 0.9;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={ref}
            value={value}
            maxLength={maxLength}
            className={cn(
              'w-full rounded-lg border px-3 py-2.5 text-sm transition-all duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              'dark:bg-gray-800 dark:text-white',
              'resize-y min-h-[100px]',
              error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-600'
                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-700',
              className
            )}
            {...props}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            {hint && !error && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
            )}
          </div>
          
          {showCount && maxLength && (
            <span className={cn(
              'text-xs',
              isNearLimit ? 'text-amber-600' : 'text-gray-400'
            )}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// Form Select Component
export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    label, 
    error, 
    hint, 
    options, 
    placeholder,
    className, 
    containerClassName,
    ...props 
  }, ref) => {
    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full rounded-lg border px-3 py-2.5 text-sm transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              'dark:bg-gray-800 dark:text-white',
              'appearance-none cursor-pointer',
              error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-600'
                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-700',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Chevron Icon */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// Form Checkbox Component
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  error?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className={cn('flex items-start gap-3 cursor-pointer group', className)}>
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              className={cn(
                'w-4 h-4 rounded border-gray-300 text-blue-600',
                'focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
                'transition-all duration-200',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-red-500'
              )}
              {...props}
            />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
              {label}
            </span>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 ml-7">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

// Form Radio Group Component
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  label?: string;
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function FormRadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
  orientation = 'vertical',
  className
}: RadioGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className={cn(
        'space-y-2',
        orientation === 'horizontal' && 'flex flex-wrap gap-4 space-y-0'
      )}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-3 cursor-pointer group',
              option.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-center h-5">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                className={cn(
                  'w-4 h-4 border-gray-300 text-blue-600',
                  'focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
                  'transition-all duration-200',
                  error && 'border-red-500'
                )}
              />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                {option.label}
              </span>
              {option.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

// Money Input Component
interface MoneyInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: number | null;
  onChange?: (value: number | null) => void;
  currency?: string;
  locale?: string;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ 
    value, 
    onChange, 
    currency = 'RSD', 
    locale = 'sr-RS',
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => {
      if (value == null) return '';
      return value.toLocaleString(locale);
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value.replace(/[^\d,.-]/g, '');
      setDisplayValue(input);
      
      // Parse the number
      const parsed = parseFloat(input.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      } else if (input === '') {
        onChange?.(null);
      }
    };

    const handleBlur = () => {
      if (value != null) {
        setDisplayValue(value.toLocaleString(locale));
      }
    };

    return (
      <FormInput
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        rightIcon={<span className="text-gray-400 text-sm">{currency}</span>}
        {...props}
      />
    );
  }
);

MoneyInput.displayName = 'MoneyInput';
