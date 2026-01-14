'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Layout, Card, Button } from '@/app/_components/Layout';
import { getServiceConfig } from '@/app/_lib/services-config';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const serviceKey = searchParams.get('service') || '';
  const phone = searchParams.get('phone') || '';
  
  const serviceConfig = getServiceConfig(serviceKey);

  const handleContinue = () => {
    if (serviceConfig) {
      const url = `${serviceConfig.targetUrl}?phone=${encodeURIComponent(phone)}`;
      router.push(url);
    }
  };

  const handleGoBack = () => {
    router.push(`/?phone=${encodeURIComponent(phone)}`);
  };

  // Service not found
  if (!serviceConfig) {
    return (
      <Layout title="Service Not Found" showHeader={false}>
        <div className="space-y-6">
          <Card className="bg-red-50 border-red-200 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-900 mb-2">Service Not Found</h2>
            <p className="text-sm text-red-700">
              The requested service "{serviceKey}" could not be found.
            </p>
          </Card>
          
          <Button onClick={handleGoBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Menu
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Confirm Service" showHeader={false}>
      <div className="space-y-6">
        {/* KRA Logo */}
        <div className="flex justify-center pt-4">
          <img 
            src="/kra_logo.png" 
            alt="KRA Logo" 
            className="h-16 w-auto"
          />
        </div>

        {/* Service Info Card */}
        <Card className="bg-white border-gray-200 p-6">
          <div className="text-center space-y-4">
            {/* Service Badge */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--kra-red)]/10 rounded-full mx-auto">
              <span className="text-2xl font-bold text-[var(--kra-red)]">
                {serviceConfig.name.charAt(0)}
              </span>
            </div>
            
            {/* Service Name */}
            <h1 className="text-xl font-bold text-gray-900">
              {serviceConfig.name}
            </h1>
            
            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed">
              {serviceConfig.description}
            </p>
          </div>
        </Card>

      

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleContinue}
            className="w-full bg-[var(--kra-red)] hover:bg-red-700 flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <button
            onClick={handleGoBack}
            className="w-full py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--kra-red)] border-t-transparent rounded-full"></div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
