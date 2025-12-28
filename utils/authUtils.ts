
/**
 * Utility to handle authentication tokens for SparkX backend.
 */
export const getAuthToken = (): string | null => {
  // 1. Try to get from cookie (standard Scui pattern)
  const name = "TOKEN";
  const arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
  if (arr != null) {
    return unescape(arr[2]);
  }

  // 2. Fallback to localStorage
  try {
    const stored = localStorage.getItem('token');
    if (stored) return stored;
  } catch (e) {
    // Ignore
  }

  return null;
};

/**
 * Builds the Authorization header for SparkX API requests.
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  return {};
};

/**
 * Persists the authentication token.
 */
export const setAuthToken = (token: string): void => {
  // 1. Set to cookie
  document.cookie = `TOKEN=${token}; path=/; max-age=31536000`; // 1 year
  // 2. Set to localStorage
  localStorage.setItem('token', token);
};

/**
 * Clears the authentication token (logout).
 */
export const clearAuthToken = (): void => {
  // 1. Clear cookie
  document.cookie = "TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  // 2. Clear localStorage
  localStorage.removeItem('token');
};

/**
 * Checks if the user is currently logged in (has a token).
 */
export const isLoggedIn = (): boolean => {
  return !!getAuthToken();
};
