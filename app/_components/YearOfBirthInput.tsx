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
