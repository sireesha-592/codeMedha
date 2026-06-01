// src/screens/admin/AdminSettingsScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminSettingsScreen() {
  const { user, logout, token } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();

  const [feedbackDate, setFeedbackDate]       = useState('');
  const [feedbackText, setFeedbackText]       = useState('');
  const [feedbackRating, setFeedbackRating]   = useState('5');
  const [courseIdForFb, setCourseIdForFb]     = useState('');
  const [savingFb, setSavingFb]               = useState(false);

  const [deadlineDate, setDeadlineDate]       = useState('');
  const [deadlineTime, setDeadlineTime]       = useState('23:59');
  const [savingDl, setSavingDl]               = useState(false);

  const sendFeedback = async () => {
    if (!feedbackDate || !feedbackText) { Alert.alert('Required', 'Date and feedback are required'); return; }
    setSavingFb(true);
    try {
      await api.post(`${API}/api/daily-feedback`, {
        date: feedbackDate,
        feedback: feedbackText,
        rating: parseInt(feedbackRating) || 5,
        courseId: courseIdForFb || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('✅ Feedback sent!');
      setFeedbackDate('');
      setFeedbackText('');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send feedback');
    } finally { setSavingFb(false); }
  };

  const setDeadline = async () => {
    if (!deadlineDate) { Alert.alert('Required', 'Date is required'); return; }
    setSavingDl(true);
    try {
      const deadline = `${deadlineDate}T${deadlineTime}:00`;
      await api.post(`${API}/api/assignment-config`, {
        date: deadlineDate,
        deadline,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('✅ Deadline set!');
      setDeadlineDate('');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to set deadline');
    } finally { setSavingDl(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>⚙️ Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Profile info */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>👑 Admin Info</Text>
          {[
            { label: 'Name',  value: user?.name  || '—' },
            { label: 'Email', value: user?.email || '—' },
            { label: 'Role',  value: 'Administrator' },
          ].map((inf, i) => (
            <View key={i} style={[s.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[s.infoLabel, { color: theme.textMuted }]}>{inf.label}</Text>
              <Text style={[s.infoValue, { color: theme.textPrimary }]}>{inf.value}</Text>
            </View>
          ))}
        </View>

        {/* Theme toggle */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={s.rowBetween}>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>🌙 Dark Mode</Text>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: '#c77dff', false: theme.border }} thumbColor="#fff" />
          </View>
        </View>

        {/* Daily Feedback */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>⭐ Send Daily Feedback</Text>
          <TextInput style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Date (YYYY-MM-DD) *" placeholderTextColor={theme.textMuted}
            value={feedbackDate} onChangeText={setFeedbackDate}
          />
          <TextInput style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Course ID (optional)" placeholderTextColor={theme.textMuted}
            value={courseIdForFb} onChangeText={setCourseIdForFb}
          />
          <TextInput style={[s.input, s.multiline, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Feedback message *" placeholderTextColor={theme.textMuted}
            multiline value={feedbackText} onChangeText={setFeedbackText}
          />
          <TextInput style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Rating (1-5, default 5)" placeholderTextColor={theme.textMuted}
            keyboardType="numeric" value={feedbackRating} onChangeText={setFeedbackRating}
          />
          <TouchableOpacity style={[s.btn, { backgroundColor: '#c77dff' }]} onPress={sendFeedback} disabled={savingFb}>
            {savingFb ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Feedback</Text>}
          </TouchableOpacity>
        </View>

        {/* Assignment Deadline */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>⏰ Set Assignment Deadline</Text>
          <TextInput style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Date (YYYY-MM-DD) *" placeholderTextColor={theme.textMuted}
            value={deadlineDate} onChangeText={setDeadlineDate}
          />
          <TextInput style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Time (HH:MM, default 23:59)" placeholderTextColor={theme.textMuted}
            value={deadlineTime} onChangeText={setDeadlineTime}
          />
          <TouchableOpacity style={[s.btn, { backgroundColor: theme.accentOrange }]} onPress={setDeadline} disabled={savingDl}>
            {savingDl ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Set Deadline</Text>}
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[s.logoutBtn, { borderColor: theme.accentRed + '88' }]} onPress={handleLogout}>
          <Text style={[{ color: theme.accentRed, fontWeight: '700', fontSize: 15 }]}>🚪 Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll:      { padding: 16, gap: 14, paddingBottom: 32 },
  card:        { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  cardTitle:   { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel:   { fontSize: 12 },
  infoValue:   { fontSize: 13, fontWeight: '500' },
  rowBetween:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input:       { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  multiline:   { minHeight: 80, textAlignVertical: 'top' },
  btn:         { borderRadius: 10, padding: 13, alignItems: 'center' },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutBtn:   { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5 },
});
