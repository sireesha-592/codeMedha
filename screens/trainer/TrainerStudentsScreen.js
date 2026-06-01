// src/screens/trainer/TrainerStudentsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerStudentsScreen() {
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
      const res = await api.get(`${API}/api/trainer/students`, { headers: { Authorization: `Bearer ${token}` } });
      setStudents(res.data || []);
      setFiltered(res.data || []);
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color="#8b5cf6" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[ts.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <Text style={[ts.headerTitle, { color:theme.textPrimary }]}>👥 Students ({students.length})</Text>
      </View>
      <View style={{ padding:12 }}>
        <TextInput style={[ts.search, { backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.textPrimary }]} placeholder="Search students..." placeholderTextColor={theme.textMuted} value={search} onChangeText={setSearch} />
      </View>
      <ScrollView contentContainerStyle={{ padding:12, gap:10, paddingBottom:32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} tintColor="#8b5cf6" />}
      >
        {filtered.map((s,i) => (
          <View key={s._id||i} style={[ts.card, { backgroundColor:theme.cardBg, borderColor:theme.border }]}>
            <View style={[ts.avatar, { backgroundColor:'#8b5cf622' }]}>
              <Text style={[{ color:'#8b5cf6', fontWeight:'800', fontSize:16 }]}>{(s.name||'?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={[{ color:theme.textPrimary, fontWeight:'700', fontSize:14 }]}>{s.name}</Text>
              <Text style={[{ color:theme.textMuted, fontSize:12 }]}>{s.email}</Text>
              <View style={{ flexDirection:'row', gap:12, marginTop:6 }}>
                <Text style={[{ color:theme.accent, fontSize:11 }]}>📅 {Math.round(s.attendancePercentage || 0)}% att.</Text>
                <Text style={[{ color:theme.accentPurple, fontSize:11 }]}>📝 {s.submittedCount || 0} submitted</Text>
              </View>
            </View>
          </View>
        ))}
        {filtered.length === 0 && <Text style={[{ color:theme.textMuted, textAlign:'center', marginTop:40 }]}>No students found</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
const ts = StyleSheet.create({
  header: { paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  search: { borderWidth:1, borderRadius:12, padding:10, fontSize:14 },
  card: { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:14, borderWidth:1 },
  avatar: { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
});
