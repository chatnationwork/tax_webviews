'use client';

import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

export default function MobileGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      // Check for environment override
      if (process.env.NEXT_PUBLIC_ALLOW_DESKTOP_TESTING === 'true') {
        setIsMobile(true);
        return;
      }

      // Check user agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      // Check screen width (e.g. < 768px typically tablet/mobile)
      // We accept either a mobile UA OR a small screen (so devs can test by resizing)
      const isSmallScreen = window.innerWidth <= 1024; // Accommodate larger tablets or allow explicit resizing

      // Strict mode: requires mobile UA or very small screen?
      // User asked "only mobile phones".
      // Let's rely primarily on UA for "Not Computer" but fallback to width for edge cases?
      // Actually, simplest and most robust for "No Computers" is usually checking for 'mobile' in UA or touch points, 
      // but simple screen width is often enough for "responsive" restriction.
      // However, "Not open on computers" usually implies a hard block on standard desktop browsers.
      
      // Let's use a combination: 
      // If it's a desktop browser (no mobile UA) and width > 768, Block it.
      // If width < 768, allow it (simulated mobile).
      
      setIsMobile(isMobileUA || window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Avoid flash of content by rendering nothing until check is done, 
  // or just render children initially (SSR) and then hide? 
  // Rendering nothing initially is safer for "blocking".
  if (isMobile === null) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
          <Smartphone className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Mobile Device Required</h1>
        <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
          This application is designed specifically for mobile phones. 
          <br />
          Please open this link on your smartphone to continue.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
