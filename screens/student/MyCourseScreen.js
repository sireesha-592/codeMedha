// src/screens/student/MyCourseScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function MyCourseScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [course, setCourse]       = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      const h = { Authorization: `Bearer ${token}` };
      try {
        const cRes = await api.get(`${API}/api/courses/${user._id}`, { headers: h });
        const c    = cRes.data?.[0];
        setCourse(c);
        if (c?._id) {
          const rRes = await api.get(`${API}/api/resources/${c._id}`, { headers: h });
          setResources(rRes.data || []);
        }
      } catch (e) {}
      finally { setLoading(false); }
    };
    if (user) load();
  }, [user]);

  if (loading) return <View style={[{ flex:1, alignItems:'center', justifyContent:'center' }, { backgroundColor:theme.pageBg }]}><ActivityIndicator color={theme.accent} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[sty.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Text style={{ fontSize:20 }}>☰</Text></TouchableOpacity>
        <Text style={[sty.headerTitle, { color:theme.textPrimary }]}>My Course</Text>
        <View style={{ width:32 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:32 }}>
        {!course ? (
          <View style={{ alignItems:'center', marginTop:40 }}>
            <Text style={{ fontSize:40 }}>📚</Text>
            <Text style={[{ color:theme.textMuted, marginTop:12, fontSize:14 }]}>Not enrolled in any course yet.</Text>
            <Text style={[{ color:theme.textMuted, fontSize:12, marginTop:4 }]}>Contact admin to get enrolled.</Text>
          </View>
        ) : (
          <>
            <View style={[sty.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
              <Text style={[sty.courseTitle, { color:theme.textPrimary }]}>{course.title}</Text>
              {course.description && <Text style={[{ color:theme.textSecondary, fontSize:13, lineHeight:20 }]}>{course.description}</Text>}
              <View style={sty.techRow}>
                {(course.technologies || []).map((t, i) => (
                  <View key={i} style={[sty.techBadge, { backgroundColor:theme.accentPurple+'22' }]}>
                    <Text style={[{ color:theme.accentPurple, fontSize:11, fontWeight:'600' }]}>{t}</Text>
                  </View>
                ))}
              </View>
              <Text style={[{ color:theme.textMuted, fontSize:12, marginTop:8 }]}>👥 {course.enrolledStudents?.length || 0} trainees enrolled</Text>
            </View>

            {resources.length > 0 && (
              <View style={[sty.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
                <Text style={[sty.sectionTitle, { color:theme.textSecondary }]}>📂 Course Resources</Text>
                {resources.map((r, i) => (
                  <TouchableOpacity key={i} style={[sty.resourceRow, { borderBottomColor:theme.border }]}>
                    <Text style={{ fontSize:18 }}>
                      {r.type === 'video' ? '🎥' : r.type === 'pdf' ? '📄' : r.type === 'link' ? '🔗' : '📁'}
                    </Text>
                    <View style={{ flex:1 }}>
                      <Text style={[{ color:theme.textPrimary, fontSize:13, fontWeight:'500' }]}>{r.title}</Text>
                      {r.description && <Text style={[{ color:theme.textMuted, fontSize:11, marginTop:2 }]}>{r.description}</Text>}
                    </View>
                    <Text style={{ color:theme.accent, fontSize:12 }}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const sty = StyleSheet.create({
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:  { fontSize:17, fontWeight:'700' },
  card:         { borderRadius:14, padding:16, borderWidth:1, gap:10 },
  courseTitle:  { fontSize:18, fontWeight:'800', lineHeight:24 },
  techRow:      { flexDirection:'row', flexWrap:'wrap', gap:6 },
  techBadge:    { borderRadius:20, paddingHorizontal:10, paddingVertical:3 },
  sectionTitle: { fontSize:13, fontWeight:'600', marginBottom:6 },
  resourceRow:  { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:10, borderBottomWidth:1 },
});
