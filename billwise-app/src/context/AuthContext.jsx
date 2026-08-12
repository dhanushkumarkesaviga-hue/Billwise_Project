import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, userApi, setApiToken } from '../api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'billwise_auth';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.token) {
      setApiToken(parsed.token);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [userProfile, setUserProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    if (auth?.token) {
      setApiToken(auth.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      setApiToken(null);
      localStorage.removeItem(STORAGE_KEY);
      setUserProfile(null);
    }
  }, [auth]);

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

  useEffect(() => {
    const handleForceLogout = () => {
      setApiToken(null);
      setAuth(null);
      setUserProfile(null);
    };
    window.addEventListener('billwise:unauthorized', handleForceLogout);
    return () => window.removeEventListener('billwise:unauthorized', handleForceLogout);
  }, []);

  const login = useCallback(async (username, password) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const data = await authApi.login(username, password);
      if (data?.token) {
        setApiToken(data.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    try {
      const data = await authApi.register(paramsOrUsername, email, password, role);
      if (data?.token) {
        setApiToken(data.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    try {
      const data = await authApi.googleLogin(googlePayload);
      if (data?.token) {
        setApiToken(data.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    setAuth(sessionData);
    return sessionData;
  }, []);

  const logout = useCallback(() => {
    setApiToken(null);
    setAuth(null);
    setUserProfile(null);
    localStorage.removeItem(STORAGE_KEY);
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
    login,
    register,
    googleLogin,
    loginWithToken,
    logout,
    hasRole: (...roles) => Boolean(auth?.role) && roles.includes(auth.role),
    isSuperAdmin: auth?.role === 'SUPER_ADMIN',
  }), [auth, userProfile, isAuthLoading, authError, login, register, googleLogin, loginWithToken, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
