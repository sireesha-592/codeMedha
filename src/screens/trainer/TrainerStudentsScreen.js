import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

function StudentDetail({ student, onBack, headers, theme }) {
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`${API}/api/trainer/submissions/student/${student._id}`, { headers })
      .then(r => setSubs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [student._id]);

  const totalScore = (sub) => {
    if (sub.gradedAt && sub.manualScore != null) return sub.manualScore;
    return (sub.secA?.score||0) + (sub.secB?.score||0) + (sub.secC?.score||0);
  };

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>
      {/* Back button */}
      <TouchableOpacity style={[s.backBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={onBack}>
        <Text style={{ color: theme.accent, fontWeight:'600', fontSize:14 }}>← Back to students</Text>
      </TouchableOpacity>

      {/* Student Card */}
      <View style={[s.detailCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={{ width:60, height:60, borderRadius:30, backgroundColor:'#8b5cf6', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
          <Text style={{ color:'#fff', fontWeight:'900', fontSize:24 }}>{student.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={{ color: theme.textPrimary, fontWeight:'800', fontSize:18, marginBottom:4 }}>{student.name}</Text>
        <Text style={{ color: theme.textMuted, fontSize:13 }}>{student.email}</Text>
        {student.attendancePercentage !== undefined && (
          <View style={{ marginTop:10, flexDirection:'row', gap:12 }}>
            <View style={{ backgroundColor:'#10b98120', borderRadius:10, paddingHorizontal:12, paddingVertical:6 }}>
              <Text style={{ color:'#10b981', fontWeight:'700', fontSize:12 }}>📅 {student.attendancePercentage || 0}% attendance</Text>
            </View>
            <View style={{ backgroundColor:'#8b5cf620', borderRadius:10, paddingHorizontal:12, paddingVertical:6 }}>
              <Text style={{ color:'#8b5cf6', fontWeight:'700', fontSize:12 }}>📝 {student.submittedCount || 0} submitted</Text>
            </View>
          </View>
        )}
      </View>

      {/* Assignment History */}
      <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:15 }}>📋 Assignment History</Text>

      {loading ? <ActivityIndicator color="#8b5cf6" style={{ padding:20 }} /> :
      subs.length === 0 ? (
        <View style={{ alignItems:'center', padding:30, gap:8 }}>
          <Text style={{ fontSize:32 }}>📭</Text>
          <Text style={{ color: theme.textMuted }}>No submissions yet</Text>
        </View>
      ) : subs.map((sub, i) => {
        const score = totalScore(sub);
        const isSubmitted = sub.status === 'submitted';
        const answered = (sub.secA?.answered||0) + (sub.secB?.answered||0) + (sub.secC?.answered||0);
        const total    = (sub.secA?.total||20) + (sub.secB?.total||20) + (sub.secC?.total||10);
        return (
          <View key={sub._id || i} style={[s.subCard, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: isSubmitted ? '#10b981' : '#f59e0b' }]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <View style={{ flex:1 }}>
                <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:13 }}>
                  {sub.assignmentId?.title || sub.date || '—'}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize:11 }}>
                  📅 {sub.date || sub.assignmentId?.date || '—'}
                </Text>
              </View>
              <View style={{ backgroundColor: isSubmitted ? '#10b98120' : '#f59e0b20', borderRadius:8, paddingHorizontal:10, paddingVertical:4 }}>
                <Text style={{ color: isSubmitted ? '#10b981' : '#f59e0b', fontWeight:'700', fontSize:11 }}>
                  {isSubmitted ? '✅ Submitted' : '⏳ In Progress'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', gap:16, flexWrap:'wrap' }}>
              <Text style={{ color: theme.textMuted, fontSize:12 }}>Answered: {answered}/{total}</Text>
              {isSubmitted && (
                <Text style={{ color:'#8b5cf6', fontSize:12, fontWeight:'700' }}>
                  Score: {sub.manualScore != null ? sub.manualScore : score}
                </Text>
              )}
              {sub.trainerFeedback && (
                <Text style={{ color:'#06b6d4', fontSize:12 }}>💬 {sub.trainerFeedback}</Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function TrainerStudentsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [students,   setStudents]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`${API}/api/trainer/students`, { headers });
      setStudents(res.data || []);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => {
          if (selected) setSelected(null);
          else navigation.dispatch(DrawerActions.openDrawer());
        }}>
          <Text style={{ fontSize:20 }}>{selected ? '←' : '☰'}</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>
          👥 {selected ? selected.name : `Students (${students.length})`}
        </Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchStudents(); }}>
          <Text style={{ color:'#8b5cf6', fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {selected ? (
        <StudentDetail student={selected} onBack={() => setSelected(null)} headers={headers} theme={theme} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding:16, gap:12, paddingBottom:40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} tintColor="#8b5cf6" />}
        >
          {/* Search */}
          <TextInput
            style={[s.search, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="🔍 Search by name or email…"
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
          />

          {loading ? <ActivityIndicator color="#8b5cf6" style={{ padding:20 }} /> :
          filtered.length === 0 ? (
            <View style={{ alignItems:'center', padding:40, gap:8 }}>
              <Text style={{ fontSize:32 }}>👥</Text>
              <Text style={{ color: theme.textMuted }}>No students found</Text>
            </View>
          ) : (
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:12 }}>
              {filtered.map(student => (
                <TouchableOpacity key={student._id}
                  style={[s.studentCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                  onPress={() => setSelected(student)}
                  activeOpacity={0.7}
                >
                  <View style={{ width:52, height:52, borderRadius:26, backgroundColor:'#8b5cf6', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                    <Text style={{ color:'#fff', fontWeight:'900', fontSize:20 }}>{student.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:14, textAlign:'center' }} numberOfLines={1}>{student.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize:11, textAlign:'center' }} numberOfLines={1}>{student.email}</Text>

                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700', flex:1, textAlign:'center' },
  search:      { borderWidth:1, borderRadius:12, padding:12, fontSize:13 },
  studentCard: { width:'47%', borderRadius:14, padding:14, borderWidth:1, alignItems:'center' },
  detailCard:  { borderRadius:14, padding:20, borderWidth:1, alignItems:'center' },
  backBtn:     { borderRadius:10, padding:12, borderWidth:1, alignSelf:'flex-start' },
  subCard:     { borderRadius:12, padding:14, borderWidth:1, borderLeftWidth:4 },
});
