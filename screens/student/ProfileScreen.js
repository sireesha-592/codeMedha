// src/screens/student/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const BADGES = [
  { id: 'first_class',     icon: '🎓', label: 'First Class',    desc: 'Watched your first class',   color: '#7c6af5' },
  { id: 'week_streak',     icon: '🔥', label: 'Week Warrior',   desc: '7-day attendance streak',     color: '#f5a623' },
  { id: 'perfect_month',   icon: '⭐', label: 'Perfect Month',  desc: '100% attendance in a month',  color: '#f5e642' },
  { id: 'assignment_ace',  icon: '✅', label: 'Assignment Ace', desc: 'Submitted 5+ assignments',    color: '#00d4aa' },
  { id: 'early_bird',      icon: '🌅', label: 'Early Bird',     desc: 'Attendance 80%+',             color: '#f56aa0' },
  { id: 'consistent',      icon: '💎', label: 'Consistent',     desc: '30-day streak',               color: '#00cfff' },
];

export default function ProfileScreen() {
  const { user, logout, token, updateUser } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigation = useNavigation();
  const [stats, setStats]           = useState({ attendance: 0, streak: 0, present: 0, absent: 0, submitted: 0 });
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('overview');
  const [parentName, setParentName] = useState(user?.parentName || '');
  const [parentPhone, setParentPhone] = useState(user?.parentPhone || '');
  const [saving, setSaving]         = useState(false);

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [attRes, subRes] = await Promise.allSettled([
        api.get(`${API}/api/attendance/stats`, { headers: h }),
        api.get(`${API}/api/submissions/all`, { headers: h }),
      ]);
      let attData = {}, subList = [];
      if (attRes.status === 'fulfilled') attData = attRes.value.data;
      if (subRes.status === 'fulfilled') subList = subRes.value.data || [];

      const att   = attData.attendancePercentage || 0;
      const streak = attData.currentStreak || 0;
      const submitted = subList.filter(s => s.status === 'submitted').length;
      setStats({ attendance: att, streak, present: attData.present || 0, absent: attData.absent || 0, submitted });

      // Badge logic
      const earned = [];
      if (att >= 80)      earned.push('early_bird');
      if (streak >= 7)    earned.push('week_streak');
      if (streak >= 30)   earned.push('consistent');
      if (submitted >= 5) earned.push('assignment_ace');
      setEarnedBadges(earned);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const saveParentInfo = async () => {
    setSaving(true);
    try {
      await api.put(`${API}/api/auth/update-profile`, { parentName, parentPhone }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await updateUser({ parentName, parentPhone });
      Alert.alert('✅ Saved', 'Parent info updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save. Try again.');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: theme.pageBg }]}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.pageBg }]}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize: 20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Profile</Text>
        <TouchableOpacity onPress={toggleTheme}><Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar card */}
        <View style={[s.avatarCard, { background: 'linear-gradient(135deg, #061a14, #0a2d24)' }]}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={[s.userName, { color: theme.textPrimary }]}>{user?.name || 'Student'}</Text>
          <Text style={[s.userEmail, { color: theme.textMuted }]}>{user?.email}</Text>
          <View style={s.roleBadge}><Text style={s.roleBadgeText}>🎓 Trainee</Text></View>
        </View>

        {/* Tabs */}
        <View style={[s.tabs, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {['overview', 'badges', 'settings'].map(tab => (
            <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, { color: activeTab === tab ? theme.accent : theme.navInactiveColor }]}>
                {tab === 'overview' ? '📊 Overview' : tab === 'badges' ? '🏅 Badges' : '⚙️ Settings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview */}
        {activeTab === 'overview' && (
          <View style={s.section}>
            <View style={s.statsGrid}>
              {[
                { label: 'Attendance', value: `${Math.round(stats.attendance)}%`, color: theme.accent },
                { label: 'Streak 🔥',  value: stats.streak,    color: theme.accentOrange },
                { label: 'Present',    value: stats.present,   color: theme.accent },
                { label: 'Submitted',  value: stats.submitted, color: theme.accentPurple },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: theme.textMuted }]}>{st.label}</Text>
                </View>
              ))}
            </View>
            <View style={[s.infoCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[s.infoTitle, { color: theme.textSecondary }]}>Account Info</Text>
              {[
                { label: 'Name', value: user?.name },
                { label: 'Email', value: user?.email },
                { label: 'Role', value: 'Student / Trainee' },
                { label: 'Course', value: user?.enrolledCourse || 'Not enrolled' },
              ].map((inf, i) => (
                <View key={i} style={[s.infoRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.infoLabel, { color: theme.textMuted }]}>{inf.label}</Text>
                  <Text style={[s.infoValue, { color: theme.textPrimary }]}>{inf.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Badges */}
        {activeTab === 'badges' && (
          <View style={s.section}>
            <View style={s.badgesGrid}>
              {BADGES.map(badge => {
                const earned = earnedBadges.includes(badge.id);
                return (
                  <View key={badge.id} style={[s.badgeCard, { backgroundColor: theme.cardBg, borderColor: earned ? badge.color : theme.border, opacity: earned ? 1 : 0.4 }]}>
                    <Text style={s.badgeIcon}>{badge.icon}</Text>
                    <Text style={[s.badgeLabel, { color: earned ? badge.color : theme.textMuted }]}>{badge.label}</Text>
                    <Text style={[s.badgeDesc, { color: theme.textMuted }]}>{badge.desc}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <View style={s.section}>
            <View style={[s.infoCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[s.infoTitle, { color: theme.textSecondary }]}>Parent / Guardian Info</Text>
              <TextInput style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]} placeholder="Parent Name" placeholderTextColor={theme.textMuted} value={parentName} onChangeText={setParentName} />
              <TextInput style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]} placeholder="Parent Phone" placeholderTextColor={theme.textMuted} value={parentPhone} onChangeText={setParentPhone} keyboardType="phone-pad" />
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: theme.accent }]} onPress={saveParentInfo} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.logoutBtn, { borderColor: theme.accentRed + '66' }]} onPress={handleLogout}>
              <Text style={[s.logoutText, { color: theme.accentRed }]}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { paddingBottom: 40 },
  avatarCard: { alignItems: 'center', padding: 28, backgroundColor: '#061a14' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00d4aa', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#000' },
  userName: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  userEmail: { fontSize: 13, marginBottom: 10 },
  roleBadge: { backgroundColor: '#00d4aa22', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: '#00d4aa44' },
  roleBadgeText: { color: '#00d4aa', fontWeight: '600', fontSize: 12 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 12, fontWeight: '600' },
  section: { padding: 16, gap: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', borderRadius: 12, padding: 14, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 4 },
  infoTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 13, fontWeight: '500' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: '47%', borderRadius: 12, padding: 14, borderWidth: 1.5, alignItems: 'center', gap: 6 },
  badgeIcon: { fontSize: 28 },
  badgeLabel: { fontSize: 13, fontWeight: '700' },
  badgeDesc: { fontSize: 10, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10 },
  saveBtn: { borderRadius: 10, padding: 13, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  logoutBtn: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5 },
  logoutText: { fontWeight: '700', fontSize: 14 },
});
