// src/screens/trainer/TrainerClassScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerClassScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ title:'', date:'', recordingUrl:'', description:'' });
  const [saving, setSaving]   = useState(false);
  const [courseId, setCourseId] = useState(null);

  useEffect(() => {
    api.get(`${API}/api/trainer/course`, { headers: { Authorization:`Bearer ${token}` } })
      .then(r => { setCourseId(r.data?._id); return r.data?._id; })
      .then(id => id && api.get(`${API}/api/classes/all/${id}`, { headers: { Authorization:`Bearer ${token}` } }))
      .then(r => r && setClasses(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addClass = async () => {
    if (!form.title || !form.date) { Alert.alert('Required', 'Title and date are required'); return; }
    setSaving(true);
    try {
      await api.post(`${API}/api/classes`, { ...form, courseId }, { headers: { Authorization:`Bearer ${token}` } });
      setShowAdd(false);
      setForm({ title:'', date:'', recordingUrl:'', description:'' });
      const r = await api.get(`${API}/api/classes/all/${courseId}`, { headers: { Authorization:`Bearer ${token}` } });
      setClasses(r.data || []);
      Alert.alert('✅ Success', 'Class added successfully!');
    } catch (e) { Alert.alert('Error', e?.response?.data?.message || 'Failed to add class'); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#8b5cf6" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[tc.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <Text style={[tc.headerTitle, { color:theme.textPrimary }]}>🎓 Classes</Text>
        <TouchableOpacity style={[tc.addBtn, { backgroundColor:'#8b5cf6' }]} onPress={() => setShowAdd(p => !p)}>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>+ Add Class</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:12, paddingBottom:32 }}>
        {/* Add form */}
        {showAdd && (
          <View style={[tc.card, { backgroundColor:theme.cardBg, borderColor:'#8b5cf6' }]}>
            <Text style={[tc.cardTitle, { color:'#8b5cf6' }]}>New Class</Text>
            {[
              { key:'title', placeholder:'Class Title *', multiline:false },
              { key:'date',  placeholder:'Date (YYYY-MM-DD) *', multiline:false },
              { key:'recordingUrl', placeholder:'Recording URL (optional)', multiline:false },
              { key:'description', placeholder:'Description (optional)', multiline:true },
            ].map(f => (
              <TextInput key={f.key} style={[tc.input, { backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.textPrimary }]}
                placeholder={f.placeholder} placeholderTextColor={theme.textMuted}
                value={form[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]:v }))}
                multiline={f.multiline}
              />
            ))}
            <TouchableOpacity style={[tc.saveBtn, { backgroundColor:'#8b5cf6' }]} onPress={addClass} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'700' }}>Save Class</Text>}
            </TouchableOpacity>
          </View>
        )}
        {/* Classes list */}
        {classes.map((cls,i) => (
          <View key={cls._id||i} style={[tc.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
            <Text style={[{ color:theme.textPrimary, fontWeight:'700', fontSize:15 }]}>{cls.title}</Text>
            <Text style={[{ color:theme.textMuted, fontSize:12, marginTop:3 }]}>📅 {cls.date}</Text>
            {cls.description && <Text style={[{ color:theme.textSecondary, fontSize:12, marginTop:6 }]}>{cls.description}</Text>}
          </View>
        ))}
        {classes.length === 0 && !showAdd && <Text style={[{ color:theme.textMuted, textAlign:'center', marginTop:40 }]}>No classes yet. Add your first class!</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
const tc = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  addBtn: { borderRadius:10, paddingHorizontal:14, paddingVertical:8 },
  card: { borderRadius:14, padding:16, borderWidth:1, gap:10 },
  cardTitle: { fontSize:14, fontWeight:'700' },
  input: { borderWidth:1, borderRadius:10, padding:12, fontSize:14 },
  saveBtn: { borderRadius:10, padding:12, alignItems:'center' },
});
