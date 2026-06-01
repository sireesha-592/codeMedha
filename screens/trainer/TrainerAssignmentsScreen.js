// src/screens/trainer/TrainerAssignmentsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerAssignmentsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoring, setScoring]   = useState({});
  const [scores, setScores]     = useState({});

  useEffect(() => { fetchSubmissions(); }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await api.get(`${API}/api/trainer/submissions`, { headers: { Authorization: `Bearer ${token}` } });
      setSubmissions(res.data || []);
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const publishScore = async (subId) => {
    const score = parseInt(scores[subId]);
    if (isNaN(score)) { Alert.alert('Error', 'Enter a valid score'); return; }
    setScoring(p => ({ ...p, [subId]:true }));
    try {
      await api.post(`${API}/api/submissions/grade/${subId}`, { manualScore: score, scorePublished: true }, { headers: { Authorization:`Bearer ${token}` } });
      Alert.alert('✅ Score Published!');
      fetchSubmissions();
    } catch (e) { Alert.alert('Error', 'Failed to publish score'); }
    finally { setScoring(p => ({ ...p, [subId]:false })); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#8b5cf6" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[ta.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <Text style={[ta.headerTitle, { color:theme.textPrimary }]}>📝 Assignments ({submissions.length})</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:12, paddingBottom:32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubmissions(); }} tintColor="#8b5cf6" />}
      >
        {submissions.map((sub,i) => (
          <View key={sub._id||i} style={[ta.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
            <View style={ta.cardHeader}>
              <View>
                <Text style={[{ color:theme.textPrimary, fontWeight:'700', fontSize:14 }]}>{sub.student?.name || 'Student'}</Text>
                <Text style={[{ color:theme.textMuted, fontSize:11, marginTop:2 }]}>📅 {sub.date}</Text>
              </View>
              <View style={[ta.statusBadge, { backgroundColor: sub.status==='submitted' ? theme.accent+'22' : theme.accentOrange+'22' }]}>
                <Text style={[{ color: sub.status==='submitted' ? theme.accent : theme.accentOrange, fontSize:11, fontWeight:'600' }]}>
                  {sub.status === 'submitted' ? '✅ Submitted' : '⏳ Pending'}
                </Text>
              </View>
            </View>
            {sub.status === 'submitted' && !sub.scorePublished && (
              <View style={ta.scoreRow}>
                <TextInput
                  style={[ta.scoreInput, { backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.textPrimary }]}
                  placeholder="Score (0-100)"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={scores[sub._id] || ''}
                  onChangeText={v => setScores(p => ({ ...p, [sub._id]:v }))}
                />
                <TouchableOpacity style={[ta.publishBtn, { backgroundColor:'#8b5cf6' }]} onPress={() => publishScore(sub._id)} disabled={scoring[sub._id]}>
                  {scoring[sub._id] ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Publish</Text>}
                </TouchableOpacity>
              </View>
            )}
            {sub.scorePublished && (
              <Text style={[{ color:'#10b981', fontWeight:'700', fontSize:13, marginTop:4 }]}>
                🏆 Score Published: {sub.manualScore}/{sub.maxScore || 100}
              </Text>
            )}
          </View>
        ))}
        {submissions.length === 0 && <Text style={[{ color:theme.textMuted, textAlign:'center', marginTop:40 }]}>No submissions yet</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
const ta = StyleSheet.create({
  header: { paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  card: { borderRadius:14, padding:16, borderWidth:1, gap:10 },
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  statusBadge: { borderRadius:20, paddingHorizontal:10, paddingVertical:4 },
  scoreRow: { flexDirection:'row', gap:10, alignItems:'center' },
  scoreInput: { flex:1, borderWidth:1, borderRadius:10, padding:10, fontSize:14 },
  publishBtn: { borderRadius:10, paddingHorizontal:14, paddingVertical:10 },
});
