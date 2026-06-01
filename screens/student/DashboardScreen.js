// src/screens/student/DashboardScreen.js
// Converted from: src/pages/Dashboard.js
// Key changes:
//   div → View, p → Text, button → TouchableOpacity
//   CSS StyleSheet.create, window.innerWidth → Dimensions
//   useNavigate → useNavigation (drawer)
//   SVG circle → react-native-svg
//   window.addEventListener → removed (not needed in RN)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation, useDrawerStatus, DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user, token } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigation = useNavigation();

  const [resolvedCourseId, setResolvedCourseId] = useState(user?.enrolledCourse || null);
  const [stats, setStats]           = useState({ attendance: 0, present: 0, absent: 0, total: 0, streak: 0 });
  const [todayClass, setTodayClass] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [dailyFeedbacks, setDailyFeedbacks] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [time, setTime]             = useState(new Date());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-resolve courseId
  useEffect(() => {
    if (!resolvedCourseId && user?._id && token) {
      api.get(`${API}/api/courses/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data?.length > 0) setResolvedCourseId(res.data[0]._id);
      }).catch(() => {});
    }
  }, [user, token]);

  useEffect(() => {
    if (token) {
      api.get(`${API}/api/courses`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAvailableCourses(res.data || []))
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const tok = token;
      const headers = { Authorization: `Bearer ${tok}` };
      const courseId = user?.enrolledCourse || resolvedCourseId;

      const promises = [
        api.get(`${API}/api/attendance/stats`, { headers }),
        api.get(`${API}/api/submissions/all`, { headers }),
        api.get(`${API}/api/daily-feedback/trainee${courseId ? `?courseId=${courseId}` : ''}`, { headers }),
      ];
      if (courseId) {
        promises.push(api.get(`${API}/api/classes/today/${courseId}`, { headers }));
      }

      const [attRes, subRes, fbRes, classRes] = await Promise.allSettled(promises);

      if (attRes.status === 'fulfilled') {
        const d = attRes.value.data;
        setStats({
          attendance: d.attendancePercentage || 0,
          present: d.present || 0,
          absent: d.absent || 0,
          total: d.total || 0,
          streak: d.currentStreak || 0,
        });
      }
      if (subRes.status === 'fulfilled') setSubmissions(subRes.value.data || []);
      if (fbRes.status === 'fulfilled') setDailyFeedbacks(fbRes.value.data || []);
      if (classRes?.status === 'fulfilled') setTodayClass(classRes.value.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [user]);

  const todayDate = new Date().toISOString().split('T')[0];
  const validSubmissions = submissions.filter(s => s.date <= todayDate);
  const submitted = validSubmissions.filter(s => s.status === 'submitted').length;
  const pending   = validSubmissions.filter(s => s.status !== 'submitted').length;

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return '🌅 Good Morning';
    if (h < 17) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  };

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[s.loadingText, { color: theme.textMuted }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - stats.attendance / 100);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.pageBg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={s.menuBtn}>
          <Text style={{ fontSize: 20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Dashboard</Text>
        <TouchableOpacity onPress={toggleTheme} style={s.themeBtn}>
          <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* ── Welcome Banner ── */}
        <LinearGradient
          colors={['#061a14', '#0a2d24', '#0d3d2e']}
          style={s.banner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={s.bannerGreeting}>{greeting()}</Text>
          <Text style={s.bannerName}>
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 🚀
          </Text>
          <Text style={s.bannerDate}>
            {time.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })} — Keep it up!
          </Text>

          <View style={s.bannerStats}>
            {[
              { label: 'Attendance', value: `${Math.round(stats.attendance)}%`, color: '#00d4aa' },
              { label: 'Present',    value: `${stats.present}`,               color: '#7c6af5' },
              { label: 'Streak',     value: `${stats.streak} 🔥`,              color: '#f59e0b' },
            ].map(item => (
              <View key={item.label} style={s.bannerStatItem}>
                <Text style={[s.bannerStatValue, { color: item.color }]}>{item.value}</Text>
                <Text style={s.bannerStatLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Clock ── */}
        <View style={[s.clockCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.clockText, { color: theme.accent }]}>{formatTime(time)}</Text>
        </View>

        {/* ── Stat Cards ── */}
        <View style={s.statsGrid}>
          {[
            { label: 'Attendance',       value: `${Math.round(stats.attendance)}%`, icon: '📅', color: theme.accent,       sub: `${stats.present} present` },
            { label: 'Assignments Done', value: submitted,                           icon: '✅', color: theme.accentPurple, sub: `${pending} pending` },
            { label: 'Day Streak',       value: `${stats.streak}🔥`,                icon: '⚡', color: theme.accentOrange, sub: 'Consecutive' },
            { label: "Today's Class",    value: todayClass ? 'Active' : 'No Class', icon: '🎥', color: todayClass ? theme.accent : theme.textMuted, sub: todayClass ? 'Available' : 'Check tomorrow' },
          ].map((stat, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={s.statTop}>
                <Text style={s.statIcon}>{stat.icon}</Text>
                <View style={[s.statDot, { backgroundColor: stat.color }]} />
              </View>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
              <Text style={[s.statSub, { color: theme.textMuted }]}>{stat.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Today's Class Card ── */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📺 Today's Class</Text>
            <View style={[s.badge, { backgroundColor: todayClass ? '#00d4aa22' : theme.border + '22' }]}>
              <Text style={[s.badgeText, { color: theme.accent }]}>{todayClass ? 'Live' : 'No Class'}</Text>
            </View>
          </View>
          {todayClass ? (
            <View style={s.classRow}>
              <View style={[s.classThumbnail, { backgroundColor: theme.hoverBg, borderColor: theme.border }]}>
                <Text style={{ fontSize: 20 }}>▶</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.classTitle, { color: theme.textPrimary }]}>{todayClass.title || "Today's Session"}</Text>
                <Text style={[s.classMeta, { color: theme.textMuted }]}>📆 Today  •  🕐 Access until midnight</Text>
                <TouchableOpacity
                  style={s.watchBtn}
                  onPress={() => navigation.navigate('Classes')}
                >
                  <Text style={s.watchBtnText}>▶ Watch Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🎥</Text>
              <Text style={[s.emptyText, { color: theme.textMuted }]}>No class scheduled for today</Text>
              <Text style={[s.emptySub, { color: theme.textMuted }]}>Check back tomorrow</Text>
            </View>
          )}
        </View>

        {/* ── Assignments Card ── */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📝 Assignments</Text>
            <View style={[s.badge, { backgroundColor: theme.accentPurple + '22' }]}>
              <Text style={[s.badgeText, { color: theme.accentPurple }]}>{validSubmissions.length} total</Text>
            </View>
          </View>
          {validSubmissions.length > 0 ? (
            validSubmissions.slice(0, 3).map((sub, i) => {
              const isGraded = sub.scorePublished && sub.manualScore != null;
              const displayScore = isGraded ? sub.manualScore : (sub.secA?.score || 0) + (sub.secB?.score || 0) + (sub.secC?.score || 0);
              return (
                <View key={i} style={[s.assignItem, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <View style={[s.assignDot, {
                    backgroundColor: sub.status === 'submitted'
                      ? (isGraded ? '#10b981' : theme.accent)
                      : theme.accentOrange
                  }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.assignTitle, { color: theme.textPrimary }]}>Assignment — {sub.date}</Text>
                    <Text style={[s.assignMeta, { color: theme.textMuted }]}>
                      {sub.status === 'submitted'
                        ? isGraded ? `🏆 Graded • ${displayScore}/${sub.maxScore || 100}` : '✅ Submitted'
                        : '📝 In progress'}
                    </Text>
                  </View>
                  {sub.status !== 'submitted' && (
                    <TouchableOpacity
                      style={[s.continueBtn, { borderColor: theme.accentPurple + '66' }]}
                      onPress={() => navigation.navigate('Tasks')}
                    >
                      <Text style={[s.continueBtnText, { color: theme.accentPurple }]}>Continue →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>📝</Text>
              <Text style={[s.emptyText, { color: theme.textMuted }]}>No assignments yet</Text>
              <TouchableOpacity
                style={[s.continueBtn, { borderColor: theme.accentPurple + '66', alignSelf: 'center', marginTop: 8 }]}
                onPress={() => navigation.navigate('Tasks')}
              >
                <Text style={[s.continueBtnText, { color: theme.accentPurple }]}>Start Today's →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Attendance Overview Card ── */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.textSecondary, marginBottom: 16 }]}>📊 Attendance Overview</Text>
          <View style={s.progressRow}>
            <Svg width={120} height={120}>
              <Circle cx={60} cy={60} r={45} fill="none" stroke={theme.border} strokeWidth={10} />
              <Circle
                cx={60} cy={60} r={45}
                fill="none"
                stroke={theme.accent}
                strokeWidth={10}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation={-90}
                origin="60,60"
              />
              <SvgText x={60} y={55} textAnchor="middle" fill={theme.textPrimary} fontSize={20} fontWeight="bold">
                {Math.round(stats.attendance)}%
              </SvgText>
              <SvgText x={60} y={72} textAnchor="middle" fill={theme.textMuted} fontSize={10}>
                Attendance
              </SvgText>
            </Svg>
            <View style={s.progressStats}>
              {[
                { label: 'Present', val: `${stats.present} days`, color: theme.accent },
                { label: 'Absent',  val: `${stats.absent} days`,  color: theme.accentRed },
                { label: 'Streak',  val: `${stats.streak} days 🔥`, color: theme.accentOrange },
              ].map((p, i) => (
                <View key={i} style={s.progressItem}>
                  <View style={[s.progressDot, { backgroundColor: p.color }]} />
                  <View>
                    <Text style={[s.progressLabel, { color: theme.textMuted }]}>{p.label}</Text>
                    <Text style={[s.progressVal, { color: theme.textPrimary }]}>{p.val}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Daily Feedback from Admin ── */}
        {dailyFeedbacks.length > 0 && (
          <View style={[s.card, { backgroundColor: '#1a1a2e', borderColor: '#2a2a4a' }]}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#e0e0e0', marginBottom: 12 }}>
              ⭐ Daily Feedback from Admin
            </Text>
            {dailyFeedbacks.slice(0, 3).map((fb, i) => (
              <View key={fb._id || i} style={s.feedbackItem}>
                <View style={s.feedbackMeta}>
                  <Text style={s.feedbackDate}>📅 {fb.date}</Text>
                  {fb.rating && <Text style={s.feedbackRating}>{'⭐'.repeat(fb.rating)} ({fb.rating}/5)</Text>}
                </View>
                <Text style={s.feedbackText}>{fb.feedback}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:      { fontSize: 14, marginTop: 8 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  menuBtn:          { padding: 4 },
  headerTitle:      { fontSize: 17, fontWeight: '700' },
  themeBtn:         { padding: 4 },
  scroll:           { padding: 16, gap: 16, paddingBottom: 32 },
  // Banner
  banner:           { borderRadius: 20, padding: 24 },
  bannerGreeting:   { fontSize: 12, fontWeight: '700', color: 'rgba(0,212,170,0.7)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
  bannerName:       { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, lineHeight: 28 },
  bannerDate:       { fontSize: 12, color: 'rgba(0,212,170,0.6)', marginBottom: 16 },
  bannerStats:      { flexDirection: 'row', gap: 10 },
  bannerStatItem:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flex: 1 },
  bannerStatValue:  { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  bannerStatLabel:  { fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Clock
  clockCard:        { borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  clockText:        { fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  // Stats
  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard:         { width: (SCREEN_WIDTH - 44) / 2, borderRadius: 16, padding: 16, borderWidth: 1 },
  statTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statIcon:         { fontSize: 20 },
  statDot:          { width: 8, height: 8, borderRadius: 4 },
  statValue:        { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  statLabel:        { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  statSub:          { fontSize: 10, marginTop: 2 },
  // Card
  card:             { borderRadius: 16, padding: 18, borderWidth: 1 },
  cardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:        { fontSize: 13, fontWeight: '600' },
  badge:            { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:        { fontSize: 11, fontWeight: '600' },
  // Class
  classRow:         { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  classThumbnail:   { width: 60, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  classTitle:       { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  classMeta:        { fontSize: 11, marginBottom: 8 },
  watchBtn:         { backgroundColor: '#00d4aa', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  watchBtnText:     { color: '#000', fontWeight: '700', fontSize: 12 },
  // Empty state
  emptyState:       { alignItems: 'center', paddingVertical: 16, gap: 4 },
  emptyIcon:        { fontSize: 32, opacity: 0.4 },
  emptyText:        { fontSize: 13, fontWeight: '500' },
  emptySub:         { fontSize: 11 },
  // Assignment
  assignItem:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  assignDot:        { width: 6, height: 6, borderRadius: 3 },
  assignTitle:      { fontSize: 13, fontWeight: '500' },
  assignMeta:       { fontSize: 11, marginTop: 2 },
  continueBtn:      { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  continueBtnText:  { fontSize: 11, fontWeight: '600' },
  // Progress
  progressRow:      { flexDirection: 'row', alignItems: 'center', gap: 20 },
  progressStats:    { flex: 1, gap: 14 },
  progressItem:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressDot:      { width: 8, height: 8, borderRadius: 4 },
  progressLabel:    { fontSize: 10, marginBottom: 1 },
  progressVal:      { fontSize: 14, fontWeight: '600' },
  // Feedback
  feedbackItem:     { backgroundColor: '#0f0f1e', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#7b61ff', marginBottom: 8 },
  feedbackMeta:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  feedbackDate:     { fontSize: 11, color: '#888' },
  feedbackRating:   { fontSize: 11, color: '#f5a623' },
  feedbackText:     { fontSize: 13, color: '#ccc', lineHeight: 20 },
});
