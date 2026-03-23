import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import DisclaimerClient from './DisclaimerClient';

export default function ItrDisclaimerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
        </div>
      }
    >
      <DisclaimerClient />
    </Suspense>
  );
}
