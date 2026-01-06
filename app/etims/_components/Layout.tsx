'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu, Home, LogOut, Headphones } from 'lucide-react';
import { useSessionManager } from '../_lib/useSession';
import { clearUserSession, getKnownPhone } from '../_lib/store';

interface LayoutProps {
  children: ReactNode;
  title: string;
  step?: string;
  onBack?: () => void;
  showMenu?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}



export function Layout({ children, title, step, onBack, showMenu = false, showHeader = true, showFooter = true }: LayoutProps) {
  const router = useRouter();
    const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
   setPhone(getKnownPhone());
  }, []);
  
  // Session management - auto-refresh and timeout handling
  useSessionManager();

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  const handleMenuClick = () => {
    const action = window.confirm('Menu:\n1. Go to Main Menu\n2. Log Out\n\nClick OK for Main Menu, Cancel to close');
    if (action) {
      router.push('/etims');
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      // Get msisdn before clearing so user can easily re-login
      const session = typeof window !== 'undefined' ? sessionStorage.getItem('etims_user_session') : null;
      const msisdn = (session ? JSON.parse(session)?.msisdn : null) || phone;
      
      clearUserSession();
      sessionStorage.clear();
      
     
     
      const message = encodeURIComponent('Main menu');
      // Open WhatsApp with pre-filled message
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
  };

  const handleConnectAgent = () => {
    // WhatsApp number for eTIMS support (without + symbol)
    const message = encodeURIComponent('Connect to agent');
    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleMainMenu = () => {
    //  window.location.href = `https://webviewmenu.vercel.app?phone=${phone}`;
    const message = encodeURIComponent('Main menu');
      // Open WhatsApp with pre-filled message
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - KRA Dark Theme */}
      {showHeader && (
        <div className="bg-[var(--kra-black)] text-white sticky top-0 z-10 shadow-md">
          <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-base font-medium">{title}</h1>
                {step && <p className="text-xs text-gray-400">{step}</p>}
              </div>
            </div>
            {showMenu && (
              <button
                onClick={handleMenuClick}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content - Compact padding */}
      <div className="flex-1 max-w-4xl mx-auto px-3 py-3 w-full">
        {children}
      </div>

      {/* Footer Navigation */}
      {showFooter && (
        <div className="bg-white border-t border-gray-200 sticky bottom-0 z-10">
          <div className="max-w-4xl mx-auto px-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={handleMainMenu}
                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-[10px]"
              >
                <Home className="w-4 h-4" />
                Main Menu
              </button>
              <button 
                onClick={handleConnectAgent}
                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium text-[10px]"
              >
                <Headphones className="w-4 h-4" />
                Connect Agent
              </button>
              <button 
                onClick={handleLogout}
                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-700 font-medium text-[10px]"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 ${className}`}>
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
  const baseStyles = 'w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[var(--kra-red)] text-white hover:bg-[var(--kra-red-dark)]',
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
  step,
  min,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1 font-medium">
        {label} {required ? <span className="text-[var(--kra-red)]">*</span> : <span className="text-gray-400">(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        step={step}
        min={min}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--kra-red)] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
      <label className="block text-xs text-gray-600 mb-1 font-medium">
        {label} {required && <span className="text-[var(--kra-red)]">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--kra-red)] focus:border-transparent"
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
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">VAT (16%)</span>
            <span className="text-gray-900">{formatCurrency(tax)}</span>
          </div>
        )}
        <div className="border-t pt-1 flex justify-between font-medium text-sm">
          <span className="text-gray-900">Total</span>
          <span className="text-[var(--kra-red)]">{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  );
}

export function IdentityStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-[var(--kra-red)] text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}
