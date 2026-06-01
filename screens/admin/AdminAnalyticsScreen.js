// src/screens/admin/AdminAnalyticsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminAnalyticsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [statsRes, attRes, subRes] = await Promise.allSettled([
        api.get(`${API}/api/admin/stats`,       { headers: h }),
        api.get(`${API}/api/admin/attendance`,  { headers: h }),
        api.get(`${API}/api/admin/submissions`, { headers: h }),
      ]);
      setData({
        stats:       statsRes.status === 'fulfilled' ? statsRes.value.data : {},
        attendance:  attRes.status === 'fulfilled'   ? attRes.value.data   : [],
        submissions: subRes.status === 'fulfilled'   ? subRes.value.data   : [],
      });
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pageBg }}>
      <ActivityIndicator color="#c77dff" size="large" />
    </View>
  );

  const stats       = data?.stats || {};
  const submissions = Array.isArray(data?.submissions) ? data.submissions : [];
  const attendance  = Array.isArray(data?.attendance)  ? data.attendance  : [];

  const totalSubs    = submissions.length;
  const gradedSubs   = submissions.filter(s => s.scorePublished).length;
  const avgScore     = gradedSubs > 0
    ? Math.round(submissions.filter(s => s.scorePublished && s.manualScore != null)
        .reduce((a, s) => a + (s.manualScore || 0), 0) / gradedSubs)
    : 0;
  const overallAtt   = attendance.length > 0
    ? Math.round(attendance.reduce((a, r) => a + (r.attendancePercentage || 0), 0) / attendance.length)
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📊 Analytics</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAnalytics(); }}
            tintColor="#c77dff"
          />
        }
      >
        {/* Overview cards */}
        <View style={s.row}>
          {[
            { label: 'Total Students', value: stats.totalStudents || 0, color: '#c77dff' },
            { label: 'Total Trainers', value: stats.totalTrainers || 0, color: '#8b5cf6' },
            { label: 'Total Courses',  value: stats.totalCourses  || 0, color: theme.accent },
            { label: 'Active Today',   value: stats.todayActive   || 0, color: '#10b981' },
          ].map((st, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: theme.textMuted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Attendance summary */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📅 Overall Attendance</Text>
          <View style={[s.barBg, { backgroundColor: theme.border }]}>
            <View style={[s.barFill, { backgroundColor: '#c77dff', width: `${overallAtt}%` }]} />
          </View>
          <Text style={[{ color: '#c77dff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 }]}>
            {overallAtt}%
          </Text>
          <Text style={[{ color: theme.textMuted, fontSize: 12, textAlign: 'center' }]}>
            Average across all students
          </Text>
        </View>

        {/* Assignment summary */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📝 Assignments</Text>
          <View style={s.row}>
            {[
              { label: 'Total',   value: totalSubs,   color: theme.accent },
              { label: 'Graded',  value: gradedSubs,  color: '#c77dff' },
              { label: 'Avg Score', value: `${avgScore}`, color: '#10b981' },
            ].map((st, i) => (
              <View key={i} style={[s.miniStat, { backgroundColor: theme.inputBg }]}>
                <Text style={[{ color: st.color, fontSize: 22, fontWeight: '800' }]}>{st.value}</Text>
                <Text style={[{ color: theme.textMuted, fontSize: 10 }]}>{st.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top attendance table */}
        {attendance.length > 0 && (
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>🏆 Top Attendance</Text>
            {[...attendance]
              .sort((a, b) => (b.attendancePercentage || 0) - (a.attendancePercentage || 0))
              .slice(0, 8)
              .map((r, i) => (
                <View key={i} style={[s.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={[{ color: theme.textMuted, width: 24, fontSize: 12 }]}>#{i + 1}</Text>
                  <Text style={[{ flex: 1, color: theme.textPrimary, fontSize: 13 }]}>{r.name || 'Student'}</Text>
                  <Text style={[{ color: '#c77dff', fontWeight: '700', fontSize: 13 }]}>
                    {Math.round(r.attendancePercentage || 0)}%
                  </Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll:      { padding: 16, gap: 14, paddingBottom: 32 },
  row:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:    { width: '47%', borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue:   { fontSize: 24, fontWeight: '800' },
  statLabel:   { fontSize: 10, textAlign: 'center' },
  card:        { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle:   { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  barBg:       { height: 8, borderRadius: 4 },
  barFill:     { height: 8, borderRadius: 4 },
  miniStat:    { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  tableRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
});
