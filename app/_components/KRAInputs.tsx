'use client';

import { forwardRef, useState, ChangeEvent } from 'react';

// ============= ID Input Component =============
// For National ID / Alien ID - numeric, up to 8 digits

interface IDInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const IDInput = forwardRef<HTMLInputElement, IDInputProps>(
  ({ label, helperText, error, required = true, onChange, onValidationChange, className = '', value, ...props }, ref) => {
    const [internalError, setInternalError] = useState('');

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Only allow numeric characters
      if (inputValue && !/^\d*$/.test(inputValue)) {
        return; // Ignore non-numeric input
      }

      // Limit to 8 digits
      const truncatedValue = inputValue.slice(0, 8);
      
      // Validate
      let validationError = '';
      if (truncatedValue.length > 0 && truncatedValue.length < 6) {
        validationError = 'ID must be at least 6 digits';
      }
      
      setInternalError(validationError);
      onValidationChange?.(!validationError && truncatedValue.length >= 6);
      onChange?.(truncatedValue);
    };

    const displayError = error || internalError;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(optional)</span>}
          </label>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={8}
          value={value}
          onChange={handleChange}
          placeholder="e.g., 12345678"
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${
            displayError ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          {...props}
        />
        {displayError && (
          <p className="mt-1 text-sm text-red-600">{displayError}</p>
        )}
        {helperText && !displayError && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

IDInput.displayName = 'IDInput';


// ============= PIN Input Component =============
// For KRA PIN - alphanumeric, exactly 11 characters (e.g., A012345678Z)

interface PINInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const PINInput = forwardRef<HTMLInputElement, PINInputProps>(
  ({ label, helperText, error, required = true, onChange, onValidationChange, className = '', value, ...props }, ref) => {
    const [internalError, setInternalError] = useState('');

    const validatePIN = (pin: string): string => {
      if (!pin) return '';
      
      // PIN format: Letter + 9 digits + Letter (e.g., A012345678Z)
      if (pin.length > 0 && pin.length < 11) {
        return 'PIN must be 11 characters';
      }
      
      if (pin.length === 11) {
        // Check format: starts with letter, ends with letter, middle is digits
        const pinRegex = /^[A-Z]\d{9}[A-Z]$/;
        if (!pinRegex.test(pin.toUpperCase())) {
          return 'Invalid PIN format (e.g., A012345678Z)';
        }
      }
      
      return '';
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.toUpperCase();
      
      // Only allow alphanumeric characters
      inputValue = inputValue.replace(/[^A-Z0-9]/g, '');
      
      // Limit to 11 characters
      const truncatedValue = inputValue.slice(0, 11);
      
      // Validate
      const validationError = validatePIN(truncatedValue);
      
      setInternalError(validationError);
      onValidationChange?.(!validationError && truncatedValue.length === 11);
      onChange?.(truncatedValue);
    };

    const displayError = error || internalError;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(optional)</span>}
          </label>
        )}
        <input
          ref={ref}
          type="text"
          maxLength={11}
          value={value}
          onChange={handleChange}
          placeholder="e.g., A012345678Z"
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono uppercase ${
            displayError ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          {...props}
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {displayError && (
              <p className="text-sm text-red-600">{displayError}</p>
            )}
            {helperText && !displayError && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
          </div>
          <span className={`text-xs ${
            (value as string)?.length === 11 ? 'text-green-600' : 'text-gray-400'
          }`}>
            {(value as string)?.length || 0}/11
          </span>
        </div>
      </div>
    );
  }
);

PINInput.displayName = 'PINInput';


// ============= Validation Helpers =============

export const isValidID = (id: string): boolean => {
  if (!id) return false;
  return /^\d{6,8}$/.test(id);
};

export const isValidPIN = (pin: string): boolean => {
  if (!pin || pin.length !== 11) return false;
  return /^[A-Z]\d{9}[A-Z]$/i.test(pin);
};

export const isValidPINOrID = (value: string): boolean => {
  if (!value) return false;
  return isValidPIN(value) || isValidID(value);
};

export const formatPIN = (pin: string): string => {
  return pin.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
};

export const maskPIN = (pin: string): string => {
  if (!pin || pin.length < 4) return pin;
  return `${pin.slice(0, 1)}****${pin.slice(-4)}`;
};

export const maskID = (id: string): string => {
  if (!id || id.length < 4) return id;
  return `${id.slice(0, 4)}****${id.slice(-2)}`;
};


// ============= PIN or ID Input Component =============
// Accepts either PIN (11 chars: A + 9 digits + letter) or ID (6-8 numeric digits)

interface PINOrIDInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean, type: 'pin' | 'id' | 'invalid' | 'empty') => void;
}

export const PINOrIDInput = forwardRef<HTMLInputElement, PINOrIDInputProps>(
  ({ label, helperText, error, required = true, onChange, onValidationChange, className = '',placeholder='A012345678Z or 12345678', value, ...props }, ref) => {
    const [internalError, setInternalError] = useState('');
    const [detectedType, setDetectedType] = useState<'pin' | 'id' | 'invalid' | 'empty'>('empty');

    const validateValue = (val: string): { error: string; type: 'pin' | 'id' | 'invalid' | 'empty' } => {
      if (!val || val.trim() === '') {
        return { error: '', type: 'empty' };
      }

      const trimmed = val.trim().toUpperCase();

      // Check if it looks like a PIN (contains letters)
      if (/[A-Z]/.test(trimmed)) {
        // Validate as PIN
        if (trimmed.length < 11) {
          return { error: 'PIN must be 11 characters', type: 'invalid' };
        }
        if (trimmed.length === 11) {
          const pinRegex = /^[A-Z]\d{9}[A-Z]$/;
          if (!pinRegex.test(trimmed)) {
            return { error: 'Invalid PIN format (e.g., A012345678Z)', type: 'invalid' };
          }
          return { error: '', type: 'pin' };
        }
        return { error: 'Invalid format', type: 'invalid' };
      } else {
        // Validate as ID (numeric only)
        if (!/^\d+$/.test(trimmed)) {
          return { error: 'ID must be numeric', type: 'invalid' };
        }
        if (trimmed.length < 6) {
          return { error: 'ID must be at least 6 digits', type: 'invalid' };
        }
        if (trimmed.length > 8) {
          return { error: 'ID must be at most 8 digits', type: 'invalid' };
        }
        return { error: '', type: 'id' };
      }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.toUpperCase();
      
      // Only allow alphanumeric characters
      inputValue = inputValue.replace(/[^A-Z0-9]/g, '');
      
      // Limit length
      const maxLength = /[A-Z]/.test(inputValue) ? 11 : 8;
      const truncatedValue = inputValue.slice(0, maxLength);
      
      // Validate
      const { error: validationError, type } = validateValue(truncatedValue);
      
      setInternalError(validationError);
      setDetectedType(type);
      onValidationChange?.(type === 'pin' || type === 'id', type);
      onChange?.(truncatedValue);
    };

    const displayError = error || internalError;
    const currentValue = (value as string) || '';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(optional)</span>}
          </label>
        )}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
            displayError ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          {...props}
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {displayError && (
              <p className="text-sm text-red-600">{displayError}</p>
            )}
            {helperText && !displayError && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
          </div>
          {currentValue.length > 0 && (
            <span className={`text-xs ${
              detectedType === 'pin' || detectedType === 'id' ? 'text-green-600' : 'text-gray-400'
            }`}>
              {detectedType === 'pin' && '✓ PIN'}
              {detectedType === 'id' && '✓ ID'}
              {detectedType === 'invalid' && `${currentValue.length} chars`}
            </span>
          )}
        </div>
      </div>
    );
  }
);

PINOrIDInput.displayName = 'PINOrIDInput';
