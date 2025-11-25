import React from 'react';

interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
  suffix?: string;
  prefix?: string;
  containerClassName?: string;
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  label,
  error,
  helper,
  icon,
  suffix,
  prefix,
  containerClassName = '',
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            {prefix}
          </div>
        )}
        
        <input
          id={inputId}
          className={`
            w-full rounded-xl border transition-all duration-200
            py-3 sm:py-2.5 text-base sm:text-sm
            focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : prefix ? 'pl-12' : 'pl-4'}
            ${suffix ? 'pr-16' : 'pr-4'}
            ${error 
              ? 'border-red-300 bg-red-50/50 text-red-900 placeholder-red-300' 
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${className}
          `}
          {...props}
        />
        
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none bg-gray-100 px-2 py-1 rounded">
            {suffix}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
};

interface ResponsiveSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  containerClassName?: string;
}

export const ResponsiveSelect: React.FC<ResponsiveSelectProps> = ({
  label,
  error,
  helper,
  icon,
  options,
  placeholder,
  containerClassName = '',
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        
        <select
          id={selectId}
          className={`
            w-full rounded-xl border transition-all duration-200 appearance-none
            py-3 sm:py-2.5 text-base sm:text-sm
            focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : 'pl-4'}
            pr-10
            ${error 
              ? 'border-red-300 bg-red-50/50 text-red-900' 
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${className}
          `}
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
        
        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
};

interface ResponsiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  containerClassName?: string;
}

export const ResponsiveTextarea: React.FC<ResponsiveTextareaProps> = ({
  label,
  error,
  helper,
  containerClassName = '',
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <textarea
        id={textareaId}
        className={`
          w-full rounded-xl border transition-all duration-200 resize-none
          py-3 sm:py-2.5 px-4 text-base sm:text-sm
          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 bg-red-50/50 text-red-900 placeholder-red-300' 
            : 'border-gray-200 bg-white hover:border-gray-300'
          }
          ${className}
        `}
        rows={props.rows || 4}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
};

export default ResponsiveInput;
