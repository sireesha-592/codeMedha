import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
};
const fmtDuration = (mins) => {
  if (mins == null || mins <= 0) return '—';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins/60)}h ${mins%60}m`;
};
const roleColor = (r) => ({ student:'#10b981', trainer:'#8b5cf6', teacher:'#8b5cf6' }[r] || '#64748b');
const roleLabel = (r) => ({ student:'Trainee', trainer:'Trainer', teacher:'Trainer' }[r] || r);

export default function AdminLoginTrackerScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [view,       setView]       = useState('summary');
  const [summary,    setSummary]    = useState([]);
  const [sessions,   setSessions]   = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => { loadSummary(); loadUsers(); }, []);
  useEffect(() => { if (view === 'detail') loadSessions(); }, [view]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/api/sessions/summary`, { headers });
      setSummary(res.data || []);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  };

  const loadUsers = async () => {
    try {
      const res = await api.get(`${API}/api/sessions/users`, { headers });
      setUsers(res.data || []);
    } catch(e) {}
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = filterRole ? `?role=${filterRole}` : '';
      const res = await api.get(`${API}/api/sessions/all${params}`, { headers });
      setSessions(res.data || []);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  };

  const totalOnline   = summary.filter(s => s.currentlyOnline).length;
  const totalTrainers = summary.filter(s => ['trainer','teacher'].includes(s.user?.role)).length;
  const totalTrainees = summary.filter(s => s.user?.role === 'student').length;

  const filteredSummary = filterRole
    ? summary.filter(s => filterRole === 'trainer' ? ['trainer','teacher'].includes(s.user?.role) : s.user?.role === filterRole)
    : summary;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>🕐 Login Tracker</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); view === 'summary' ? loadSummary() : loadSessions(); }}>
          <Text style={{ color: theme.accent, fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* View Tabs */}
      <View style={{ flexDirection:'row', backgroundColor: theme.sidebarBg, borderBottomWidth:1, borderBottomColor: theme.border }}>
        {[{key:'summary', label:'👥 User Summary'}, {key:'detail', label:'📋 Session Log'}].map(t => (
          <TouchableOpacity key={t.key}
            style={{ flex:1, paddingVertical:12, alignItems:'center', borderBottomWidth:2, borderBottomColor: view === t.key ? theme.accent : 'transparent' }}
            onPress={() => setView(t.key)}>
            <Text style={{ color: view === t.key ? theme.accent : theme.textMuted, fontWeight:'600', fontSize:13 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding:16, gap:12, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); view === 'summary' ? loadSummary() : loadSessions(); }} tintColor={theme.accent} />}
      >
        {/* Stats */}
        <View style={{ flexDirection:'row', gap:10 }}>
          {[
            { label:'🟢 Online', value: totalOnline,   color:'#10b981' },
            { label:'👥 Trainees', value: totalTrainees, color:'#6366f1' },
            { label:'🎓 Trainers', value: totalTrainers, color:'#8b5cf6' },
            { label:'📊 Total',   value: summary.length, color: theme.accent },
          ].map((item,i) => (
            <View key={i} style={{ flex:1, backgroundColor: item.color + '15', borderRadius:10, padding:8, alignItems:'center', borderWidth:1, borderColor: item.color + '30' }}>
              <Text style={{ color: item.color, fontSize:18, fontWeight:'800' }}>{item.value}</Text>
              <Text style={{ color: item.color, fontSize:9, fontWeight:'600', textAlign:'center' }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Role Filter */}
        <View style={{ flexDirection:'row', gap:8 }}>
          {[{key:'', label:'All'}, {key:'student', label:'Trainees'}, {key:'trainer', label:'Trainers'}].map(f => (
            <TouchableOpacity key={f.key}
              style={{ paddingHorizontal:14, paddingVertical:7, borderRadius:20, backgroundColor: filterRole === f.key ? theme.accent : theme.cardBg, borderWidth:1, borderColor: filterRole === f.key ? theme.accent : theme.border }}
              onPress={() => setFilterRole(f.key)}>
              <Text style={{ color: filterRole === f.key ? '#000' : theme.textMuted, fontWeight:'600', fontSize:12 }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={theme.accent} style={{ padding:20 }} /> :

        view === 'summary' ? (
          filteredSummary.length === 0 ? (
            <View style={{ alignItems:'center', padding:40, gap:8 }}>
              <Text style={{ fontSize:32 }}>📭</Text>
              <Text style={{ color: theme.textMuted }}>No session data available</Text>
            </View>
          ) : filteredSummary.map((item, i) => {
            const u = item.user || {};
            const rc = roleColor(u.role);
            return (
              <View key={i} style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftWidth:3, borderLeftColor: item.currentlyOnline ? '#10b981' : rc }]}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:8 }}>
                  <View style={{ width:40, height:40, borderRadius:20, backgroundColor: rc + '20', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color: rc, fontWeight:'800', fontSize:16 }}>{(u.name || 'U').charAt(0)}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:13 }}>{u.name || '—'}</Text>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>{u.email || ''}</Text>
                  </View>
                  <View style={{ gap:4, alignItems:'flex-end' }}>
                    <View style={{ backgroundColor: item.currentlyOnline ? '#10b98120' : '#64748b20', borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
                      <Text style={{ color: item.currentlyOnline ? '#10b981' : '#64748b', fontSize:11, fontWeight:'700' }}>
                        {item.currentlyOnline ? '🟢 Online' : '⚫ Offline'}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: rc + '20', borderRadius:8, paddingHorizontal:8, paddingVertical:2 }}>
                      <Text style={{ color: rc, fontSize:10, fontWeight:'700' }}>{roleLabel(u.role)}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection:'row', gap:16, flexWrap:'wrap' }}>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>🔑 {item.totalSessions || 0} sessions</Text>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>⏱ {fmtDuration(item.totalDuration)}</Text>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>📅 Last: {fmtDateTime(item.lastLogin)}</Text>
                </View>
              </View>
            );
          })
        ) : (
          sessions.length === 0 ? (
            <View style={{ alignItems:'center', padding:40, gap:8 }}>
              <Text style={{ fontSize:32 }}>📭</Text>
              <Text style={{ color: theme.textMuted }}>No session logs found</Text>
            </View>
          ) : sessions.map((item, i) => {
            const u = item.userId || {};
            const rc = roleColor(u.role);
            return (
              <View key={i} style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:6 }}>
                  <View style={{ width:32, height:32, borderRadius:16, backgroundColor: rc + '20', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color: rc, fontWeight:'800', fontSize:13 }}>{(u.name || 'U').charAt(0)}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color: theme.textPrimary, fontWeight:'600', fontSize:13 }}>{u.name || '—'}</Text>
                    <Text style={{ color: theme.textMuted, fontSize:10 }}>{u.email || ''}</Text>
                  </View>
                  <View style={{ backgroundColor: rc + '20', borderRadius:8, paddingHorizontal:8, paddingVertical:2 }}>
                    <Text style={{ color: rc, fontSize:10, fontWeight:'700' }}>{roleLabel(u.role)}</Text>
                  </View>
                </View>
                <View style={{ flexDirection:'row', gap:12, flexWrap:'wrap' }}>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>🔑 Login: {fmtDateTime(item.loginAt)}</Text>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>🚪 Logout: {fmtDateTime(item.logoutAt)}</Text>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>⏱ {fmtDuration(item.durationMinutes)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:       { borderRadius:12, padding:14, borderWidth:1 },
});
