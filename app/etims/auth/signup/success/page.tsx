'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../../../_components/Layout';
import { CheckCircle } from 'lucide-react';
import { sendWhatsAppMessage } from '../../../../actions/etims';
import { getUserSession } from '../../../_lib/store';

function SignupSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '';
  const phone = searchParams.get('phone') || '';
  const pin = searchParams.get('pin') || '';
  const [messageSent, setMessageSent] = useState(false);

  // Send WhatsApp notification on mount
  useEffect(() => {
    const sendNotification = async () => {
      try {
        const session = getUserSession();
        const userPhone = phone || session?.msisdn;
        const userName = name || session?.name || 'User';
        
        if (userPhone && !messageSent) {
          const message = `*Registration Successful!*\n\nHello ${userName},\n\nYour eTIMS account has been created successfully. You can now access eTIMS services to create invoices, credit notes, and manage your tax compliance.\n\n_Kenya Revenue Authority_`;
          
          const result = await sendWhatsAppMessage({
            recipientPhone: userPhone,
            message: message
          });
          
          if (result.success) {
            console.log('Signup success message sent:', result.messageId);
            setMessageSent(true);
          } else {
            console.error('Failed to send message:', result.error);
          }
        }
      } catch (error) {
        console.error('Failed to send WhatsApp notification:', error);
      }
    };

    sendNotification();
  }, [phone, name, messageSent]);

  const handleLogin = () => {
    const params = new URLSearchParams();
    if (phone) params.set('number', phone);
    if (name) params.set('name', name);
    if (pin) params.set('pin', pin);
    
    router.push(`/etims/auth/login?${params.toString()}`);
  };

  return (
    <Layout title="Registration Complete" showHeader={false} showFooter={false}>
      <div className="min-h-[80vh] flex flex-col justify-center space-y-4">
        {/* Success Card */}
        <Card className="bg-green-50 border-green-200 text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-green-900 text-xl font-semibold mb-2">Registration Successful!</h2>
              {name && (
                <p className="text-sm text-green-700 mb-2">
                  Welcome, <span className="font-medium">{name}</span>
                </p>
              )}
              <p className="text-sm text-green-600">
                Your eTIMS account has been created. Please login to continue.
              </p>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-800">
            A confirmation message has been sent to your WhatsApp. You can now login to access eTIMS services.
          </p>
        </Card>

        {/* Login Button */}
        <Button onClick={handleLogin}>
          Login
        </Button>
      </div>
    </Layout>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SignupSuccessContent />
    </Suspense>
  );
}
