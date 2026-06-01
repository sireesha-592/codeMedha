// src/screens/LoginScreen.js
// Converted from web: src/pages/Login.js
// Key changes:
//   div → View, p/span → Text, input → TextInput
//   form onSubmit → TouchableOpacity onPress
//   inline style objects → StyleSheet.create
//   useNavigate → useNavigation (handled by AuthContext re-render)

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const ROLE_CONFIGS = {
  student: {
    gradStart: '#1a1a2e', gradEnd: '#0f3460',
    accent: '#00d4aa',
    label: '👤 Student Login',
    tokenKey: 'lms_token_student',
  },
  trainer: {
    gradStart: '#1a472a', gradEnd: '#2d6a4f',
    accent: '#52b788',
    label: '🎓 Trainer Login',
    tokenKey: 'lms_token_trainer',
  },
  admin: {
    gradStart: '#4a1942', gradEnd: '#7b2d8b',
    accent: '#c77dff',
    label: '👑 Admin Login',
    tokenKey: 'lms_token_admin',
  },
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [role, setRole]         = useState('student');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const c = ROLE_CONFIGS[role];

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res      = await api.post('/api/auth/login', { email: email.trim(), password });
      const user     = res.data.user;
      const userRole = user.role || '';

      // Role validation — same logic as web
      if (role === 'trainer' && userRole !== 'trainer' && userRole !== 'teacher') {
        setError('Please enter trainer credentials!');
        setLoading(false);
        return;
      }
      if (role === 'admin' && userRole !== 'admin') {
        setError('Please enter admin credentials!');
        setLoading(false);
        return;
      }
      if (role === 'student' && userRole !== 'student') {
        setError('Please enter student credentials!');
        setLoading(false);
        return;
      }

      await login(user, res.data.token);
      // Navigation happens automatically via AuthContext state change → RootNavigator re-render

    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[c.gradStart, c.gradEnd]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Role Selector */}
          <View style={styles.roleSelector}>
            {Object.keys(ROLE_CONFIGS).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleTab, role === r && { backgroundColor: ROLE_CONFIGS[r].accent + '30', borderColor: ROLE_CONFIGS[r].accent }]}
                onPress={() => { setRole(r); setError(''); }}
              >
                <Text style={[styles.roleTabText, role === r && { color: ROLE_CONFIGS[r].accent }]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Logo */}
            <View style={[styles.logoCircle, { backgroundColor: c.accent }]}>
              <Text style={styles.logoIcon}>⚡</Text>
            </View>

            <Text style={styles.title}>CodeMedha</Text>
            <Text style={[styles.subtitle, { color: c.accent }]}>{c.label}</Text>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: c.accent }, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.buttonText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  roleTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  roleTabText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 12,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoIcon: {
    fontSize: 26,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    width: '100%',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 16,          // 16px prevents iOS zoom on focus
    color: '#1a1a2e',
    marginBottom: 10,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});
