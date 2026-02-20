'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { ResultActions } from '../../../_components/ResultActions';
import { Loader2, CheckCircle, User, MapPin, IdCard } from 'lucide-react';
import { analytics } from '@/app/_lib/analytics';

interface StationResult {
  taxpayerName: string;
  pin: string;
  station: string;
}

function KnowYourStationResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  
  const [result, setResult] = useState<StationResult | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('knowYourStationResult');
    if (storedResult) {
      setResult(JSON.parse(storedResult));
      if (phone) analytics.setUserId(phone);
      analytics.track('know_your_station_completed', { success: true }, { journey_end: true });
    } else {
      router.push('/checkers/know-your-station');
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    );
  }

  return (
    <Layout title="Your Station" onBack={() => router.push('/checkers/know-your-station')}>
      <div className="space-y-4">
        <div className="bg-teal-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Station Found</h1>
              <p className="text-teal-100 text-xs">Your KRA station information</p>
            </div>
          </div>
        </div>

        {/* Station Highlight */}
        <Card className="bg-teal-50 border-teal-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-teal-600">Your Assigned Station</p>
              <p className="text-lg font-bold text-teal-800">{result.station}</p>
            </div>
          </div>
        </Card>

        {/* Taxpayer Details */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Taxpayer Details</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <IdCard className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">PIN</p>
                <p className="text-sm font-medium text-gray-900">{result.pin}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Taxpayer's Name</p>
                <p className="text-sm font-medium text-gray-900">{result.taxpayerName}</p>
              </div>
            </div>
          </div>
        </Card>

        <Button 
            variant="secondary"
            onClick={() => router.push('/checkers/know-your-station')}
            className="w-full"
          >
            Search Again
          </Button>

          <ResultActions phone={phone} journey="Know Your Station" />
      </div>
    </Layout>
  );
}

export default function KnowYourStationResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <KnowYourStationResultContent />
    </Suspense>
  );
}
