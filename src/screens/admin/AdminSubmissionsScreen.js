import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminSubmissionsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [subs,       setSubs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');

  useEffect(() => { fetchSubmissions(); }, [date]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/api/submissions/all?date=${date}`, { headers });
      setSubs(Array.isArray(res.data) ? res.data : []);
    } catch(e) {}
    setLoading(false);
    setRefreshing(false);
  };

  const filtered = subs.filter(s => {
    if (filter === 'submitted') return s.status === 'submitted';
    if (filter === 'pending')   return s.status !== 'submitted';
    return true;
  });

  const submitted = subs.filter(s => s.status === 'submitted').length;
  const pending   = subs.filter(s => s.status !== 'submitted').length;

  const FILTERS = [
    { key:'all',       label:`All (${subs.length})`,        color: theme.accent },
    { key:'submitted', label:`Submitted (${submitted})`,     color:'#10b981' },
    { key:'pending',   label:`Pending (${pending})`,         color:'#f59e0b' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.accent, fontSize:15 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📬 Submissions</Text>
        <View style={{ width:60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubmissions(); }} tintColor={theme.accent} />}
      >
        {/* Date */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}>
          <Text style={{ color: theme.textPrimary, fontWeight:'700' }}>📅 {date}</Text>
          <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity style={s.dateBtn} onPress={() => {
              const d = new Date(date); d.setDate(d.getDate()-1);
              setDate(d.toISOString().split('T')[0]);
            }}>
              <Text style={{ color: theme.accent }}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dateBtn} onPress={() => {
              const d = new Date(date); d.setDate(d.getDate()+1);
              setDate(d.toISOString().split('T')[0]);
            }}>
              <Text style={{ color: theme.accent }}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection:'row', gap:8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key}
              style={{ flex:1, paddingVertical:8, borderRadius:10, backgroundColor: filter === f.key ? f.color : theme.cardBg, borderWidth:1, borderColor: filter === f.key ? f.color : theme.border, alignItems:'center' }}
              onPress={() => setFilter(f.key)}>
              <Text style={{ color: filter === f.key ? '#fff' : theme.textMuted, fontWeight:'600', fontSize:12 }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {loading ? <ActivityIndicator color={theme.accent} style={{ padding:20 }} /> :
        filtered.length === 0 ? (
          <View style={{ alignItems:'center', padding:40 }}>
            <Text style={{ fontSize:32 }}>📭</Text>
            <Text style={{ color: theme.textMuted, marginTop:8 }}>No submissions for {date}</Text>
          </View>
        ) : filtered.map((sub, i) => {
          const isSubmitted = sub.status === 'submitted';
          const totalScore = (sub.secA?.score||0) + (sub.secB?.score||0) + (sub.secC?.score||0);
          const answered = (sub.secA?.answered||0) + (sub.secB?.answered||0) + (sub.secC?.answered||0);
          const total = (sub.secA?.total||20) + (sub.secB?.total||20) + (sub.secC?.total||10);
          return (
            <View key={i} style={[s.subCard, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: isSubmitted ? '#10b981' : '#f59e0b' }]}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <View>
                  <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:13 }}>
                    {sub.traineeId?.name || sub.studentName || 'Student'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>{sub.traineeId?.email || ''}</Text>
                </View>
                <View style={{ backgroundColor: isSubmitted ? '#10b98120' : '#f59e0b20', borderRadius:8, paddingHorizontal:10, paddingVertical:4 }}>
                  <Text style={{ color: isSubmitted ? '#10b981' : '#f59e0b', fontWeight:'700', fontSize:11 }}>
                    {isSubmitted ? '✅ Submitted' : '⏳ Pending'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', gap:12 }}>
                <Text style={{ color: theme.textMuted, fontSize:12 }}>Answered: {answered}/{total}</Text>
                {isSubmitted && <Text style={{ color:'#8b5cf6', fontSize:12, fontWeight:'700' }}>Score: {totalScore}</Text>}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:       { borderRadius:14, padding:14, borderWidth:1 },
  dateBtn:    { paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:'#7c6af520' },
  subCard:    { borderRadius:12, padding:14, borderWidth:1, borderLeftWidth:4 },
});
