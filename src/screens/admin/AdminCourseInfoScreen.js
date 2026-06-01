import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminCourseInfoScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [courses,     setCourses]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [title,       setTitle]       = useState('');
  const [desc,        setDesc]        = useState('');
  const [techs,       setTechs]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newName,     setNewName]     = useState('');
  const [students,    setStudents]    = useState([]);

  useEffect(() => { fetchCourses(); fetchStudents(); }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get(`${API}/api/courses`, { headers });
      setCourses(res.data || []);
      if (res.data?.length > 0) selectCourse(res.data[0]);
    } catch(e) {}
    setLoading(false);
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get(`${API}/api/trainer/students`, { headers });
      setStudents(res.data || []);
    } catch(e) {}
  };

  const selectCourse = (c) => {
    setSelected(c);
    setTitle(c.title || '');
    setDesc(c.description || '');
    setTechs((c.technologies || []).join(', '));
  };

  const saveCourse = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`${API}/api/courses/${selected._id}`, {
        title: title.trim(),
        description: desc.trim(),
        technologies: techs.split(',').map(t => t.trim()).filter(Boolean),
      }, { headers });
      Alert.alert('✅', 'Course updated!');
      fetchCourses();
    } catch(e) { Alert.alert('Error', 'Failed to save'); }
    setSaving(false);
  };

  const createCourse = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api.post(`${API}/api/courses`, { title: newName.trim() }, { headers });
      setCourses(prev => [...prev, res.data]);
      selectCourse(res.data);
      setShowCreate(false); setNewName('');
      Alert.alert('✅', 'Course created!');
    } catch(e) { Alert.alert('Error', 'Failed to create'); }
  };

  const enrollStudent = async (studentId) => {
    if (!selected) return;
    try {
      await api.post(`${API}/api/courses/${selected._id}/enroll`, { studentId }, { headers });
      Alert.alert('✅', 'Student enrolled!');
    } catch(e) { Alert.alert('Error', 'Failed to enroll'); }
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>🎓 Course Info</Text>
        <View style={{ width:30 }} />
      </View>

      {loading ? <ActivityIndicator color={theme.accent} style={{ flex:1 }} /> : (
        <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>
          {/* Course Selector */}
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontSize:12, fontWeight:'700', marginBottom:10 }}>SELECT COURSE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, flexDirection:'row' }}>
              {courses.map(c => (
                <TouchableOpacity key={c._id}
                  style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:10, backgroundColor: selected?._id === c._id ? theme.accent : theme.pageBg, borderWidth:1, borderColor: selected?._id === c._id ? theme.accent : theme.border }}
                  onPress={() => selectCourse(c)}>
                  <Text style={{ color: selected?._id === c._id ? '#000' : theme.textPrimary, fontWeight:'600', fontSize:13 }}>{c.title}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:10, backgroundColor:'#10b98120', borderWidth:1, borderColor:'#10b98140' }} onPress={() => setShowCreate(true)}>
                <Text style={{ color:'#10b981', fontWeight:'700' }}>➕ New</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Create Course */}
          {showCreate && (
            <View style={[s.card, { backgroundColor:'#f0fdf4', borderColor:'#10b981' }]}>
              <TextInput style={[s.input, { backgroundColor:'#fff', borderColor:'#10b981', color:'#000' }]}
                placeholder="New Course Name" placeholderTextColor="#64748b"
                value={newName} onChangeText={setNewName} />
              <View style={{ flexDirection:'row', gap:8 }}>
                <TouchableOpacity style={{ flex:1, backgroundColor:'#10b981', borderRadius:10, padding:12, alignItems:'center' }} onPress={createCourse}>
                  <Text style={{ color:'#fff', fontWeight:'700' }}>✅ Create</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor:'#64748b20', borderRadius:10, padding:12, paddingHorizontal:16 }} onPress={() => setShowCreate(false)}>
                  <Text style={{ color:'#64748b', fontWeight:'700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Edit Course */}
          {selected && (
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={{ color: theme.textPrimary, fontSize:15, fontWeight:'700', marginBottom:14 }}>✏️ Edit: {selected.title}</Text>

              <Text style={[s.label, { color: theme.textMuted }]}>Course Title</Text>
              <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
                value={title} onChangeText={setTitle} placeholder="Course title" placeholderTextColor={theme.textMuted} />

              <Text style={[s.label, { color: theme.textMuted }]}>Description</Text>
              <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary, minHeight:80, textAlignVertical:'top' }]}
                value={desc} onChangeText={setDesc} placeholder="Course description" placeholderTextColor={theme.textMuted} multiline />

              <Text style={[s.label, { color: theme.textMuted }]}>Technologies (comma separated)</Text>
              <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
                value={techs} onChangeText={setTechs} placeholder="React, Node.js, MongoDB..." placeholderTextColor={theme.textMuted} />

              <TouchableOpacity style={[s.btn, { backgroundColor: saving ? '#64748b' : '#7c6af5' }]} onPress={saveCourse} disabled={saving}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:14 }}>{saving ? '💾 Saving…' : '💾 Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Enroll Students */}
          {selected && students.length > 0 && (
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700', marginBottom:12 }}>👥 Enroll Students</Text>
              {students.map(st => {
                const enrolled = selected.enrolledStudents?.some(id => id.toString() === st._id.toString());
                return (
                  <View key={st._id} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor: theme.border }}>
                    <View>
                      <Text style={{ color: theme.textPrimary, fontSize:13, fontWeight:'500' }}>{st.name}</Text>
                      <Text style={{ color: theme.textMuted, fontSize:11 }}>{st.email}</Text>
                    </View>
                    {enrolled ? (
                      <View style={{ backgroundColor:'#10b98120', borderRadius:8, paddingHorizontal:10, paddingVertical:4 }}>
                        <Text style={{ color:'#10b981', fontSize:11, fontWeight:'700' }}>✅ Enrolled</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={{ backgroundColor:'#7c6af520', borderRadius:8, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'#7c6af544' }} onPress={() => enrollStudent(st._id)}>
                        <Text style={{ color:'#7c6af5', fontSize:12, fontWeight:'700' }}>+ Enroll</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:       { borderRadius:14, padding:16, borderWidth:1 },
  label:      { fontSize:11, fontWeight:'700', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 },
  input:      { borderWidth:1, borderRadius:10, padding:12, fontSize:13, marginBottom:12 },
  btn:        { borderRadius:10, padding:14, alignItems:'center', marginTop:4 },
});
