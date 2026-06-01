import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerDoubtTrackerScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };
  const courseId = user?.enrolledCourse || user?.courseId || '';

  const [doubts,     setDoubts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [resolveId,  setResolveId]  = useState(null);
  const [answer,     setAnswer]     = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const params = courseId ? `?courseId=${courseId}` : '';
      const res = await api.get(`${API}/api/doubts${params}`, { headers });
      setDoubts(res.data || []);
    } catch(e) {}
    setLoading(false);
    setRefreshing(false);
  }, [courseId, token]);

  useEffect(() => { load(); }, [load]);

  const isResolved = (d) => d.status === 'resolved' || d.resolved === true;

  const resolve = async (id) => {
    if (!answer.trim()) return Alert.alert('⚠️', 'Please write an answer');
    setSaving(true);
    try {
      const res = await api.patch(`${API}/api/doubts/${id}/resolve`, { answer: answer.trim() }, { headers });
      setDoubts(prev => prev.map(d => d._id === id ? res.data : d));
      setResolveId(null); setAnswer('');
      Alert.alert('✅', 'Doubt resolved!');
    } catch(e) { Alert.alert('Error', 'Failed to resolve'); }
    setSaving(false);
  };

  const priColor = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };

  const filtered = doubts.filter(d =>
    filter === 'all' ? true : filter === 'resolved' ? isResolved(d) : !isResolved(d)
  );

  const pending  = doubts.filter(d => !isResolved(d)).length;
  const resolved = doubts.filter(d =>  isResolved(d)).length;

  const FILTERS = [
    { key:'all',      label:`📋 All (${doubts.length})`,      color:'#3b82f6' },
    { key:'pending',  label:`⏳ Pending (${pending})`,         color:'#f59e0b' },
    { key:'resolved', label:`✅ Resolved (${resolved})`,        color:'#10b981' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>❓ Doubt Tracker</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); load(); }}>
          <Text style={{ color: theme.accent, fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: theme.sidebarBg, borderBottomWidth:1, borderBottomColor: theme.border }} contentContainerStyle={{ padding:10, gap:8, flexDirection:'row' }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key}
            style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor: filter === f.key ? f.color : theme.cardBg, borderWidth:1, borderColor: filter === f.key ? f.color : theme.border, alignSelf:'flex-start' }}
            onPress={() => setFilter(f.key)}>
            <Text style={{ color: filter === f.key ? '#fff' : theme.textMuted, fontSize:13, fontWeight:'600' }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding:16, gap:12, paddingBottom:40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.accent} />}
        >
          {filtered.length === 0 ? (
            <View style={{ alignItems:'center', padding:40, gap:8 }}>
              <Text style={{ fontSize:32 }}>📭</Text>
              <Text style={{ color: theme.textMuted }}>No doubts found</Text>
            </View>
          ) : filtered.map(d => {
            const pColor = priColor[d.priority] || '#f59e0b';
            const resolved = isResolved(d);
            return (
              <View key={d._id} style={[s.doubtCard, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: resolved ? '#10b981' : pColor }]}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  <View>
                    <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700' }}>
                      👤 {d.studentId?.name || d.studentName || 'Student'}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>{d.studentId?.email || ''}</Text>
                  </View>
                  <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
                    <View style={{ backgroundColor: pColor + '20', borderRadius:10, paddingHorizontal:8, paddingVertical:3 }}>
                      <Text style={{ color: pColor, fontSize:11, fontWeight:'700' }}>{(d.priority || 'medium').toUpperCase()}</Text>
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>{new Date(d.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>

                <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'600', marginBottom:10 }}>❓ {d.question}</Text>

                {resolved ? (
                  <View style={{ backgroundColor:'#10b98110', borderLeftWidth:3, borderLeftColor:'#10b981', borderRadius:8, padding:10 }}>
                    <Text style={{ color:'#10b981', fontSize:12, fontWeight:'700', marginBottom:4 }}>✅ Resolved:</Text>
                    <Text style={{ color: theme.textPrimary, fontSize:13, lineHeight:20 }}>{d.answer}</Text>
                  </View>
                ) : resolveId === d._id ? (
                  <View style={{ gap:8 }}>
                    <TextInput
                      style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
                      placeholder="Type your answer / resolution…"
                      placeholderTextColor={theme.textMuted}
                      value={answer}
                      onChangeText={setAnswer}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    <View style={{ flexDirection:'row', gap:8 }}>
                      <TouchableOpacity style={[s.btn, { backgroundColor:'#10b981', flex:1 }]} onPress={() => resolve(d._id)} disabled={saving}>
                        <Text style={{ color:'#fff', fontWeight:'700' }}>{saving ? 'Saving…' : '✅ Submit Answer'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.btn, { backgroundColor:'#64748b' }]} onPress={() => { setResolveId(null); setAnswer(''); }}>
                        <Text style={{ color:'#fff', fontWeight:'700' }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={[s.btn, { backgroundColor:'#8e44ad', alignSelf:'flex-start', paddingHorizontal:16 }]} onPress={() => { setResolveId(d._id); setAnswer(''); }}>
                    <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>💬 Resolve Doubt</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  doubtCard: { borderRadius:12, padding:14, borderWidth:1, borderLeftWidth:4 },
  input:     { borderWidth:1, borderRadius:10, padding:12, fontSize:13, minHeight:80 },
  btn:       { borderRadius:10, padding:11, alignItems:'center' },
});
