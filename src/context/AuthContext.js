// src/context/AuthContext.js
// Converted from web AuthContext.js
// Key changes:
//   localStorage → AsyncStorage (async)
//   window.location.hash → stored role key in AsyncStorage
//   sendBeacon (browser) → fetch on app background (not needed in RN, handled by AppState)
//   window events → React Native AppState

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const AuthContext = createContext();
const API = 'https://codemedha-production-47c1.up.railway.app';

export const AuthProvider = ({ children }) => {

  const getKeys = (role) => {
    if (role === 'admin')                         return { u: 'lms_user_admin',   t: 'lms_token_admin'   };
    if (role === 'trainer' || role === 'teacher') return { u: 'lms_user_trainer', t: 'lms_token_trainer' };
    return                                               { u: 'lms_user_student', t: 'lms_token_student' };
  };

  const [isLoading, setIsLoading] = useState(true);
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);

  // ── Boot: restore session from AsyncStorage ──
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try each role's token to find active session
        const roles = ['student', 'trainer', 'admin'];
        for (const role of roles) {
          const { u, t } = getKeys(role);
          const storedToken = await AsyncStorage.getItem(t);
          if (!storedToken) continue;

          // Validate token with server
          const res = await fetch(`${API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const freshUser = await res.json();
            setUser(freshUser);
            setToken(storedToken);
            await AsyncStorage.setItem(u, JSON.stringify(freshUser));
            await AsyncStorage.setItem('lms_role', freshUser.role);
            break;
          }
        }
      } catch (e) {
        console.log('Session restore error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── AppState: logout beacon equivalent (when app goes background) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        const sessionId    = await AsyncStorage.getItem('lms_session_id');
        const sessionToken = await AsyncStorage.getItem('lms_session_token');
        if (sessionId && sessionToken) {
          try {
            await fetch(`${API}/api/sessions/logout`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            });
          } catch (e) {}
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // ── Login ──
  const login = async (userData, tokenData) => {
    const { u, t } = getKeys(userData.role);
    setUser(userData);
    setToken(tokenData);

    await AsyncStorage.multiSet([
      [u, JSON.stringify(userData)],
      [t, tokenData],
      ['token', tokenData],
      ['user', JSON.stringify(userData)],
      ['lms_role', userData.role],
    ]);

    // Refresh user from server
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenData}` }
      });
      if (res.ok) {
        const freshUser = await res.json();
        setUser(freshUser);
        await AsyncStorage.setItem(u, JSON.stringify(freshUser));
        await AsyncStorage.setItem('user', JSON.stringify(freshUser));
      }
    } catch (e) {}

    // Record session for trainer/student
    if (['trainer', 'teacher', 'student'].includes(userData.role)) {
      try {
        const sessRes = await fetch(`${API}/api/sessions/login`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenData}`,
            'Content-Type': 'application/json',
          },
        });
        if (sessRes.ok) {
          const { sessionId } = await sessRes.json();
          await AsyncStorage.setItem('lms_session_id', sessionId);
          await AsyncStorage.setItem('lms_session_token', tokenData);
        }
      } catch (e) {}
    }
  };

  // ── Update user fields ──
  const updateUser = async (updatedFields) => {
    const role = user?.role || 'student';
    const { u } = getKeys(role);
    const stored = await AsyncStorage.getItem(u);
    const current = stored ? JSON.parse(stored) : {};
    const updated = { ...current, ...updatedFields };
    setUser(updated);
    await AsyncStorage.setItem(u, JSON.stringify(updated));
    await AsyncStorage.setItem('user', JSON.stringify(updated));
  };

  // ── Logout ──
  const logout = async () => {
    // End session on server
    const sessionId    = await AsyncStorage.getItem('lms_session_id');
    const sessionToken = await AsyncStorage.getItem('lms_session_token');
    if (sessionId && sessionToken) {
      try {
        await fetch(`${API}/api/sessions/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch (e) {}
    }

    setUser(null);
    setToken(null);

    await AsyncStorage.multiRemove([
      'lms_token_student', 'lms_token_trainer', 'lms_token_admin',
      'lms_user_student',  'lms_user_trainer',  'lms_user_admin',
      'token', 'user', 'lms_role',
      'lms_session_id', 'lms_session_token',
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
