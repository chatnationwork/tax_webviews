'use client';

import { forwardRef, useState, ChangeEvent } from 'react';

// ============= Year of Birth Input Component =============
// For Year of Birth - numeric, exactly 4 digits (e.g., 1990)

interface YearOfBirthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const YearOfBirthInput = forwardRef<HTMLInputElement, YearOfBirthInputProps>(
  ({ label, helperText, error, required = true, onChange, onValidationChange, className = '', value, ...props }, ref) => {
    const [internalError, setInternalError] = useState('');

    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const maxYear = currentYear - 10; // Must be at least 10 years old

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Only allow numeric characters
      if (inputValue && !/^\d*$/.test(inputValue)) {
        return; // Ignore non-numeric input
      }

      // Limit to 4 digits
      const truncatedValue = inputValue.slice(0, 4);
      
      // Validate
      let validationError = '';
      if (truncatedValue.length > 0 && truncatedValue.length < 4) {
        validationError = 'Enter a 4-digit year';
      } else if (truncatedValue.length === 4) {
        const year = parseInt(truncatedValue, 10);
        if (year < minYear) {
          validationError = `Year must be ${minYear} or later`;
        } else if (year > maxYear) {
          validationError = `Year must be ${maxYear} or earlier`;
        }
      }
      
      setInternalError(validationError);
      onValidationChange?.(!validationError && truncatedValue.length === 4);
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
          maxLength={4}
          value={value}
          onChange={handleChange}
          placeholder="e.g., 1990"
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

YearOfBirthInput.displayName = 'YearOfBirthInput';


export const isValidYearOfBirth = (year: string): boolean => {
  if (!year || year.length !== 4) return false;
  const yearNum = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  return yearNum >= 1900 && yearNum <= currentYear - 10;
};



// Reusable Date Input Component (uses native date picker, outputs DD/MM/YYYY format)
interface DateInputProps {
  value: string; // DD/MM/YYYY format
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

export const DateInput = ({ 
  value, 
  onChange, 
  label, 
  required = false, 
  error, 
  minDate, 
  maxDate,
}: DateInputProps) => {
  
  // Convert DD/MM/YYYY to YYYY-MM-DD for native input
  const toNativeFormat = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Convert YYYY-MM-DD to DD/MM/YYYY for output
  const toDisplayFormat = (yyyymmdd: string): string => {
    if (!yyyymmdd) return '';
    const [year, month, day] = yyyymmdd.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nativeValue = e.target.value;
    if (nativeValue) {
      onChange(toDisplayFormat(nativeValue));
    } else {
      onChange('');
    }
  };

  // Validate date is within min/max range
  const validateDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateStr.match(datePattern);
    
    if (!match) return null;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month < 1 || month > 12) return 'Invalid month';
    if (day < 1 || day > 31) return 'Invalid day';
    
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime()) || date.getDate() !== day) return 'Invalid date';
    
    if (minDate) {
      const minDateNormalized = new Date(minDate);
      minDateNormalized.setHours(0, 0, 0, 0);
      if (date < minDateNormalized) {
        return `Date must be on or after ${minDateNormalized.toLocaleDateString('en-GB')}`;
      }
    }
    
    if (maxDate) {
      const maxDateNormalized = new Date(maxDate);
      maxDateNormalized.setHours(0, 0, 0, 0);
      if (date > maxDateNormalized) {
        return `Date must be on or before ${maxDateNormalized.toLocaleDateString('en-GB')}`;
      }
    }
    
    return null;
  };

  const dateError = validateDate(value);
  const displayError = error || dateError;
  
  // Convert min/max dates to native format (set to start of day for proper comparison)
  const getDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const minValue = minDate ? getDateString(minDate) : undefined;
  const maxValue = maxDate ? getDateString(maxDate) : undefined;

  return (
    <div>
      <label className="block text-xs font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="date"
        value={toNativeFormat(value)}
        onChange={handleChange}
        min={minValue}
        max={maxValue}
        className={`w-full px-3 py-2 border rounded-md ${
          displayError ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      {displayError && <p className="text-red-500 text-xs mt-1">{displayError}</p>}
    </div>
  );
};
