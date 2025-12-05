import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

export interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
  data?: unknown;
}

interface AutocompleteProps {
  label: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onSelect: (option: AutocompleteOption | null) => void;
  onSearch: (query: string) => Promise<AutocompleteOption[]>;
  error?: string;
  disabled?: boolean;
  allowCustom?: boolean; // Allow manual input if no match
  minChars?: number; // Minimum characters to trigger search
  debounceMs?: number; // Debounce delay in milliseconds
}

// Debounce hook
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  label,
  placeholder = 'Počnite da kucate...',
  required = false,
  value = '',
  onSelect,
  onSearch,
  error,
  disabled = false,
  allowCustom = false,
  minChars = 2,
  debounceMs = 300
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform the actual search
  const performSearch = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setIsOpen(true);

    try {
      const results = await onSearch(query);
      setOptions(results);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Autocomplete search error', error);
      }
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onSearch]);

  // Debounced search
  const debouncedSearch = useDebounce(performSearch, debounceMs);

  const handleInputChange = (query: string) => {
    setInputValue(query);
    setSelectedIndex(-1);

    if (!query || query.length < minChars) {
      setOptions([]);
      setIsOpen(false);
      if (!query && !allowCustom) {
        onSelect(null);
      }
      return;
    }

    // Use debounced search
    debouncedSearch(query);
  };

  const handleSelect = (option: AutocompleteOption) => {
    setInputValue(option.label);
    setIsOpen(false);
    setOptions([]);
    onSelect(option);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && options[selectedIndex]) {
          handleSelect(options[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleBlur = () => {
    // Delay to allow click events on options to fire
    setTimeout(() => {
      if (allowCustom && inputValue) {
        // Keep the custom value
      } else if (!inputValue) {
        onSelect(null);
      }
    }, 200);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative mt-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => inputValue.length >= minChars && setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className={`block w-full border rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                index === selectedIndex ? 'bg-blue-100' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{option.label}</div>
              {option.sublabel && (
                <div className="text-sm text-gray-500">{option.sublabel}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && options.length === 0 && inputValue.length >= minChars && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-500">
          {allowCustom ? 'Nema rezultata - možete uneti ručno' : 'Nema rezultata'}
        </div>
      )}
    </div>
  );
};
