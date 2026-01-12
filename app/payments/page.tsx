'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, Briefcase, Receipt } from 'lucide-react';
import { Layout, Card } from '../_components/Layout';
import { taxpayerStore } from './_lib/store';

function PaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msisdn, setMsisdn] = useState('');

  useEffect(() => {
    const phoneNumber = searchParams.get('msisdn') || searchParams.get('phone') || '';
    if (phoneNumber) {
      taxpayerStore.setMsisdn(phoneNumber);
      setMsisdn(phoneNumber);
    } else {
      const storedMsisdn = taxpayerStore.getMsisdn();
      if (storedMsisdn) {
        setMsisdn(storedMsisdn);
      }
    }
  }, [searchParams]);

  const getServiceHref = (baseHref: string) => {
    if (msisdn) {
      return `${baseHref}?phone=${encodeURIComponent(msisdn)}`;
    }
    return baseHref;
  };

  const actionCards = [
    {
      title: 'AHL Payments',
      description: 'Pay Advance Housing Levy contributions',
      icon: Building2,
      color: 'blue' as const,
      onClick: () => router.push(getServiceHref('/payments/ahl/payment')),
    },
    {
      title: 'NITA Payments',
      description: 'Pay NITA levy contributions',
      icon: Briefcase,
      color: 'purple' as const,
      onClick: () => router.push(getServiceHref('/payments/nita/payment')),
    },
    {
      title: 'E-SLIP',
      description: 'Pay using existing PRN number',
      icon: Receipt,
      color: 'amber' as const,
      onClick: () => router.push(getServiceHref('/payments/eslip/payment')),
    },
  ];

  const colorClasses = {
    blue: {
      card: 'bg-blue-50 border-blue-200',
      icon: 'bg-blue-100',
      text: 'text-blue-600',
    },
    purple: {
      card: 'bg-purple-50 border-purple-200',
      icon: 'bg-purple-100',
      text: 'text-purple-600',
    },
    amber: {
      card: 'bg-amber-50 border-amber-200',
      icon: 'bg-amber-100',
      text: 'text-amber-600',
    },
  };

  return (
    <Layout title="Payment Services" onBack={() => router.push('/')}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-14 w-auto" />
        </div>

        {/* Action Cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {actionCards.map((card) => {
            const Icon = card.icon;
            const colors = colorClasses[card.color];

            return (
              <button
                key={card.title}
                onClick={card.onClick}
                className="text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Card className={`h-full ${colors.card} !p-3`}>
                  <div className="flex items-center gap-3 sm:flex-col sm:text-center">
                    <div className={`p-3 rounded-full ${colors.icon} flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-900 font-medium">{card.title}</h3>
                      <p className="text-xs text-gray-500">{card.description}</p>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
      <PaymentsContent />
    </Suspense>
  );
}
