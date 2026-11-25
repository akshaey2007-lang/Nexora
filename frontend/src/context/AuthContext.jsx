import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [demoModeAvailable, setDemoModeAvailable] = useState(false);
  const [hasLiveCredentials, setHasLiveCredentials] = useState(true);
  const { error, success } = useToast();

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, userRes] = await Promise.allSettled([
        authService.getPublicConfig(),
        authService.getCurrentUser()
      ]);

      if (configRes.status === 'fulfilled' && configRes.value?.success) {
        setDemoModeAvailable(Boolean(configRes.value.demoModeAvailable));
        setHasLiveCredentials(Boolean(configRes.value.hasLiveCredentials));
      }

      if (userRes.status === 'fulfilled' && userRes.value?.success) {
        const res = userRes.value;
        setUser(res.user);
        setSettings(res.settings);
        setIsDemo(Boolean(res.isDemo));
        if (res.demoModeAvailable !== undefined) {
          setDemoModeAvailable(Boolean(res.demoModeAvailable));
        }
        if (res.hasLiveCredentials !== undefined) {
          setHasLiveCredentials(Boolean(res.hasLiveCredentials));
        }
      } else {
        setUser(null);
        setIsDemo(false);
      }
    } catch (err) {
      setUser(null);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const loginWithGoogle = async () => {
    try {
      const res = await authService.getAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      } else {
        error(res?.message || 'Could not initiate Google Sign-In. Check your .env credentials.');
      }
    } catch (err) {
      error(err.message || 'Failed to start Google sign-in. Please update GOOGLE_CLIENT_ID in your .env file.');
    }
  };

  const activateDemoMode = async () => {
    try {
      setLoading(true);
      const res = await authService.enableDemoMode();
      if (res && res.success) {
        setUser(res.user);
        setIsDemo(true);
        success('Demo mode enabled. Enjoy exploring NEXORA MAIL!');
        return true;
      }
    } catch (err) {
      error('Failed to initialize demo environment.');
    } finally {
      setLoading(false);
    }
    return false;
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsDemo(false);
      success('Logged out successfully.');
    } catch (err) {
      setUser(null);
    }
  };

  const disconnect = async () => {
    try {
      await authService.disconnect();
      setUser(null);
      setIsDemo(false);
      success('Google account disconnected.');
    } catch (err) {
      error(err.message || 'Failed to disconnect account.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        settings,
        setSettings,
        loading,
        isDemo,
        demoModeAvailable,
        hasLiveCredentials,
        loginWithGoogle,
        activateDemoMode,
        logout,
        disconnect,
        refreshUser: fetchCurrentUser,
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
