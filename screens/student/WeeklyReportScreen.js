// src/screens/student/WeeklyReportScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function WeeklyReportScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`${API}/api/attendance/weekly-report`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setReport(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color={theme.accent} size="large" /></View>;

  const days = report?.days || [];
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[wr.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Text style={{ fontSize:20 }}>☰</Text></TouchableOpacity>
        <Text style={[wr.headerTitle, { color:theme.textPrimary }]}>Weekly Report</Text>
        <View style={{ width:32 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:16, paddingBottom:32 }}>
        {/* Summary */}
        <View style={[wr.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
          <Text style={[wr.cardTitle, { color:theme.textSecondary }]}>📋 This Week Summary</Text>
          <View style={wr.row}>
            {[
              { label:'Days Present', value: report?.present || 0, color:theme.accent },
              { label:'Days Absent',  value: report?.absent  || 0, color:theme.accentRed },
              { label:'Assignments',  value: report?.assignments || 0, color:theme.accentPurple },
              { label:'Score Avg',    value: `${report?.avgScore || 0}`, color:theme.accentOrange },
            ].map((s,i) => (
              <View key={i} style={[wr.miniStat, { backgroundColor:theme.inputBg }]}>
                <Text style={[{ color:s.color, fontSize:20, fontWeight:'800' }]}>{s.value}</Text>
                <Text style={[{ color:theme.textMuted, fontSize:9 }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Day-by-day */}
        <View style={[wr.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
          <Text style={[wr.cardTitle, { color:theme.textSecondary }]}>📅 Day-by-Day</Text>
          <View style={wr.daysRow}>
            {dayNames.map((d, i) => {
              const dayData = days[i] || {};
              const status  = dayData.attendance;
              return (
                <View key={i} style={wr.dayCol}>
                  <Text style={[{ color:theme.textMuted, fontSize:10, marginBottom:4 }]}>{d}</Text>
                  <View style={[wr.dayDot, {
                    backgroundColor: status === 'present' ? theme.accent : status === 'absent' ? theme.accentRed : theme.border,
                  }]}>
                    <Text style={{ fontSize:10, color: status ? '#fff' : theme.textMuted }}>
                      {status === 'present' ? '✓' : status === 'absent' ? '✗' : '—'}
                    </Text>
                  </View>
                  {dayData.assignment && <View style={[wr.assignDot, { backgroundColor:theme.accentPurple }]} />}
                </View>
              );
            })}
          </View>
          <View style={wr.legend}>
            {[{c:theme.accent,l:'Present'},{c:theme.accentRed,l:'Absent'},{c:theme.accentPurple,l:'Assignment'}].map((it,i)=>(
              <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:it.c }} />
                <Text style={[{ color:theme.textMuted, fontSize:10 }]}>{it.l}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const wr = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  card: { borderRadius:14, padding:16, borderWidth:1, gap:14 },
  cardTitle: { fontSize:13, fontWeight:'600' },
  row: { flexDirection:'row', gap:8 },
  miniStat: { flex:1, borderRadius:10, padding:10, alignItems:'center', gap:3 },
  daysRow: { flexDirection:'row', justifyContent:'space-between' },
  dayCol: { alignItems:'center', gap:6 },
  dayDot: { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  assignDot: { width:8, height:8, borderRadius:4 },
  legend: { flexDirection:'row', gap:16, justifyContent:'center' },
});
