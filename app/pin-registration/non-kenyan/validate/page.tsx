'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, MaskedDataCard } from '../../../_components/Layout';
import { getRegistrationData, getFormattedPhoneNumber, maskIdNumber } from '../../_lib/store';
import { Edit } from 'lucide-react';

export default function NonKenyanValidatedDetails() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const regData = getRegistrationData();
    if (!regData || regData.type !== 'non-kenyan') {
      router.push('/pin-registration/non-kenyan/identity');
      return;
    }
    setData(regData);
  }, [router]);

  if (!mounted || !data) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  }

  const maskedId = data.alienId 
    ? `${data.alienId.slice(0, 3)}****${data.alienId.slice(-2)}`
    : 'A12****45';
  const phoneNumber = getFormattedPhoneNumber() || '+254 712 345 678';

  const displayData = {
    alienId: maskedId,
    gender: 'Female', // Mock - would come from API
    dateOfBirth: '22nd June, 1988', // Mock
    email: data.email || 'user@example.com',
    phoneNumber: phoneNumber,
  };

  return (
    <Layout title="Confirm Your Details" onBack={() => router.back()}>
      <p className="text-gray-600 mb-6">
        Please verify that the information below is correct
      </p>

      <div className="space-y-3 mb-8">
        <MaskedDataCard label="Alien ID Number" value={displayData.alienId} />
        <MaskedDataCard label="Gender" value={displayData.gender} />
        <MaskedDataCard label="Date of Birth" value={displayData.dateOfBirth} />
        <MaskedDataCard label="Email Address" value={displayData.email} />
        <MaskedDataCard label="Phone Number" value={displayData.phoneNumber} />
      </div>

      <div className="space-y-3">
        <Button onClick={() => router.push('/pin-registration/non-kenyan/declaration')}>
          ✅ Confirm Details
        </Button>

        <Button 
          variant="secondary" 
          onClick={() => router.push('/pin-registration/non-kenyan/identity')}
        >
          <div className="flex items-center justify-center gap-2">
            <Edit className="w-4 h-4" />
            Edit Information
          </div>
        </Button>
      </div>
    </Layout>
  );
}
