import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, userApi, setApiToken } from '../api';
import { isJwtExpired, getJwtTimeRemaining } from '../utils/tokenUtils';

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = 'billwise_session_auth';

function readStoredAuth() {
  try {
    // Purge legacy persistent localStorage so launch starts fresh on Login page
    localStorage.removeItem('billwise_auth');
    localStorage.removeItem(SESSION_STORAGE_KEY);

    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.token) {
      if (isJwtExpired(parsed.token)) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setApiToken(null);
        return null;
      }
      setApiToken(parsed.token);
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [userProfile, setUserProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Sync token to API client & sessionStorage
  useEffect(() => {
    if (auth?.token) {
      setApiToken(auth.token);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(auth));
      localStorage.removeItem('billwise_auth');
    } else {
      setApiToken(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('billwise_auth');
      setUserProfile(null);
    }
  }, [auth]);

  // Handle explicit logout or session expiration logout
  const logout = useCallback((isExpired = false) => {
    setApiToken(null);
    setAuth(null);
    setUserProfile(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('billwise_auth');
    if (isExpired) {
      setSessionExpiredMessage('Your session has expired. Please log in again to continue.');
    } else {
      setSessionExpiredMessage(null);
    }
  }, []);

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  // Automatic JWT Token Expiry Watchdog & Timer
  useEffect(() => {
    if (!auth?.token) return;

    // Check if token is already expired
    if (isJwtExpired(auth.token)) {
      console.warn("JWT token is expired on load. Logging out...");
      logout(true);
      return;
    }

    // Schedule logout when the JWT token actually expires
    const msRemaining = getJwtTimeRemaining(auth.token);
    const timerId = setTimeout(() => {
      console.warn("JWT token lifetime reached. Session expired.");
      logout(true);
    }, msRemaining);

    return () => clearTimeout(timerId);
  }, [auth?.token, logout]);

  // Load / refresh full profile & merchant status when authenticated
  const refreshProfile = useCallback(async () => {
    if (!auth?.token) return null;
    try {
      const profile = await userApi.getMe();
      if (profile) {
        setUserProfile(profile);
        if (profile.merchant) {
          setAuth(prev => prev ? {
            ...prev,
            merchantId: profile.merchantId,
            merchantStatus: profile.merchant.status,
            merchantTradeName: profile.merchant.tradeName,
            fullName: profile.fullName
          } : prev);
        }
      }
      return profile;
    } catch {
      return null;
    }
  }, [auth?.token]);

  useEffect(() => {
    if (auth?.token) {
      refreshProfile();
    }
  }, [auth?.token, refreshProfile]);

  // Catch 401 Unauthorized events from backend
  useEffect(() => {
    const handleForceLogout = () => {
      logout(true);
    };
    window.addEventListener('billwise:unauthorized', handleForceLogout);
    return () => window.removeEventListener('billwise:unauthorized', handleForceLogout);
  }, [logout]);

  const login = useCallback(async (username, password) => {
    setIsAuthLoading(true);
    setAuthError(null);
    setSessionExpiredMessage(null);
    try {
      const data = await authApi.login(username, password);
      if (data?.token) {
        setApiToken(data.token);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      }
      setAuth(data);
      return data;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const register = useCallback(async (paramsOrUsername, email, password, role) => {
    setIsAuthLoading(true);
    setAuthError(null);
    setSessionExpiredMessage(null);
    try {
      const data = await authApi.register(paramsOrUsername, email, password, role);
      if (data?.token) {
        setApiToken(data.token);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      }
      setAuth(data);
      return data;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const googleLogin = useCallback(async (googlePayload) => {
    setIsAuthLoading(true);
    setAuthError(null);
    setSessionExpiredMessage(null);
    try {
      const data = await authApi.googleLogin(googlePayload);
      if (data?.token) {
        setApiToken(data.token);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      }
      setAuth(data);
      return data;
    } catch (err) {
      setAuthError(err.message || 'Google Authentication failed');
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const loginWithToken = useCallback((token, userDetails = {}) => {
    setSessionExpiredMessage(null);
    const sessionData = {
      token,
      username: userDetails.username,
      email: userDetails.email,
      fullName: userDetails.fullName,
      role: userDetails.role,
      merchantId: userDetails.merchantId,
      merchantStatus: userDetails.merchantStatus || 'VERIFIED',
      accountantVerified: userDetails.accountantVerified !== false,
      adminUsername: userDetails.adminUsername || userDetails.username
    };
    setApiToken(token);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    setAuth(sessionData);
    return sessionData;
  }, []);

  const value = useMemo(() => ({
    token: auth?.token ?? null,
    username: auth?.username ?? null,
    email: auth?.email ?? null,
    fullName: auth?.fullName ?? userProfile?.fullName ?? null,
    role: auth?.role ?? null,
    merchantId: auth?.merchantId ?? userProfile?.merchantId ?? null,
    merchantStatus: auth?.merchantStatus ?? userProfile?.merchant?.status ?? 'VERIFIED',
    merchantTradeName: auth?.merchantTradeName ?? userProfile?.merchant?.tradeName ?? null,
    merchant: userProfile?.merchant ?? null,
    accountantVerified: auth?.accountantVerified ?? userProfile?.accountantVerified ?? true,
    adminUsername: auth?.adminUsername ?? userProfile?.merchant?.adminUsername ?? null,
    userProfile,
    refreshProfile,
    isAuthenticated: Boolean(auth?.token),
    isAuthLoading,
    authError,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
    login,
    register,
    googleLogin,
    loginWithToken,
    logout,
    hasRole: (...roles) => Boolean(auth?.role) && roles.includes(auth.role),
    isSuperAdmin: auth?.role === 'SUPER_ADMIN',
  }), [auth, userProfile, isAuthLoading, authError, sessionExpiredMessage, clearSessionExpiredMessage, login, register, googleLogin, loginWithToken, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
