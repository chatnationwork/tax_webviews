'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, MaskedDataCard } from '../../../_components/Layout';
import { getRegistrationData, getFormattedPhoneNumber, maskIdNumber } from '../../_lib/store';
import { Edit } from 'lucide-react';

export default function KenyanValidatedDetails() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [validatedData, setValidatedData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const regData = getRegistrationData();
    if (!regData || regData.type !== 'kenyan') {
      router.push('/pin-registration/kenyan/identity');
      return;
    }
    setData(regData);
    
    // Get validated data from API
    const validated = sessionStorage.getItem('pin_validated_data');
    if (validated) {
      setValidatedData(JSON.parse(validated));
    }
  }, [router]);

  if (!mounted || !data) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  }

  const maskedId = maskIdNumber(data.nationalId || '12345678');
  const phoneNumber = getFormattedPhoneNumber() || '+254 712 345 678';

  // Use validated data if available
  const displayData = {
    idNumber: maskedId,
    name: validatedData?.name || 'Verified Taxpayer',
    gender: 'Male', // Would come from API if available
    dateOfBirth: data.yearOfBirth ? `Year: ${data.yearOfBirth}` : '15th March, 1990',
    email: data.email || 'user@example.com',
    phoneNumber: phoneNumber,
    existingPin: validatedData?.pin || null,
  };

  return (
    <Layout title="Confirm Your Details" onBack={() => router.back()}>
      <p className="text-gray-600 mb-6">
        Please verify that the information below is correct
      </p>

      {displayData.existingPin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-900">
            <strong>Note:</strong> You already have a KRA PIN: <span className="font-mono">{maskIdNumber(displayData.existingPin)}</span>
          </p>
        </div>
      )}

      <div className="space-y-3 mb-8">
        <MaskedDataCard label="Name" value={displayData.name} />
        <MaskedDataCard label="ID Number" value={displayData.idNumber} />
        <MaskedDataCard label="Date of Birth" value={displayData.dateOfBirth} />
        <MaskedDataCard label="Email Address" value={displayData.email} />
        <MaskedDataCard label="Phone Number" value={displayData.phoneNumber} />
      </div>

      <div className="space-y-3">
        <Button 
          onClick={() => router.push('/pin-registration/kenyan/declaration')}
          disabled={!!displayData.existingPin}
          className={displayData.existingPin ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {displayData.existingPin ? '⛔ PIN Already Exists' : '✅ Confirm Details'}
        </Button>

        <Button 
          variant="secondary" 
          onClick={() => router.push('/pin-registration/kenyan/identity')}
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
