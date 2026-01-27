'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, MaskedDataCard, Card } from '../../../_components/Layout';
import { getRegistrationData, getFormattedPhoneNumber, maskIdNumber, getPhoneNumber } from '../../_lib/store';
import { sendWhatsAppMessage, getStoredPhone } from '../../../actions/pin-registration';
import { Edit, Loader2 } from 'lucide-react';

export default function NonKenyanValidatedDetails() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [validatedData, setValidatedData] = useState<any>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    setMounted(true);
    const regData = getRegistrationData();
    if (!regData || regData.type !== 'non-kenyan') {
      router.push('/pin-registration/non-kenyan/identity');
      return;
    }
    setData(regData);

    // Get validated data from API
    const validated = sessionStorage.getItem('pin_validated_data');
    if (validated) {
      setValidatedData(JSON.parse(validated));
    }
  }, [router]);

  // Send notification message when page loads
  useEffect(() => {
    const sendNotification = async () => {
      if (!mounted || !data || messageSent) return;
      
      setSendingMessage(true);
      try {
        const phone = await getStoredPhone() || getPhoneNumber();
        if (!phone) return;

        const hasPin = validatedData?.pin;
        const name = validatedData?.name || 'User';
        
        let message: string;
        if (hasPin) {
          message = `*KRA PIN Registration Status*

Dear *${name}*,

Our records indicate that you *already have a KRA PIN* registered.

 Your existing PIN: *${validatedData.pin}*

No new registration is required. If you need to update your details, please visit the KRA iTax portal or contact KRA support.`;
        } else {
          message = `*KRA PIN Registration*

Dear *${name || 'Applicant'}*,

Your identity has been verified successfully. You are eligible to apply for a new KRA PIN.

Please proceed with the registration on the web portal to complete your application.

📋 Alien ID: ${data.alienId ? maskIdNumber(data.alienId) : 'Verified'}
📧 Email: ${data.email}

Complete your registration to receive your PIN certificate.`;
        }

        await sendWhatsAppMessage({
          recipientPhone: phone,
          message: message
        });
        
        setMessageSent(true);
      } catch (error) {
        console.error('Failed to send notification:', error);
      } finally {
        setSendingMessage(false);
      }
    };

    sendNotification();
  }, [mounted, data, validatedData, messageSent]);

  if (!mounted || !data) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  }

  const maskedId = data.alienId 
    ? `${data.alienId.slice(0, 3)}****${data.alienId.slice(-2)}`
    : 'A12****45';
  const phoneNumber = getFormattedPhoneNumber() || '+254 712 345 678';

  const displayData = {
    alienId: maskedId,
    name: validatedData?.name || validatedData?.firstName || 'Verified Applicant',
    yearOfBirth: validatedData?.yob || data.yearOfBirth || '',
    phoneNumber: phoneNumber,
    existingPin: validatedData?.pin || null,
  };

  const handleClose = () => {
    router.push('/');
  };

  // If user already has a PIN - show special UI
  if (displayData.existingPin) {
    return (
      <Layout title="PIN Registration" onBack={() => router.back()} showMenu>
        <div className="space-y-6">
         

          {/* User Details */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Your Details</h3>
            <div className="space-y-2">
              <MaskedDataCard label="Name" value={displayData.name} />
              <MaskedDataCard label="Alien ID" value={displayData.alienId} />
            </div>
          </Card>
           {/* Status Card */}
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Already Registered</h2>
            
            <div className="flex items-start gap-3 bg-white/60 p-4 rounded-lg border border-blue-100">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm text-gray-700">
                <p>Our records indicate that you already have a KRA PIN registered.</p>
                <p className="mt-2 font-semibold">Your existing PIN: <span className="font-mono">{displayData.existingPin}</span></p>
              </div>
            </div>
          </Card>

          {sendingMessage && (
            <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending notification...
            </div>
          )}

          {/* Close Button */}
          <Button 
            onClick={handleClose}
            className="w-full bg-[var(--kra-red)] hover:bg-red-700"
          >
            Close
          </Button>
        </div>
      </Layout>
    );
  }

  // User is NOT registered - show registration flow
  return (
    <Layout title="Confirm Your Details" onBack={() => router.back()} showMenu>
      <p className="text-gray-600 mb-6">
        Please verify that the information below is correct
      </p>

      {/* Eligible for Registration Card */}
      <Card className="p-4 bg-green-50 border border-green-200 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
          <div className="text-sm text-green-800">
            <p className="font-semibold">Eligible for PIN Registration</p>
            <p className="mt-1">Your identity has been verified. Proceed to register for your KRA PIN.</p>
          </div>
        </div>
      </Card>

      <div className="space-y-3 mb-8">
        <MaskedDataCard label="Alien ID Number" value={displayData.alienId} />
        <MaskedDataCard label="Year of Birth" value={displayData.yearOfBirth} />
        <MaskedDataCard label="Phone Number" value={displayData.phoneNumber} />
      </div>

      {sendingMessage && (
        <div className="flex items-center justify-center gap-2 text-gray-600 text-sm mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending notification...
        </div>
      )}

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
