// Shared client-side session management
// Handles storage of user session details and phone number persistence

export interface UserSession {
  msisdn: string;
  name?: string;
  pin?: string;
  lastActive: number; // timestamp
}

// Storage keys
const USER_SESSION_KEY = 'etims_user_session';
const KNOWN_PHONE_KEY = 'etims_known_phone';
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Save known phone number to local storage for persistence across sessions
 */
export const saveKnownPhone = (phone: string) => {
  if (typeof window === 'undefined' || !phone) return;
  localStorage.setItem(KNOWN_PHONE_KEY, phone);
};

/**
 * Get known phone number from local storage
 */
export const getKnownPhone = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KNOWN_PHONE_KEY);
};

/**
 * Save user session data
 */
export const saveUserSession = (data: Omit<UserSession, 'lastActive'>) => {
  if (typeof window === 'undefined') return;
  const session: UserSession = {
    ...data,
    lastActive: Date.now()
  };
  sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  if (data.msisdn) {
    saveKnownPhone(data.msisdn);
  }
};

/**
 * Refresh session timestamp
 */
export const refreshSession = () => {
  if (typeof window === 'undefined') return;
  const session = getUserSession();
  if (session) {
    session.lastActive = Date.now();
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  }
};

/**
 * Get current user session
 */
export const getUserSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const data = sessionStorage.getItem(USER_SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

/**
 * Check if session is valid (exists and not expired)
 */
export const isSessionValid = (): boolean => {
  const session = getUserSession();
  if (!session) return false;
  
  const elapsed = Date.now() - session.lastActive;
  return elapsed < SESSION_TIMEOUT_MS;
};

/**
 * Clear user session (but keeps known phone in local storage)
 */
export const clearUserSession = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(USER_SESSION_KEY);
};
