import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function WeeklyReportScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  useEffect(() => { fetchReport(); }, []);

  const fetchReport = async () => {
    try {
      const { data } = await api.get(API + '/api/weekly-report', {
        headers: { Authorization: 'Bearer ' + token },
      });
      setReport(data);
    } catch(e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const STATUS_COLOR = {
    present:  '#1D9E75',
    absent:   '#ef4444',
    no_data:  '#334155',
    no_class: '#1e293b',
  };

  const STATUS_ICON = {
    present:  '✓',
    absent:   '✗',
    no_data:  '–',
    no_class: 'off',
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📅 Weekly Report</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchReport(); }}>
          <Text style={{ color: theme.accent, fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : !report ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:8 }}>
          <Text style={{ fontSize:32 }}>📊</Text>
          <Text style={{ color: theme.textMuted }}>No report data available</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReport(); }} tintColor={theme.accent} />}
        >
          {/* Period */}
          <Text style={{ color: theme.textMuted, fontSize:12 }}>
            {report.period?.from} — {report.period?.to}
          </Text>

          {/* Summary Cards */}
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📋 This Week Summary</Text>
            <View style={{ flexDirection:'row', gap:10, marginTop:12 }}>
              {[
                { label:'Days Present',  value: report.attendance?.present || 0,   color:'#1D9E75' },
                { label:'Days Absent',   value: report.attendance?.absent || 0,    color:'#ef4444' },
                { label:'Assignments',   value: report.assignments?.submitted || 0, color:'#7c6af5' },
                { label:'Score Avg',     value: report.assignments?.avgScore || 0,  color:'#f5a623' },
              ].map((st, i) => (
                <View key={i} style={[s.statBox, { backgroundColor: theme.pageBg, borderColor: theme.border }]}>
                  <Text style={{ color: st.color, fontSize:22, fontWeight:'800' }}>{st.value}</Text>
                  <Text style={{ color: theme.textMuted, fontSize:10, textAlign:'center', marginTop:2 }}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Day by Day */}
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📆 Day-by-Day</Text>
            <View style={{ flexDirection:'row', gap:6, marginTop:12, justifyContent:'center' }}>
              {(report.attendance?.days || []).map((day, i) => (
                <View key={i} style={{ alignItems:'center', gap:4 }}>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>{day.day}</Text>
                  <View style={[s.dayDot, { backgroundColor: STATUS_COLOR[day.status] || '#334155' }]}>
                    <Text style={{ color:'#fff', fontSize:10, fontWeight:'700' }}>
                      {STATUS_ICON[day.status] || '–'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ flexDirection:'row', justifyContent:'center', gap:16, marginTop:12 }}>
              {[
                { color:'#1D9E75', label:'Present' },
                { color:'#ef4444', label:'Absent' },
                { color:'#7c6af5', label:'Assignment' },
              ].map((l,i) => (
                <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <View style={{ width:8, height:8, borderRadius:4, backgroundColor: l.color }} />
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Weekly Trend */}
          {report.trend && report.trend.length > 0 && (
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📈 4-Week Trend</Text>
              <View style={{ gap:10, marginTop:12 }}>
                {report.trend.map((w, i) => (
                  <View key={i} style={{ gap:4 }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                      <Text style={{ color: theme.textPrimary, fontSize:13 }}>{w.week}</Text>
                      <Text style={{ color: theme.accent, fontSize:13, fontWeight:'700' }}>{w.pct}%</Text>
                    </View>
                    <View style={{ height:6, backgroundColor: theme.border, borderRadius:4 }}>
                      <View style={{ height:6, borderRadius:4, backgroundColor: theme.accent, width: w.pct + '%' }} />
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>{w.present} present / {w.total} days</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Assignments */}
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>📝 Assignments</Text>
            <View style={{ flexDirection:'row', gap:10, marginTop:12 }}>
              {[
                { label:'Submitted', value: report.assignments?.submitted || 0, color:'#1D9E75' },
                { label:'Pending',   value: report.assignments?.pending   || 0, color:'#f5a623' },
                { label:'Total',     value: report.assignments?.total     || 0, color: theme.accent },
              ].map((st,i) => (
                <View key={i} style={[s.statBox, { backgroundColor: theme.pageBg, borderColor: theme.border, flex:1 }]}>
                  <Text style={{ color: st.color, fontSize:24, fontWeight:'800' }}>{st.value}</Text>
                  <Text style={{ color: theme.textMuted, fontSize:11, marginTop:2 }}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:      { borderRadius:16, padding:16, borderWidth:1 },
  cardTitle: { fontSize:14, fontWeight:'700' },
  statBox:   { flex:1, borderRadius:12, padding:12, borderWidth:1, alignItems:'center' },
  dayDot:    { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
});
