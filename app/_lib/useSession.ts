'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getUserSession, isSessionValid, refreshSession, clearUserSession, getKnownPhone } from './session-store';

// Pages that don't require authentication check
// NOTE: /pin-registration and /nil-mri-tot are NOT here because we want to intercept them 
// and redirect to their specific OTP pages if no session exists.
const isPathPublic = (pathname: string | null) => {
  if (!pathname) return false;
  
  // Only etims paths require authentication, but some etims subpaths are public
  if (pathname.startsWith('/etims') && 
      !pathname.startsWith('/etims/auth') && 
      !pathname.startsWith('/etims/help')
      
  ) {
    return false;
  }

  if (pathname.startsWith('/payroll')) return false;
  
  
  return true;
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

      // Context-Aware Redirection - All redirect to shared OTP page
      // Build the redirect URL with the current path as redirect target
      const redirectParam = pathname ? `redirect=${encodeURIComponent(pathname)}` : '';
      const phoneParam = msisdn ? `phone=${encodeURIComponent(msisdn)}` : '';
      const queryParts = [redirectParam, phoneParam].filter(Boolean);
      const otpQuery = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      
      router.push(`/otp${otpQuery}`);
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
