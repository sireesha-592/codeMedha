// src/screens/student/CourseScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function CourseScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState(user?.enrolledCourse || null);

  useEffect(() => {
    if (!courseId && user?._id) {
      api.get(`${API}/api/courses/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if (res.data?.length > 0) setCourseId(res.data[0]._id); });
    }
  }, [user]);

  useEffect(() => {
    if (courseId) {
      api.get(`${API}/api/classes/all/${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setClasses(res.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [courseId]);

  if (loading) return <View style={[{ flex:1, alignItems:'center', justifyContent:'center' }, { backgroundColor: theme.pageBg }]}><ActivityIndicator color={theme.accent} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Text style={{ fontSize: 20 }}>☰</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Classes</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {classes.length === 0 && <Text style={[{ color: theme.textMuted, textAlign:'center', marginTop: 40, fontSize: 14 }]}>No classes yet</Text>}
        {classes.map((cls, i) => (
          <View key={cls._id || i} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[{ color: theme.textPrimary, fontWeight:'700', fontSize: 15, marginBottom: 4 }]}>{cls.title || `Class ${i+1}`}</Text>
            <Text style={[{ color: theme.textMuted, fontSize: 12, marginBottom: 10 }]}>📅 {cls.date} {cls.time ? `• 🕐 ${cls.time}` : ''}</Text>
            {cls.recordingUrl && (
              <TouchableOpacity style={[styles.watchBtn, { backgroundColor: theme.accent }]} onPress={() => Linking.openURL(cls.recordingUrl)}>
                <Text style={{ color:'#000', fontWeight:'700', fontSize: 13 }}>▶ Watch Recording</Text>
              </TouchableOpacity>
            )}
            {cls.description && <Text style={[{ color: theme.textSecondary, fontSize: 12, marginTop: 8 }]}>{cls.description}</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  card: { borderRadius:14, padding:16, borderWidth:1 },
  watchBtn: { borderRadius:8, padding:10, alignItems:'center', alignSelf:'flex-start', paddingHorizontal:16 },
});
