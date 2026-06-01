// src/screens/student/AnalyticsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AnalyticsScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [data, setData] = useState({ attendance: {}, submissions: [], weeklyProgress: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [attRes, subRes] = await Promise.allSettled([
        api.get(`${API}/api/attendance/stats`, { headers: h }),
        api.get(`${API}/api/submissions/all`, { headers: h }),
      ]);
      setData({
        attendance: attRes.status === 'fulfilled' ? attRes.value.data : {},
        submissions: subRes.status === 'fulfilled' ? (subRes.value.data || []) : [],
      });
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const submitted = data.submissions.filter(s => s.status === 'submitted').length;
  const pending   = data.submissions.filter(s => s.status !== 'submitted').length;
  const graded    = data.submissions.filter(s => s.scorePublished && s.manualScore != null).length;
  const avgScore  = graded > 0
    ? Math.round(data.submissions.filter(s => s.scorePublished && s.manualScore != null).reduce((a, s) => a + (s.manualScore || 0), 0) / graded)
    : 0;

  if (loading) return (
    <View style={[s.center, { backgroundColor: theme.pageBg }]}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.pageBg }]}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize: 20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Analytics</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} tintColor={theme.accent} />}>

        {/* Attendance Stats */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📅 Attendance</Text>
          <View style={s.row}>
            {[
              { label: 'Attendance', value: `${Math.round(data.attendance.attendancePercentage || 0)}%`, color: theme.accent },
              { label: 'Present', value: data.attendance.present || 0, color: theme.accent },
              { label: 'Absent',  value: data.attendance.absent || 0,  color: theme.accentRed },
              { label: 'Streak 🔥', value: data.attendance.currentStreak || 0, color: theme.accentOrange },
            ].map((st, i) => (
              <View key={i} style={[s.miniStat, { backgroundColor: theme.inputBg }]}>
                <Text style={[s.miniVal, { color: st.color }]}>{st.value}</Text>
                <Text style={[s.miniLabel, { color: theme.textMuted }]}>{st.label}</Text>
              </View>
            ))}
          </View>
          {/* Progress bar */}
          <View style={[s.barBg, { backgroundColor: theme.border }]}>
            <View style={[s.barFill, { backgroundColor: theme.accent, width: `${data.attendance.attendancePercentage || 0}%` }]} />
          </View>
          <Text style={[s.barLabel, { color: theme.textMuted }]}>{Math.round(data.attendance.attendancePercentage || 0)}% overall attendance</Text>
        </View>

        {/* Assignment Stats */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📝 Assignments</Text>
          <View style={s.row}>
            {[
              { label: 'Submitted', value: submitted, color: theme.accent },
              { label: 'Pending',   value: pending,   color: theme.accentOrange },
              { label: 'Graded',    value: graded,    color: theme.accentPurple },
              { label: 'Avg Score', value: `${avgScore}`, color: '#10b981' },
            ].map((st, i) => (
              <View key={i} style={[s.miniStat, { backgroundColor: theme.inputBg }]}>
                <Text style={[s.miniVal, { color: st.color }]}>{st.value}</Text>
                <Text style={[s.miniLabel, { color: theme.textMuted }]}>{st.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Submissions */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📋 Recent Submissions</Text>
          {data.submissions.slice(0, 5).map((sub, i) => {
            const isGraded = sub.scorePublished && sub.manualScore != null;
            return (
              <View key={i} style={[s.subRow, { borderBottomColor: theme.border }]}>
                <View style={[s.subDot, { backgroundColor: sub.status === 'submitted' ? theme.accent : theme.accentOrange }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: theme.textPrimary, fontSize: 13, fontWeight: '500' }]}>Assignment — {sub.date}</Text>
                  <Text style={[{ color: theme.textMuted, fontSize: 11, marginTop: 2 }]}>
                    {sub.status === 'submitted' ? (isGraded ? `🏆 ${sub.manualScore}/${sub.maxScore || 100}` : '✅ Submitted') : '⏳ In Progress'}
                  </Text>
                </View>
              </View>
            );
          })}
          {data.submissions.length === 0 && (
            <Text style={[{ color: theme.textMuted, textAlign: 'center', padding: 16 }]}>No submissions yet</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 14 },
  cardTitle: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  miniStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  miniVal: { fontSize: 18, fontWeight: '800' },
  miniLabel: { fontSize: 9, marginTop: 2 },
  barBg: { height: 6, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  barLabel: { fontSize: 11 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  subDot: { width: 8, height: 8, borderRadius: 4 },
});
