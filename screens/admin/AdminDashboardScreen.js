// src/screens/admin/AdminDashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminDashboardScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats]     = useState({ totalStudents:0, totalTrainers:0, totalCourses:0, todayActive:0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get(`${API}/api/admin/stats`, { headers: { Authorization:`Bearer ${token}` } });
      setStats(res.data || stats);
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#c77dff" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={{ paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border, backgroundColor:theme.sidebarBg }}>
        <Text style={[{ fontSize:17, fontWeight:'700', color:theme.textPrimary }]}>👑 Admin Panel</Text>
        <Text style={[{ fontSize:12, color:theme.textMuted, marginTop:2 }]}>Welcome, {user?.name}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:16, paddingBottom:32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#c77dff" />}
      >
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:12 }}>
          {[
            { label:'Total Students', value:stats.totalStudents, icon:'🎓', color:'#c77dff' },
            { label:'Trainers',       value:stats.totalTrainers, icon:'👨‍💻', color:'#8b5cf6' },
            { label:'Courses',        value:stats.totalCourses,  icon:'📚', color:theme.accent },
            { label:'Active Today',   value:stats.todayActive,   icon:'✅', color:'#10b981' },
          ].map((st,i) => (
            <View key={i} style={[{ width:'47%', borderRadius:16, padding:16, borderWidth:1, alignItems:'center', gap:8 }, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
              <Text style={{ fontSize:28 }}>{st.icon}</Text>
              <Text style={[{ color:st.color, fontSize:24, fontWeight:'800' }]}>{st.value}</Text>
              <Text style={[{ color:theme.textMuted, fontSize:11 }]}>{st.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
