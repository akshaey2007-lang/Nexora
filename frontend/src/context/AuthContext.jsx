import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import emailService from '../services/emailService';
import { useToast } from './ToastContext';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [mailboxProfile, setMailboxProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLiveCredentials, setHasLiveCredentials] = useState(true);
  const { error, success } = useToast();
  const { setTheme } = useTheme();

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, userRes] = await Promise.allSettled([
        authService.getPublicConfig(),
        authService.getCurrentUser()
      ]);

      if (configRes.status === 'fulfilled' && configRes.value?.success) {
        setHasLiveCredentials(Boolean(configRes.value.hasLiveCredentials));
      }

      if (userRes.status === 'fulfilled' && userRes.value?.success) {
        const res = userRes.value;
        setUser(res.user);
        setSettings(res.settings);
        if (res.settings?.theme && !localStorage.getItem('nexora_theme_manual')) {
          setTheme(res.settings.theme);
        }
        if (res.hasLiveCredentials !== undefined) {
          setHasLiveCredentials(Boolean(res.hasLiveCredentials));
        }

        // Load real Gmail profile totals cleanly
        emailService
          .getMailboxProfile()
          .then((profRes) => {
            if (profRes?.success && profRes.profile) {
              setMailboxProfile(profRes.profile);
            }
          })
          .catch(() => {});
      } else {
        setUser(null);
        setSettings(null);
        setMailboxProfile(null);
      }
    } catch {
      setUser(null);
      setSettings(null);
      setMailboxProfile(null);
    } finally {
      setLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const loginWithGoogle = async () => {
    try {
      const res = await authService.getAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      } else {
        error(res?.message || 'Could not initiate Google Sign-In.');
      }
    } catch (err) {
      error(err.message || 'Failed to start Google sign-in.');
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setSettings(null);
      setMailboxProfile(null);
      success('Signed out.');
    } catch {
      setUser(null);
      setSettings(null);
      setMailboxProfile(null);
    }
  };

  const disconnect = async () => {
    try {
      await authService.disconnect();
      setUser(null);
      setSettings(null);
      setMailboxProfile(null);
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
        mailboxProfile,
        loading,
        hasLiveCredentials,
        loginWithGoogle,
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
