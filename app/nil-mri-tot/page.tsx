'use client';

import { Suspense } from 'react';
import { Home } from './_components/Home';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading Tax Filing Portal...</div>
    </div>
  );
}

export default function NilMriTotPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Home />
    </Suspense>
  );
}
