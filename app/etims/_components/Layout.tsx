'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title: string;
  step?: string;
  onBack?: () => void;
  showMenu?: boolean;
}

export function Layout({ children, title, step, onBack, showMenu = true }: LayoutProps) {
  const router = useRouter();

  const handleMenuClick = () => {
    const action = window.confirm('Menu:\n1. Go to Main Menu\n2. Log Out\n\nClick OK for Main Menu, Cancel to close');
    if (action) {
      router.push('/etims');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-medium">{title}</h1>
              {step && <p className="text-sm text-blue-100">{step}</p>}
            </div>
          </div>
          {showMenu && (
            <button
              onClick={handleMenuClick}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
}: { 
  children: ReactNode; 
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const baseStyles = 'w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-2 font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-2 font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TotalsCard({ subtotal, tax, total }: { subtotal: number; tax: number; total: number }) {
  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;
  
  return (
    <Card className="bg-gray-50">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">VAT (16%)</span>
          <span className="text-gray-900">{formatCurrency(tax)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-medium">
          <span className="text-gray-900">Total</span>
          <span className="text-blue-600 text-lg">{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  );
}

export function IdentityStrip({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-blue-600 font-medium">{value}</span>
      </div>
    </Card>
  );
}
