'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { Loader2, CheckCircle, User, IdCard, MapPin, Building, Activity } from 'lucide-react';

interface StaffResult {
  otherNames: string;
  surname: string;
  idNumber: string;
  regionName: string;
  deptName: string;
  status: string;
}

function StaffResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  
  const [result, setResult] = useState<StaffResult | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('staffCheckerResult');
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    } else {
      router.push('/checkers/staff-checker');
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
    <Layout title="Staff Verification Result" onBack={() => router.push('/checkers/staff-checker')}>
      <div className="space-y-4">
        <div className="bg-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Staff ID Valid</h1>
              <p className="text-green-100 text-xs">Staff verification successful</p>
            </div>
          </div>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Staff Details</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Staff Name</p>
                <p className="text-sm font-medium text-gray-900">{result.otherNames}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Last Name</p>
                <p className="text-sm font-medium text-gray-900">{result.surname}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <IdCard className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Staff National ID</p>
                <p className="text-sm font-medium text-gray-900">{result.idNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Region</p>
                <p className="text-sm font-medium text-gray-900">{result.regionName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm font-medium text-gray-900">{result.deptName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium text-gray-900">{result.status}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="secondary"
            onClick={() => router.push('/checkers/staff-checker')}
          >
            Check Another
          </Button>
          <Button 
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function StaffResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" /></div>}>
      <StaffResultContent />
    </Suspense>
  );
}
