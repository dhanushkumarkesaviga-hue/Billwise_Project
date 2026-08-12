/**
 * BillWise — JWT Token & Session Utilities
 * Handles parsing token payload, expiration calculations, and session validity.
 */

/**
 * Decodes the payload portion of a standard JWT token.
 * @param {string} token 
 * @returns {Object|null} parsed payload
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn("Could not parse JWT token:", err);
    return null;
  }
}

/**
 * Checks if a JWT token is expired.
 * @param {string} token 
 * @returns {boolean} true if expired or invalid, false otherwise
 */
export function isJwtExpired(token) {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    // If no exp claim found, consider valid for current session
    return false;
  }
  // payload.exp is in seconds; Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
}

/**
 * Returns remaining milliseconds until the JWT token expires.
 * @param {string} token 
 * @returns {number} milliseconds remaining (>= 0)
 */
export function getJwtTimeRemaining(token) {
  if (!token) return 0;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    // Default fallback: 8 hours
    return 8 * 60 * 60 * 1000;
  }
  const remaining = payload.exp * 1000 - Date.now();
  return Math.max(0, remaining);
}
