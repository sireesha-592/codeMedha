// src/screens/admin/AdminStudentsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminStudentsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(students.filter(s => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)));
  }, [search, students]);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`${API}/api/admin/students`, { headers: { Authorization:`Bearer ${token}` } });
      setStudents(res.data || []);
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#c77dff" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={{ paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border, backgroundColor:theme.sidebarBg }}>
        <Text style={[{ fontSize:17, fontWeight:'700', color:theme.textPrimary }]}>👥 Students ({students.length})</Text>
      </View>
      <View style={{ padding:12 }}>
        <TextInput style={[{ borderWidth:1, borderRadius:12, padding:10, fontSize:14 }, { backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.textPrimary }]}
          placeholder="Search..." placeholderTextColor={theme.textMuted} value={search} onChangeText={setSearch} />
      </View>
      <ScrollView contentContainerStyle={{ padding:12, gap:10, paddingBottom:32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} tintColor="#c77dff" />}
      >
        {filtered.map((s,i) => (
          <View key={s._id||i} style={[{ flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:14, borderWidth:1 }, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
            <View style={[{ width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' }, { backgroundColor:'#c77dff22' }]}>
              <Text style={{ color:'#c77dff', fontWeight:'800', fontSize:16 }}>{(s.name||'?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={[{ color:theme.textPrimary, fontWeight:'700', fontSize:14 }]}>{s.name}</Text>
              <Text style={[{ color:theme.textMuted, fontSize:11 }]}>{s.email}</Text>
              <Text style={[{ color:theme.accent, fontSize:11, marginTop:2 }]}>
                {s.enrolledCourse ? '📚 Enrolled' : '⚠️ Not enrolled'}
              </Text>
            </View>
          </View>
        ))}
        {filtered.length === 0 && <Text style={[{ color:theme.textMuted, textAlign:'center', marginTop:40 }]}>No students found</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
