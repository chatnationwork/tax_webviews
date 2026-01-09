'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getUserSession, isSessionValid, refreshSession, clearUserSession, getKnownPhone } from './session-store';

// Pages that don't require authentication check
// NOTE: /pin-registration and /nil-mri-tot are NOT here because we want to intercept them 
// and redirect to their specific OTP pages if no session exists.
const PUBLIC_PATHS = [
    '*/auth', 
    '*/auth/login', 
    '*/auth/signup', 
    '*/auth/otp',
    '*/otp',
    '/',
    // We do NOT include '*/pin-registration' here so checkSession runs and handles redirection
];

const isPathPublic = (pathname: string | null) => {
  if (!pathname) return false;
  
  return PUBLIC_PATHS.some(pattern => {
    // Escape special regex chars except *
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') 
      .replace(/\*/g, '.*');
      
    // Use strict start and end anchors
    return new RegExp(`^${regexPattern}$`).test(pathname);
  });
};

export function useSessionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkSession = useCallback(() => {
    // Skip check for public pages
    if (isPathPublic(pathname)) {
      return true;
    }

    // Check if session exists and is valid
    if (!isSessionValid()) {
      // Get msisdn before clearing session so user can easily re-login
      const session = getUserSession();
      const msisdn = session?.msisdn || getKnownPhone();
      clearUserSession();
      
      const currentQuery = searchParams.toString();
      const queryPrefix = currentQuery ? `?${currentQuery}` : '';
      
      // If we don't have phone in query but have it in storage, append it
      let finalQuery = queryPrefix;
      if (!searchParams.get('phone') && !searchParams.get('number') && !searchParams.get('msisdn') && msisdn) {
         finalQuery = queryPrefix ? `${queryPrefix}&number=${msisdn}` : `?number=${msisdn}`;
      }

      // Context-Aware Redirection
      if (pathname?.startsWith('/pin-registration')) {
         // Redirect to PIN Registration OTP
         router.push(`/pin-registration/otp${finalQuery}`);
      } else if (pathname?.startsWith('/nil-mri-tot')) {
          // Redirect to NIL/MRI/TOT OTP
          router.push(`/nil-mri-tot/otp${finalQuery}`);
      } else if (pathname?.startsWith('/payments')) {
          // Redirect to Payments OTP
          router.push(`/payments/otp${finalQuery}`); 
      } else if (pathname?.startsWith('/checkers')) {
          // Redirect to Checkers OTP
          router.push(`/checkers/otp${finalQuery}`); 
      } else if (pathname?.startsWith('/tcc')) {
          // Redirect to TCC OTP
          router.push(`/tcc/otp${finalQuery}`); 
      } else {
          // Default eTIMS Auth
          router.push(`/etims/auth${finalQuery}`);
      }
      return false;
    }

    return true;
  }, [pathname, router, searchParams]);

  useEffect(() => {
    // Skip for public pages
    if (isPathPublic(pathname)) {
      return;
    }

    // Initial session check
    checkSession();

    // Refresh session while user is active on the page
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    }, 60 * 1000); // Refresh every minute while active

    // Handle visibility change - check session when returning to page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!checkSession()) {
          return; // Session expired, already redirecting
        }
        refreshSession(); // Session still valid, refresh it
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check session periodically (every 30 seconds)
    const checkInterval = setInterval(() => {
      checkSession();
    }, 30 * 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, checkSession]);

  return { checkSession };
}
