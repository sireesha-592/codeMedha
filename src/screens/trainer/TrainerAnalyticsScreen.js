import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerAnalyticsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [students,   setStudents]   = useState([]);
  const [todayData,  setTodayData]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [studRes, dashRes, attRes] = await Promise.allSettled([
        api.get(`${API}/api/trainer/students`, { headers }),
        api.get(`${API}/api/trainer/dashboard`, { headers }),
        api.get(`${API}/api/trainer/submissions`, { headers }),
      ]);
      if (studRes.status === 'fulfilled') setStudents(studRes.value.data || []);
      if (dashRes.status === 'fulfilled') setTodayData(dashRes.value.data);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  };

  // Today's stats from dashboard
  const presentToday  = todayData?.attendance?.present  || 0;
  const absentToday   = todayData?.attendance?.absent   || 0;
  const totalStudents = todayData?.totalStudents        || 0;
  const totalSubs     = todayData?.submissions?.submitted || 0;
  const pendingSubs   = todayData?.submissions?.pending   || 0;

  const attColor = (pct) => pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📈 Analytics</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchData(); }}>
          <Text style={{ color:'#8b5cf6', fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#8b5cf6" />}
        >
          {/* Today's Summary */}
          {todayData && (
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700', marginBottom:12 }}>📅 Today's Summary</Text>
              <View style={{ flexDirection:'row', gap:10 }}>
                {[
                  { label:'Present',  value: presentToday, color:'#10b981' },
                  { label:'Absent',   value: absentToday,  color:'#ef4444' },
                  { label:'Submitted',value: totalSubs,    color:'#8b5cf6' },
                ].map((item,i) => (
                  <View key={i} style={{ flex:1, backgroundColor: item.color + '15', borderRadius:12, padding:12, alignItems:'center', borderWidth:1, borderColor: item.color + '30' }}>
                    <Text style={{ color: item.color, fontSize:24, fontWeight:'800' }}>{item.value}</Text>
                    <Text style={{ color: item.color, fontSize:11, fontWeight:'600', marginTop:2 }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Overall Stats */}
          <View style={{ flexDirection:'row', gap:10 }}>
            {[
              { label:'Avg Attendance', value: totalStudents > 0 ? `${Math.round((presentToday/totalStudents)*100)}%` : '0%', color:'#6366f1' },
              { label:'Pending Subs',   value: pendingSubs,  color:'#f59e0b' },
              { label:'Submitted',      value: totalSubs,    color:'#10b981' },
            ].map((item,i) => (
              <View key={i} style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={{ color: item.color, fontSize:22, fontWeight:'800' }}>{item.value}</Text>
                <Text style={{ color: theme.textMuted, fontSize:10, textAlign:'center', marginTop:4 }}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Student Performance */}
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700', marginBottom:12 }}>👥 Student Performance</Text>
            {students.length === 0 ? (
              <Text style={{ color: theme.textMuted, textAlign:'center', padding:20 }}>No students enrolled</Text>
            ) : students.map((st, i) => {
              const pct = st.attendancePercentage || 0;
              const color = attColor(pct);
              return (
                <View key={st._id} style={{ flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth: i < students.length-1 ? 1 : 0, borderBottomColor: theme.border, gap:12 }}>
                  <View style={{ width:36, height:36, borderRadius:18, backgroundColor:'#8b5cf620', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color:'#8b5cf6', fontWeight:'800' }}>{st.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color: theme.textPrimary, fontWeight:'600', fontSize:13 }}>{st.name}</Text>
                    {/* Attendance bar */}
                    <View style={{ height:4, backgroundColor: theme.border, borderRadius:2, marginTop:4 }}>
                      <View style={{ height:4, borderRadius:2, backgroundColor: color, width: `${Math.min(pct,100)}%` }} />
                    </View>
                  </View>
                  <View style={{ alignItems:'flex-end', gap:3 }}>
                    <Text style={{ color, fontWeight:'700', fontSize:12 }}>{pct}%</Text>
                    <Text style={{ color: theme.textMuted, fontSize:10 }}>{st.submittedCount || 0} subs</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:       { borderRadius:14, padding:16, borderWidth:1 },
  statCard:   { flex:1, borderRadius:14, padding:14, borderWidth:1, alignItems:'center' },
});
