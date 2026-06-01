import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminFeedbackScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [courseId,  setCourseId]  = useState('');
  const [trainees,  setTrainees]  = useState([]);
  const [edits,     setEdits]     = useState({});
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');
  const [courses,   setCourses]   = useState([]);

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get(`${API}/api/courses`, { headers });
      const list = res.data || [];
      setCourses(list);
      if (list.length > 0) setCourseId(list[0]._id);
    } catch(e) {}
  };

  const loadTrainees = async () => {
    if (!courseId) return Alert.alert('⚠️', 'Select a course first');
    setLoading(true);
    setMsg('');
    try {
      const res = await api.get(`${API}/api/daily-feedback/trainees?courseId=${courseId}&date=${date}`, { headers });
      setTrainees(res.data || []);
    } catch(e) { Alert.alert('Error', 'Failed to load trainees'); }
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(edits).map(([traineeId, data]) => ({
        traineeId, courseId, date, feedback: data.feedback || '', rating: data.rating || '',
      })).filter(e => e.feedback);
      if (payload.length === 0) return Alert.alert('⚠️', 'No feedback to save');
      await api.post(`${API}/api/daily-feedback/bulk`, { feedbacks: payload }, { headers });
      setMsg('✅ All feedback saved!');
    } catch(e) { setMsg('❌ Failed to save'); }
    setSaving(false);
  };

  const attColor = (att) => att === 'present' ? '#10b981' : att === 'late' ? '#f59e0b' : '#ef4444';
  const attLabel = (att) => att === 'present' ? '✅ Present' : att === 'late' ? '🕐 Late' : '❌ Absent';

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>⭐ Daily Feedback</Text>
        <View style={{ width:30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700', marginBottom:4 }}>⭐ Daily Performance Feedback</Text>
          <Text style={{ color: theme.textMuted, fontSize:12, marginBottom:14 }}>
            Review each trainee's attendance + assignment, then write personalised daily feedback.
          </Text>

          {/* Course selector */}
          <Text style={[s.label, { color: theme.textMuted }]}>Course</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, flexDirection:'row', marginBottom:12 }}>
            {courses.map(c => (
              <TouchableOpacity key={c._id}
                style={{ paddingHorizontal:12, paddingVertical:8, borderRadius:10, backgroundColor: courseId === c._id ? theme.accent : theme.pageBg, borderWidth:1, borderColor: courseId === c._id ? theme.accent : theme.border }}
                onPress={() => setCourseId(c._id)}>
                <Text style={{ color: courseId === c._id ? '#000' : theme.textMuted, fontWeight:'600', fontSize:12 }}>{c.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Date */}
          <Text style={[s.label, { color: theme.textMuted }]}>Date</Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
            value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textMuted}
          />

          <TouchableOpacity style={[s.btn, { backgroundColor: loading ? '#64748b' : '#7c6af5' }]} onPress={loadTrainees} disabled={loading}>
            <Text style={{ color:'#fff', fontWeight:'700' }}>{loading ? 'Loading…' : '🔍 Load Trainees'}</Text>
          </TouchableOpacity>
        </View>

        {/* Trainee Rows */}
        {trainees.map(row => {
          const id   = row.trainee?._id || row._id;
          const edit = edits[id] || { feedback: row.feedback?.feedback || '', rating: row.feedback?.rating?.toString() || '' };
          return (
            <View key={id} style={[s.traineeCard, { backgroundColor:'#1a1a2e', borderColor:'#2a2a3e' }]}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <View>
                  <Text style={{ color:'#e0e0e0', fontWeight:'700', fontSize:14 }}>{row.trainee?.name || 'Student'}</Text>
                  <Text style={{ color:'#64748b', fontSize:11 }}>{row.trainee?.email || ''}</Text>
                </View>
                <View style={{ gap:4, alignItems:'flex-end' }}>
                  <View style={{ backgroundColor: attColor(row.attendance) + '22', borderRadius:10, paddingHorizontal:8, paddingVertical:3 }}>
                    <Text style={{ color: attColor(row.attendance), fontSize:11, fontWeight:'600' }}>{attLabel(row.attendance)}</Text>
                  </View>
                  <View style={{ backgroundColor: row.assignment?.submitted ? '#1e3a5f' : '#3a1e1e', borderRadius:10, paddingHorizontal:8, paddingVertical:3 }}>
                    <Text style={{ color: row.assignment?.submitted ? '#60aaff' : '#ff8080', fontSize:11 }}>
                      {row.assignment?.submitted ? `📝 Score: ${row.assignment?.manualScore ?? 'Pending'}` : '📝 Not Submitted'}
                    </Text>
                  </View>
                </View>
              </View>

              <TextInput
                style={[s.input, { backgroundColor:'#0f0f1e', borderColor:'#2a2a3e', color:'#e0e0e0', minHeight:70, textAlignVertical:'top' }]}
                placeholder={`Write feedback for ${row.trainee?.name}…`}
                placeholderTextColor="#475569"
                value={edit.feedback}
                onChangeText={val => setEdits(prev => ({ ...prev, [id]: { ...prev[id], feedback: val } }))}
                multiline
              />

              {/* Rating */}
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:4 }}>
                <Text style={{ color:'#64748b', fontSize:12 }}>Rating:</Text>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setEdits(prev => ({ ...prev, [id]: { ...prev[id], rating: n.toString() } }))}>
                    <Text style={{ fontSize:18, opacity: parseInt(edit.rating) >= n ? 1 : 0.3 }}>⭐</Text>
                  </TouchableOpacity>
                ))}
                {edit.rating ? <Text style={{ color:'#f59e0b', fontSize:12, fontWeight:'700' }}>{edit.rating}/5</Text> : null}
              </View>

              {row.feedback?.feedback && (
                <Text style={{ color:'#475569', fontSize:11, marginTop:8 }}>
                  Last saved: "{row.feedback.feedback.slice(0,80)}{row.feedback.feedback.length > 80 ? '…' : ''}"
                </Text>
              )}
            </View>
          );
        })}

        {/* Save All */}
        {trainees.length > 0 && (
          <View>
            {msg ? <Text style={{ color: msg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight:'600', marginBottom:8 }}>{msg}</Text> : null}
            <TouchableOpacity style={[s.btn, { backgroundColor: saving ? '#64748b' : '#10b981' }]} onPress={saveAll} disabled={saving}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:15 }}>{saving ? 'Saving…' : '💾 Save All Feedback'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && trainees.length === 0 && courseId && (
          <Text style={{ color: theme.textMuted, fontSize:14, textAlign:'center', marginTop:10 }}>
            Click "Load Trainees" to see today's performance summary.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  card:        { borderRadius:14, padding:16, borderWidth:1 },
  traineeCard: { borderRadius:14, padding:14, borderWidth:1 },
  label:       { fontSize:11, fontWeight:'700', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 },
  input:       { borderWidth:1, borderRadius:10, padding:12, fontSize:13, marginBottom:8 },
  btn:         { borderRadius:10, padding:14, alignItems:'center' },
});
