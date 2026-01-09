'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  IdCard, 
  FileText, 
  Shield, 
  UserCheck, 
  MapPin, 
  FileCheck,
  Phone, 
  AlertCircle 
} from 'lucide-react';
import { taxpayerStore } from './_lib/store';


const services = [
  {
    name: 'PIN Checker',
    description: 'Verify KRA PIN validity and get taxpayer details',
    href: '/checkers/pin-checker',
    icon: IdCard,
    color: 'blue',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-400',
    groupHoverBg: 'group-hover:bg-blue-500',
  },
  {
    name: 'Invoice Checker',
    description: 'Verify eTIMS invoice number validity',
    href: '/checkers/invoice-checker',
    icon: FileText,
    color: 'purple',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    hoverBorder: 'hover:border-purple-400',
    groupHoverBg: 'group-hover:bg-purple-500',
  },
  {
    name: 'TCC Checker',
    description: 'Validate Tax Compliance Certificate',
    href: '/checkers/tcc-checker',
    icon: Shield,
    color: 'green',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    hoverBorder: 'hover:border-green-400',
    groupHoverBg: 'group-hover:bg-green-500',
  },
  {
    name: 'Staff Checker',
    description: 'Verify KRA staff by National ID',
    href: '/checkers/staff-checker',
    icon: UserCheck,
    color: 'orange',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    hoverBorder: 'hover:border-orange-400',
    groupHoverBg: 'group-hover:bg-orange-500',
  },
  {
    name: 'Know Your Station',
    description: 'Find your assigned KRA station',
    href: '/checkers/know-your-station',
    icon: MapPin,
    color: 'teal',
    bgColor: 'bg-teal-100',
    iconColor: 'text-teal-600',
    hoverBorder: 'hover:border-teal-400',
    groupHoverBg: 'group-hover:bg-teal-500',
  },
  {
    name: 'Import Certificate',
    description: 'Verify import certificate validity',
    href: '/checkers/import-certificate',
    icon: FileCheck,
    color: 'indigo',
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    hoverBorder: 'hover:border-indigo-400',
    groupHoverBg: 'group-hover:bg-indigo-500',
  },
];

export function Home() {
  const searchParams = useSearchParams();
  const [msisdn, setMsisdn] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Extract msisdn from URL query parameter
    const phoneNumber = searchParams.get('msisdn') || searchParams.get('phone') || '';
    if (phoneNumber) {
      taxpayerStore.setMsisdn(phoneNumber);
      setMsisdn(phoneNumber);
      // Also save to localStorage for persistence
      try {
        localStorage.setItem('phone_Number', phoneNumber);
      } catch (e) {
        console.error('Failed to save phone to localStorage', e);
      }
    } else {
      // Check if already stored in store or localStorage
      const storedMsisdn = taxpayerStore.getMsisdn();
      if (storedMsisdn) {
        setMsisdn(storedMsisdn);
      } else {
        try {
          const localPhone = localStorage.getItem('phone_Number');
          if (localPhone) {
            setMsisdn(localPhone);
            taxpayerStore.setMsisdn(localPhone);
          }
        } catch (e) {
          console.error('Failed to get phone from localStorage', e);
        }
      }
    }
    setMounted(true);
  }, [searchParams]);

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return '';
    // Format as 254 XXX XXX XXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 12) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  // Build href with phone number
  const getServiceHref = (baseHref: string) => {
    if (msisdn) {
      return `${baseHref}?phone=${encodeURIComponent(msisdn)}`;
    }
    return baseHref;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-blue-900 text-3xl font-bold mb-2">Kenya Revenue Authority</h1>
          <p className="text-gray-600">Verification Services Portal</p>
        </div>

        {/* Phone Number Display */}
        {msisdn && (
          <div className="mb-8 p-4 bg-white rounded-xl shadow-md flex items-center justify-center gap-3">
            <Phone className="w-5 h-5 text-green-600" />
            <span className="text-gray-600">WhatsApp Session:</span>
            <span className="text-gray-900 font-medium">{formatPhoneDisplay(msisdn)}</span>
          </div>
        )}

        {!msisdn && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800">No phone number provided. Add ?msisdn=254XXXXXXXXX to the URL for WhatsApp notifications.</span>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.name}
                href={getServiceHref(service.href)}
                className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-100 ${service.hoverBorder} group`}
              >
                <div className={`w-14 h-14 ${service.bgColor} rounded-full flex items-center justify-center mb-4 ${service.groupHoverBg} transition-colors`}>
                  <Icon className={`w-7 h-7 ${service.iconColor} group-hover:text-white transition-colors`} />
                </div>
                <h2 className="text-gray-900 text-lg font-bold mb-2">{service.name}</h2>
                <p className="text-gray-500 text-sm">{service.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm">
            Powered by <span className="text-[var(--kra-red)] font-medium">KRA</span>
          </p>
        </div>
      </div>
    </div>
  );
}


function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading Tax Filing Portal...</div>
    </div>
  );
}

export default function NilMriTotPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Home />
    </Suspense>
  );
}
