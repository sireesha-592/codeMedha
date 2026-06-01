// src/screens/admin/AdminCoursesScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminCoursesScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ title:'', description:'', technologies:'' });
  const [saving, setSaving]   = useState(false);

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get(`${API}/api/courses`, { headers: { Authorization:`Bearer ${token}` } });
      setCourses(res.data || []);
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const addCourse = async () => {
    if (!form.title) { Alert.alert('Required', 'Course title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        technologies: form.technologies.split(',').map(t => t.trim()).filter(Boolean),
      };
      await api.post(`${API}/api/courses`, payload, { headers: { Authorization:`Bearer ${token}` } });
      setShowAdd(false);
      setForm({ title:'', description:'', technologies:'' });
      fetchCourses();
      Alert.alert('✅ Course created!');
    } catch (e) { Alert.alert('Error', e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#c77dff" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 }, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <Text style={[{ fontSize:17, fontWeight:'700', color:theme.textPrimary }]}>📚 Courses</Text>
        <TouchableOpacity style={[{ borderRadius:10, paddingHorizontal:14, paddingVertical:8 }, { backgroundColor:'#c77dff' }]} onPress={() => setShowAdd(p => !p)}>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:12, paddingBottom:32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCourses(); }} tintColor="#c77dff" />}
      >
        {showAdd && (
          <View style={[{ borderRadius:14, padding:16, borderWidth:1.5, gap:10 }, { backgroundColor:theme.cardBg, borderColor:'#c77dff' }]}>
            <Text style={{ color:'#c77dff', fontWeight:'700', fontSize:14 }}>New Course</Text>
            {[
              { key:'title', label:'Title *' },
              { key:'description', label:'Description', multiline:true },
              { key:'technologies', label:'Technologies (comma-separated)' },
            ].map(f => (
              <TextInput key={f.key}
                style={[{ borderWidth:1, borderRadius:10, padding:12, fontSize:14 }, { backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.textPrimary }]}
                placeholder={f.label} placeholderTextColor={theme.textMuted}
                value={form[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]:v }))}
                multiline={f.multiline}
              />
            ))}
            <TouchableOpacity style={[{ borderRadius:10, padding:12, alignItems:'center' }, { backgroundColor:'#c77dff' }]} onPress={addCourse} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'700' }}>Create Course</Text>}
            </TouchableOpacity>
          </View>
        )}
        {courses.map((c,i) => (
          <View key={c._id||i} style={[{ borderRadius:14, padding:16, borderWidth:1, gap:8 }, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
            <Text style={[{ color:theme.textPrimary, fontWeight:'700', fontSize:15 }]}>{c.title}</Text>
            {c.description && <Text style={[{ color:theme.textSecondary, fontSize:12 }]}>{c.description}</Text>}
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
              {(c.technologies||[]).map((t,ti) => (
                <View key={ti} style={[{ borderRadius:20, paddingHorizontal:10, paddingVertical:3 }, { backgroundColor:'#c77dff22' }]}>
                  <Text style={{ color:'#c77dff', fontSize:11, fontWeight:'600' }}>{t}</Text>
                </View>
              ))}
            </View>
            <Text style={[{ color:theme.textMuted, fontSize:12 }]}>👥 {c.enrolledStudents?.length||0} enrolled</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
