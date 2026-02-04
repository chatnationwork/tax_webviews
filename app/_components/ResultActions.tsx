'use client';

import { useRouter } from 'next/navigation';
import { Button } from './Layout';
import { WhatsAppButton } from './QuickMenu';
import { MessageSquare, Home } from 'lucide-react';
import { getKnownPhone } from '../_lib/session-store';

interface ResultActionsProps {
  phone?: string; // Optional: can be passed or retrieved from session
  journey?: string; // Optional: identifies the journey for CSAT tracking
}

export function ResultActions({ phone, journey }: ResultActionsProps) {
  const router = useRouter();

  const handleHome = () => {
    const phoneToUse = phone || getKnownPhone();
    router.push(phoneToUse ? `/?phone=${encodeURIComponent(phoneToUse)}` : '/');
  };

  return (
    <div className="space-y-3 pt-6 border-t border-gray-100 mt-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center mb-2">
        What would you like to do next?
      </h3>

      {/* Submit Feedback */}
      <Button 
        variant="secondary" 
        onClick={() => {
          const phoneToUse = phone || getKnownPhone();
          const params = new URLSearchParams();
          if (phoneToUse) params.set('phone', phoneToUse);
          if (journey) params.set('journey', journey);
          const queryString = params.toString();
          router.push(`/csat${queryString ? `?${queryString}` : ''}`);
        }}
        className="!bg-purple-50 !text-purple-700 hover:!bg-purple-100 !border-purple-200"
      >
        <div className="flex items-center justify-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Give Feedback
        </div>
      </Button>

      <div className="grid grid-cols-2 gap-3">
        {/* Return Home */}
        <Button 
          variant="secondary" 
          onClick={handleHome}
        >
          <div className="flex items-center justify-center gap-2">
             <Home className="w-4 h-4" />
             Home
          </div>
        </Button>

        {/* WhatsApp Button */}
        <WhatsAppButton label="Go to WhatsApp" />
      </div>
    </div>
  );
}
