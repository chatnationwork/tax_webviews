'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileCheck } from 'lucide-react';
import { Layout, Button, Card } from '../_components/Layout';
import { taxpayerStore } from './_lib/store';

function TccContent() {
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

  const handleApply = () => {
    if (msisdn) {
      router.push(`/tcc/validation?phone=${encodeURIComponent(msisdn)}`);
    } else {
      router.push('/tcc/validation');
    }
  };

  return (
    <Layout title="TCC Application" showMenu={false} onBack={() => router.push('/')}>
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/kra_logo.png" alt="KRA Logo" className="h-14 w-auto" />
        </div>

        {/* Main Card */}
        <Card className="bg-green-50 border-green-200 !p-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-green-100 mb-4">
              <FileCheck className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Tax Compliance Certificate</h2>
            <p className="text-sm text-gray-600 mb-6">
              Apply for a TCC for job applications, government tenders, work permits, and more.
            </p>
            
            <Button onClick={handleApply} className="w-full">
              Apply Now
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default function TccPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
      <TccContent />
    </Suspense>
  );
}
