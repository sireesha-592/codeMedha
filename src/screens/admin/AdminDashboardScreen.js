import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminDashboardScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [stats,      setStats]      = useState({ students:0, trainers:0, onlineNow:0 });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get(`${API}/api/auth/admin-stats`, { headers });
      setStats({ students: res.data.students||0, trainers: res.data.trainers||0, onlineNow: res.data.onlineNow||0 });
    } catch(e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? '🌅 Good Morning' : hour < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening';
  const todayStr = now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const STAT_CARDS = [
    { icon:'👥', label:'Total Students', value: stats.students,  color:'#6366f1' },
    { icon:'👨‍💻', label:'Total Trainers', value: stats.trainers,  color:'#8b5cf6' },
    { icon:'🟢', label:'Online Now',     value: stats.onlineNow, color:'#10b981' },
  ];

  const QUICK_ACTIONS = [
    { label:'📝 Add Questions',      color:'#6366f1', screen:'Questions' },
    { label:'📋 View Attendance',    color:'#10b981', screen:'Attendance' },
    { label:'📬 Check Submissions',  color:'#f59e0b', screen:'Submissions' },
    { label:'📊 Reports',            color:'#8b5cf6', screen:'Reports' },
    { label:'🕐 Login Tracker',      color:'#06b6d4', screen:'LoginTracker' },
    { label:'🎬 Upload Video',       color:'#ef4444', screen:'VideoUpload' },
    { label:'🎓 Course Info',        color:'#f59e0b', screen:'Courses' },
    { label:'⭐ Daily Feedback',     color:'#ec4899', screen:'Feedback' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>👑 Admin Panel</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchStats(); }}>
          <Text style={{ color:'#6366f1', fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#6366f1" />}
      >
        {/* Welcome Banner */}
        <View style={s.banner}>
          <Text style={{ color:'#94a3b8', fontSize:12, fontWeight:'700', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
            {greeting}
          </Text>
          <Text style={{ color:'#fff', fontSize:22, fontWeight:'900', marginBottom:4 }}>
            Welcome back, <Text style={{ color:'#818cf8' }}>{user?.name || 'Admin'}</Text> 👑
          </Text>
          <Text style={{ color:'#64748b', fontSize:12 }}>{todayStr}</Text>
          <Text style={{ color:'#64748b', fontSize:12, marginTop:4 }}>
            Here's what's happening at CodeMedha today
          </Text>
        </View>

        <View style={{ padding:16, gap:16 }}>
          {/* Stat Cards */}
          {loading ? <ActivityIndicator color="#6366f1" style={{ padding:20 }} /> : (
            <View style={{ gap:12 }}>
              {STAT_CARDS.map((c, i) => (
                <View key={i} style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <View style={{ width:52, height:52, borderRadius:14, backgroundColor: c.color + '20', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:26 }}>{c.icon}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color: c.color, fontSize:30, fontWeight:'900', lineHeight:32 }}>{c.value}</Text>
                    <Text style={{ color: theme.textMuted, fontSize:13, fontWeight:'600', marginTop:2 }}>{c.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.textPrimary, fontSize:16, fontWeight:'800', marginBottom:14 }}>⚡ Quick Actions</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
              {QUICK_ACTIONS.map((a, i) => (
                <TouchableOpacity key={i}
                  style={{ backgroundColor: a.color + '20', borderWidth:1, borderColor: a.color + '40', borderRadius:10, paddingHorizontal:14, paddingVertical:10 }}
                  onPress={() => navigation.navigate(a.screen)}
                >
                  <Text style={{ color: a.color, fontWeight:'700', fontSize:13 }}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 },
  headerTitle:{ fontSize:18, fontWeight:'800' },
  banner:     { backgroundColor:'#1e3a5f', padding:20, borderBottomWidth:1, borderBottomColor:'#2a2a5e' },
  statCard:   { flexDirection:'row', alignItems:'center', gap:16, borderRadius:16, padding:20, borderWidth:1 },
  card:       { borderRadius:16, padding:16, borderWidth:1 },
});
