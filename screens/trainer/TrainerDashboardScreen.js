// src/screens/trainer/TrainerDashboardScreen.js
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
  const [stats, setStats]     = useState({ students:0, todayPresent:0, pendingReview:0, totalClasses:0 });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [studRes, attRes] = await Promise.allSettled([
        api.get(`${API}/api/trainer/students`, { headers: h }),
        api.get(`${API}/api/trainer/today-attendance`, { headers: h }),
      ]);
      const studs = studRes.status === 'fulfilled' ? (studRes.value.data || []) : [];
      const att   = attRes.status === 'fulfilled'  ? (attRes.value.data || {}) : {};
      setStudents(studs);
      setStats({
        students:     studs.length,
        todayPresent: att.presentCount || 0,
        pendingReview: att.pendingAssignments || 0,
        totalClasses: att.totalClasses || 0,
      });
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#8b5cf6" size="large" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[td.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Text style={{ fontSize:20 }}>☰</Text></TouchableOpacity>
        <Text style={[td.headerTitle, { color:theme.textPrimary }]}>Trainer Panel</Text>
        <View style={{ width:32 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:16, paddingBottom:32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#8b5cf6" />}
      >
        {/* Welcome */}
        <View style={[td.banner, { backgroundColor:'#1a1a2e' }]}>
          <Text style={[{ color:'#fff', fontSize:20, fontWeight:'800' }]}>Hello, {user?.name?.split(' ')[0]} 👨‍💻</Text>
          <Text style={[{ color:'#8b5cf6', fontSize:13, marginTop:4 }]}>Manage your students & classes</Text>
        </View>

        {/* Stats */}
        <View style={td.statsGrid}>
          {[
            { label:'Total Students', value:stats.students,     icon:'👥', color:'#8b5cf6' },
            { label:'Present Today',  value:stats.todayPresent, icon:'✅', color:theme.accent },
            { label:'Pending Review', value:stats.pendingReview,icon:'📝', color:theme.accentOrange },
            { label:'Total Classes',  value:stats.totalClasses, icon:'🎓', color:'#8b5cf6' },
          ].map((st,i) => (
            <View key={i} style={[td.statCard, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
              <Text style={{ fontSize:24 }}>{st.icon}</Text>
              <Text style={[{ color:st.color, fontSize:22, fontWeight:'800', marginTop:6 }]}>{st.value}</Text>
              <Text style={[{ color:theme.textMuted, fontSize:10, marginTop:2 }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent students */}
        <View style={[td.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
          <Text style={[td.cardTitle, { color:theme.textSecondary }]}>👥 Recent Students</Text>
          {students.slice(0,5).map((s,i) => (
            <View key={s._id||i} style={[td.studentRow, { borderBottomColor:theme.border }]}>
              <View style={[td.avatar, { backgroundColor:'#8b5cf622' }]}>
                <Text style={[{ color:'#8b5cf6', fontWeight:'700' }]}>{(s.name||'?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={[{ color:theme.textPrimary, fontSize:13, fontWeight:'600' }]}>{s.name}</Text>
                <Text style={[{ color:theme.textMuted, fontSize:11, marginTop:1 }]}>{s.email}</Text>
              </View>
              <View style={[td.statusBadge, { backgroundColor:theme.accent+'22' }]}>
                <Text style={[{ color:theme.accent, fontSize:10, fontWeight:'600' }]}>Active</Text>
              </View>
            </View>
          ))}
          {students.length === 0 && <Text style={[{ color:theme.textMuted, textAlign:'center', padding:16 }]}>No students yet</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const td = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  banner:      { borderRadius:16, padding:20 },
  statsGrid:   { flexDirection:'row', flexWrap:'wrap', gap:10 },
  statCard:    { width:'47%', borderRadius:14, padding:16, borderWidth:1, alignItems:'center' },
  card:        { borderRadius:14, padding:16, borderWidth:1, gap:6 },
  cardTitle:   { fontSize:13, fontWeight:'600', marginBottom:6 },
  studentRow:  { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1 },
  avatar:      { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  statusBadge: { borderRadius:20, paddingHorizontal:8, paddingVertical:3 },
});
