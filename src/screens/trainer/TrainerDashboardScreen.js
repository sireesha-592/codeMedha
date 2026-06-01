import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerDashboardScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get(`${API}/api/trainer/dashboard`, { headers });
      setStats(res.data);
    } catch(e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? '🌅 Good Morning' : hour < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening';
  const todayStr = now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const { totalStudents, attendance, submissions, hasAssignment } = stats || {};
  const attendancePct = totalStudents > 0 ? Math.round(((attendance?.present || 0) / totalStudents) * 100) : 0;

  const firstName = (user?.name || 'Trainer').split(' ')[0];

  const TIPS = [
    'Share session notes after every class so students can revise easily.',
    'Grade assignments within 24 hours for better student engagement.',
    'Monitor attendance trends weekly to identify at-risk students.',
    'Use the group chat to send motivational messages to your batch.',
    'Upload reference PDFs and docs to the Resources tab for easy access.',
  ];
  const tip = TIPS[now.getDay() % TIPS.length];

  const QUICK_ACTIONS = [
    { icon:'✅', label:'Mark Attendance',   color:'#10b981', screen:'Classes' },
    { icon:'📝', label:'Grade Assignments', color:'#8b5cf6', screen:'Assignments' },
    { icon:'❓', label:'Resolve Doubts',    color:'#f59e0b', screen:'Doubts' },
    { icon:'📓', label:'Add Session Note',  color:'#3b82f6', screen:'SessionNotes' },
    { icon:'📎', label:'Share Resources',   color:'#ef4444', screen:'Resources' },
    { icon:'💬', label:'Group Chat',        color:'#06b6d4', screen:'Chat' },
  ];

  const STAT_CARDS = [
    { icon:'👥', label:'Total Students', value: totalStudents ?? 0,              color:'#6366f1', trend:'+2 this week' },
    { icon:'✅', label:'Present Today',  value: attendance?.present ?? '—',      color:'#10b981', trend:`${attendancePct}% rate` },
    { icon:'❌', label:'Absent Today',   value: attendance?.absent ?? '—',       color:'#ef4444', trend:'needs follow-up' },
    { icon:'⏳', label:'Not Marked',     value: attendance?.notMarked ?? '—',    color:'#f59e0b', trend:'mark now' },
    { icon:'📤', label:'Submitted',      value: hasAssignment ? (submissions?.submitted ?? 0) : '—', color:'#8b5cf6', trend:'assignments' },
    { icon:'🔖', label:'To Grade',       value: hasAssignment ? (submissions?.ungraded ?? 0) : '—',  color:'#ec4899', trend:'pending review' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📊 Dashboard</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchDashboard(); }}>
          <Text style={{ color:'#8b5cf6', fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} tintColor="#8b5cf6" />}
      >
        {/* Welcome Banner */}
        <View style={s.banner}>
          <Text style={{ color:'rgba(0,212,170,0.7)', fontSize:12, fontWeight:'700', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
            {greeting}
          </Text>
          <Text style={{ color:'#fff', fontSize:22, fontWeight:'800', marginBottom:4 }}>
            Welcome back, {firstName}! 🚀
          </Text>
          <Text style={{ color:'rgba(0,212,170,0.6)', fontSize:12, marginBottom:16 }}>{todayStr}</Text>
          <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>
            Your students are counting on you. Let's make today count!
          </Text>

          {/* Inline quick stats */}
          {!loading && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:10, flexDirection:'row', marginTop:16 }}>
              {[
                { label:'Total Students', value: totalStudents ?? 0,         color:'#00d4aa' },
                { label:'Present Today',  value: attendance?.present ?? '—', color:'#6ee7b7' },
                { label:'Absent Today',   value: attendance?.absent ?? '—',  color:'#fca5a5' },
                { label:'Attendance',     value: `${attendancePct}%`,        color:'#fde68a' },
              ].map((s,i) => (
                <View key={i} style={{ backgroundColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:12, minWidth:100, alignItems:'center' }}>
                  <Text style={{ color: s.color, fontSize:22, fontWeight:'800' }}>{s.value}</Text>
                  <Text style={{ color:'#c4b5fd', fontSize:10, marginTop:4, textAlign:'center' }}>{s.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ padding:16, gap:16 }}>
          {/* Tip of the Day */}
          <View style={{ backgroundColor:'#1c1a0a', borderWidth:1, borderColor:'#854d0e', borderRadius:12, padding:14, flexDirection:'row', alignItems:'center', gap:12 }}>
            <Text style={{ fontSize:22 }}>💡</Text>
            <View style={{ flex:1 }}>
              <Text style={{ color:'#fbbf24', fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Tip of the Day</Text>
              <Text style={{ color:'#fde68a', fontSize:13, lineHeight:18 }}>{tip}</Text>
            </View>
          </View>

          {/* Stat Cards */}
          {loading ? <ActivityIndicator color="#8b5cf6" style={{ padding:20 }} /> : (
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
              {STAT_CARDS.map((c, i) => (
                <View key={i} style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border, width:'47%' }]}>
                  <View style={{ width:38, height:38, borderRadius:10, backgroundColor: c.color + '20', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                    <Text style={{ fontSize:18 }}>{c.icon}</Text>
                  </View>
                  <Text style={{ color: c.color, fontSize:26, fontWeight:'800', lineHeight:28 }}>{c.value}</Text>
                  <Text style={{ color: theme.textMuted, fontSize:12, fontWeight:'600', marginTop:2 }}>{c.label}</Text>
                  <View style={{ backgroundColor: c.color + '20', borderRadius:10, paddingHorizontal:8, paddingVertical:2, marginTop:6, alignSelf:'flex-start' }}>
                    <Text style={{ color: c.color, fontSize:10, fontWeight:'600' }}>{c.trend}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View>
            <Text style={{ color: theme.textPrimary, fontSize:16, fontWeight:'700', marginBottom:12 }}>⚡ Quick Actions</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
              {QUICK_ACTIONS.map((a, i) => (
                <TouchableOpacity key={i} style={[s.actionCard, { backgroundColor: theme.cardBg, borderColor: theme.border, width:'30%' }]} onPress={() => navigation.navigate(a.screen)}>
                  <View style={{ width:44, height:44, borderRadius:12, backgroundColor: a.color + '20', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                    <Text style={{ fontSize:22 }}>{a.icon}</Text>
                  </View>
                  <Text style={{ color: a.color, fontSize:11, fontWeight:'600', textAlign:'center' }}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Today's Assignment Status */}
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.textPrimary, fontSize:15, fontWeight:'700', marginBottom:14 }}>📋 Today's Assignment Status</Text>
            {loading ? <ActivityIndicator color="#8b5cf6" /> :
            !hasAssignment ? (
              <View style={{ alignItems:'center', paddingVertical:20, gap:8 }}>
                <Text style={{ fontSize:36 }}>📭</Text>
                <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'600' }}>No assignment for today</Text>
                <Text style={{ color: theme.textMuted, fontSize:12, textAlign:'center' }}>Create one from the Admin panel</Text>
              </View>
            ) : (
              <View style={{ flexDirection:'row', gap:10 }}>
                {[
                  { label:'Submitted', value: submissions?.submitted ?? 0, color:'#8b5cf6', icon:'📤' },
                  { label:'Pending',   value: submissions?.pending   ?? 0, color:'#f59e0b', icon:'📭' },
                  { label:'Ungraded',  value: submissions?.ungraded  ?? 0, color:'#ef4444', icon:'🔖' },
                ].map((s,i) => (
                  <View key={i} style={{ flex:1, backgroundColor: s.color + '15', borderRadius:12, padding:14, alignItems:'center', gap:4 }}>
                    <Text style={{ fontSize:24 }}>{s.icon}</Text>
                    <Text style={{ color: s.color, fontSize:24, fontWeight:'800' }}>{s.value}</Text>
                    <Text style={{ color: theme.textMuted, fontSize:11, fontWeight:'600' }}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  banner:     { backgroundColor:'#061a14', padding:20 },
  statCard:   { borderRadius:14, padding:14, borderWidth:1 },
  actionCard: { borderRadius:14, padding:12, borderWidth:1, alignItems:'center' },
  card:       { borderRadius:16, padding:16, borderWidth:1 },
});
