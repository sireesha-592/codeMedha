import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const SECTIONS = [
  { key:'A', label:'Section A', desc:'Easy',   marks:1, color:'#1D9E75', count:20 },
  { key:'B', label:'Section B', desc:'Medium', marks:3, color:'#185FA5', count:20 },
  { key:'C', label:'Section C', desc:'Hard',   marks:5, color:'#534AB7', count:10 },
];

export default function AdminQuestionsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [selectedDate,   setSelectedDate]   = useState(new Date().toISOString().split('T')[0]);
  const [courseId,       setCourseId]       = useState('');
  const [activeSection,  setActiveSection]  = useState('A');
  const [questions,      setQuestions]      = useState({ A:[], B:[], C:[] });
  const [loading,        setLoading]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [deadline,       setDeadline]       = useState('');

  useEffect(() => { fetchCourse(); }, []);
  useEffect(() => { if (courseId) fetchQuestions(); }, [courseId, selectedDate]);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`${API}/api/courses`, { headers });
      const courses = Array.isArray(res.data) ? res.data : [];
      if (courses.length > 0) setCourseId(courses[0]._id);
    } catch(e) {
      // fallback: try auth/me
      try {
        const me = await api.get(`${API}/api/auth/me`, { headers });
        if (me.data?.enrolledCourse) setCourseId(me.data.enrolledCourse);
      } catch(e2) {}
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/api/questions/${courseId}/${selectedDate}`, { headers });
      const qs = res.data || [];
      const grouped = { A:[], B:[], C:[] };
      qs.forEach(q => { if (grouped[q.section]) grouped[q.section].push(q); });
      setQuestions(grouped);
    } catch(e) {}
    setLoading(false);
  };

  const saveSection = async (sec) => {
    const secData = SECTIONS.find(s => s.key === sec);
    const rows = (questions[sec] || []).filter(q => (q.text || q.question || '').trim());
    if (rows.length === 0) return Alert.alert('⚠️', 'No questions to save');
    setSaving(true);
    try {
      // Delete existing questions for this section first
      const existing = (questions[sec] || []).filter(q => q._id);
      await Promise.all(existing.map(q =>
        api.delete(`${API}/api/questions/${q._id}`, { headers }).catch(() => {})
      ));
      // Then create new ones
      await Promise.all(rows.map((q, i) =>
        api.post(`${API}/api/questions`, {
          courseId, date: selectedDate, section: sec,
          text: (q.text || q.question || '').trim(),
          marks: secData.marks,
          order: i + 1,
        }, { headers })
      ));
      Alert.alert('✅', `Section ${sec} saved!`);
      fetchQuestions();
    } catch(e) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
    setSaving(false);
  };

  const addRow = (sec) => {
    setQuestions(prev => ({ ...prev, [sec]: [...prev[sec], { text:'', marks: SECTIONS.find(s=>s.key===sec)?.marks || 1 }] }));
  };

  const updateRow = (sec, idx, val) => {
    setQuestions(prev => {
      const updated = [...prev[sec]];
      updated[idx] = { ...updated[idx], text: val };
      return { ...prev, [sec]: updated };
    });
  };

  const removeRow = (sec, idx) => {
    setQuestions(prev => ({ ...prev, [sec]: prev[sec].filter((_, i) => i !== idx) }));
  };

  const secData = SECTIONS.find(s => s.key === activeSection);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.accent, fontSize:15 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📝 Questions</Text>
        <View style={{ width:60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>
        {/* Date selector */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontSize:12, marginBottom:8 }}>📅 Assignment Date</Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
          />
        </View>

        {/* Section Tabs */}
        <View style={{ flexDirection:'row', gap:8 }}>
          {SECTIONS.map(sec => (
            <TouchableOpacity key={sec.key}
              style={{ flex:1, padding:10, borderRadius:10, backgroundColor: activeSection === sec.key ? sec.color : theme.cardBg, borderWidth:1, borderColor: activeSection === sec.key ? sec.color : theme.border, alignItems:'center' }}
              onPress={() => setActiveSection(sec.key)}>
              <Text style={{ color: activeSection === sec.key ? '#fff' : theme.textMuted, fontWeight:'700', fontSize:13 }}>{sec.label}</Text>
              <Text style={{ color: activeSection === sec.key ? '#fff' : theme.textMuted, fontSize:10 }}>{sec.desc} • {sec.marks}m</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Questions */}
        {loading ? <ActivityIndicator color={theme.accent} /> : (
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <Text style={{ color: secData?.color, fontSize:14, fontWeight:'700' }}>
                {secData?.label} — {secData?.desc} ({questions[activeSection]?.length || 0}/{secData?.count})
              </Text>
              <View style={{ flexDirection:'row', gap:8 }}>
                <TouchableOpacity style={{ backgroundColor: secData?.color + '20', borderRadius:8, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor: secData?.color + '44' }} onPress={() => addRow(activeSection)}>
                  <Text style={{ color: secData?.color, fontWeight:'700', fontSize:12 }}>+ Add</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: secData?.color, borderRadius:8, paddingHorizontal:10, paddingVertical:6 }} onPress={() => saveSection(activeSection)} disabled={saving}>
                  <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>{saving ? 'Saving…' : '💾 Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {(questions[activeSection] || []).map((q, idx) => (
              <View key={idx} style={{ flexDirection:'row', alignItems:'flex-start', gap:8, marginBottom:10 }}>
                <View style={{ width:28, height:28, borderRadius:8, backgroundColor: secData?.color + '20', alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ color: secData?.color, fontWeight:'700', fontSize:12 }}>{idx+1}</Text>
                </View>
                <TextInput
                  style={[s.input, { flex:1, backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary, marginBottom:0 }]}
                  placeholder={`Question ${idx+1}…`}
                  placeholderTextColor={theme.textMuted}
                  value={q.text || q.question || ''}
                  onChangeText={val => updateRow(activeSection, idx, val)}
                  multiline
                />
                <TouchableOpacity onPress={() => removeRow(activeSection, idx)} style={{ padding:6 }}>
                  <Text style={{ color:'#ef4444', fontSize:16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {(questions[activeSection] || []).length === 0 && (
              <Text style={{ color: theme.textMuted, textAlign:'center', padding:20 }}>No questions yet. Tap + Add to start.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:       { borderRadius:14, padding:16, borderWidth:1 },
  input:      { borderWidth:1, borderRadius:10, padding:12, fontSize:13, marginBottom:8 },
});
