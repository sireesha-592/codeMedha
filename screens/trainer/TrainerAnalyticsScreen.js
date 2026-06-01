// src/screens/trainer/TrainerAnalyticsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerAnalyticsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [data, setData] = useState({ students:[], avgAttendance:0, avgScore:0, totalSubmissions:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`${API}/api/trainer/analytics`, { headers: { Authorization:`Bearer ${token}` } })
      .then(res => setData(res.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#8b5cf6" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={{ paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border, backgroundColor:theme.sidebarBg }}>
        <Text style={[{ fontSize:17, fontWeight:'700', color:theme.textPrimary }]}>📊 Analytics</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:16, paddingBottom:32 }}>
        <View style={{ flexDirection:'row', gap:10 }}>
          {[
            { label:'Avg Attendance', value:`${Math.round(data.avgAttendance||0)}%`, color:'#8b5cf6' },
            { label:'Avg Score',      value:`${Math.round(data.avgScore||0)}`,        color:theme.accent },
            { label:'Total Submissions', value:data.totalSubmissions||0,              color:theme.accentOrange },
          ].map((st,i) => (
            <View key={i} style={[{ flex:1, borderRadius:14, padding:14, borderWidth:1, alignItems:'center' }, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
              <Text style={[{ color:st.color, fontSize:22, fontWeight:'800' }]}>{st.value}</Text>
              <Text style={[{ color:theme.textMuted, fontSize:10, marginTop:3, textAlign:'center' }]}>{st.label}</Text>
            </View>
          ))}
        </View>
        <View style={[{ borderRadius:14, padding:16, borderWidth:1, gap:10 }, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
          <Text style={[{ color:theme.textSecondary, fontSize:13, fontWeight:'600', marginBottom:4 }]}>Student Performance</Text>
          {(data.students||[]).slice(0,8).map((s,i) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:12, paddingVertical:6 }}>
              <Text style={[{ color:theme.textMuted, width:24, fontSize:12 }]}>#{i+1}</Text>
              <Text style={[{ flex:1, color:theme.textPrimary, fontSize:13, fontWeight:'500' }]}>{s.name}</Text>
              <Text style={[{ color:'#8b5cf6', fontSize:12, fontWeight:'600' }]}>{Math.round(s.attendancePercentage||0)}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
