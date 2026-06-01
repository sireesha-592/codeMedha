// src/screens/student/AttendanceScreen.js
// Converted from: src/pages/Attendance.js + AttendanceCalendar component

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AttendanceScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [resolvedCourseId, setResolvedCourseId] = useState(user?.enrolledCourse || null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({ attendancePercentage: 0, present: 0, absent: 0, total: 0, currentStreak: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [todayMarked, setTodayMarked] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear]   = useState(new Date().getFullYear());

  // Resolve courseId
  useEffect(() => {
    if (!resolvedCourseId && user?._id && token) {
      api.get(`${API}/api/courses/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if (res.data?.length > 0) setResolvedCourseId(res.data[0]._id); })
        .catch(() => {});
    }
  }, [user, token]);

  useEffect(() => { fetchAttendance(); }, [resolvedCourseId]);

  const fetchAttendance = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, recordsRes] = await Promise.allSettled([
        api.get(`${API}/api/attendance/stats`, { headers }),
        resolvedCourseId
          ? api.get(`${API}/api/attendance/records/${resolvedCourseId}`, { headers })
          : Promise.resolve({ data: [] }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (recordsRes.status === 'fulfilled') {
        const records = recordsRes.value.data || [];
        setAttendanceData(records);
        const today = new Date().toISOString().split('T')[0];
        setTodayMarked(records.some(r => r.date === today && r.status === 'present'));
      }
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const markAttendance = async () => {
    if (!resolvedCourseId) { return; }
    setMarking(true);
    try {
      await api.post(`${API}/api/attendance/mark`, { courseId: resolvedCourseId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodayMarked(true);
      fetchAttendance();
    } catch (e) {
      console.log('Mark error:', e?.response?.data);
    } finally { setMarking(false); }
  };

  // Calendar generation
  const getCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const getDateStatus = (day) => {
    if (!day) return null;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const record = attendanceData.find(r => r.date === dateStr);
    return record?.status || null;
  };

  const today = new Date();
  const isToday = (day) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const calendarDays = getCalendarDays();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.pageBg }]}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize: 20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Attendance</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAttendance(); }} tintColor={theme.accent} />}
      >
        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Attendance', value: `${Math.round(stats.attendancePercentage || 0)}%`, color: theme.accent },
            { label: 'Present',    value: stats.present || 0,   color: theme.accent },
            { label: 'Absent',     value: stats.absent || 0,    color: theme.accentRed },
            { label: 'Streak 🔥',  value: stats.currentStreak || 0, color: theme.accentOrange },
          ].map((st, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: theme.textMuted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Mark Attendance Button */}
        <TouchableOpacity
          style={[s.markBtn, {
            backgroundColor: todayMarked ? theme.border : theme.accent,
            opacity: marking ? 0.7 : 1,
          }]}
          onPress={markAttendance}
          disabled={todayMarked || marking}
        >
          {marking
            ? <ActivityIndicator color="#000" />
            : <Text style={[s.markBtnText, { color: todayMarked ? theme.textMuted : '#000' }]}>
                {todayMarked ? '✅ Attendance Marked for Today' : '📍 Mark Today\'s Attendance'}
              </Text>
          }
        </TouchableOpacity>

        {/* Calendar */}
        <View style={[s.calendarCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Month nav */}
          <View style={s.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
              <Text style={{ color: theme.accent, fontSize: 18 }}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.monthTitle, { color: theme.textPrimary }]}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
              <Text style={{ color: theme.accent, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={s.dayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={[s.dayHeader, { color: theme.textMuted }]}>{d}</Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={s.daysGrid}>
            {calendarDays.map((day, idx) => {
              const status = getDateStatus(day);
              const dayIsToday = isToday(day);
              return (
                <View key={idx} style={s.dayCell}>
                  {day ? (
                    <View style={[
                      s.dayCircle,
                      status === 'present' && { backgroundColor: theme.accent },
                      status === 'absent'  && { backgroundColor: theme.accentRed },
                      dayIsToday && !status && { borderWidth: 1.5, borderColor: theme.accent },
                    ]}>
                      <Text style={[
                        s.dayText,
                        { color: status ? '#fff' : theme.textPrimary },
                        dayIsToday && !status && { color: theme.accent, fontWeight: '700' },
                      ]}>{day}</Text>
                    </View>
                  ) : <View style={s.dayCircle} />}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={s.legend}>
            {[
              { color: theme.accent,    label: 'Present' },
              { color: theme.accentRed, label: 'Absent' },
              { color: theme.border,    label: 'No Data' },
            ].map((l, i) => (
              <View key={i} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: l.color }]} />
                <Text style={[s.legendText, { color: theme.textMuted }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll:      { padding: 16, gap: 16, paddingBottom: 32 },
  statsRow:    { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statCard:    { flex: 1, minWidth: '22%', borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center' },
  statValue:   { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel:   { fontSize: 10, textAlign: 'center' },
  markBtn:     { borderRadius: 14, padding: 16, alignItems: 'center' },
  markBtnText: { fontWeight: '700', fontSize: 15 },
  calendarCard:{ borderRadius: 16, padding: 16, borderWidth: 1 },
  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:      { padding: 8 },
  monthTitle:  { fontSize: 16, fontWeight: '700' },
  dayHeaders:  { flexDirection: 'row', marginBottom: 8 },
  dayHeader:   { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  daysGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell:     { width: '14.28%', alignItems: 'center', marginBottom: 6 },
  dayCircle:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText:     { fontSize: 13 },
  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 11 },
});
