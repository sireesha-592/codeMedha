import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminAnalyticsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [students,    setStudents]    = useState([]);
  const [selectedId,  setSelectedId]  = useState('');
  const [report,      setReport]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [studLoading, setStudLoading] = useState(true);
  const [msg,         setMsg]         = useState('');
  const [sendMode,    setSendMode]    = useState('attendance');
  const [customMsg,   setCustomMsg]   = useState('');

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    try {
      const res = await api.get(`${API}/api/trainer/students`, { headers });
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch(e) {}
    setStudLoading(false);
  };

  const loadReport = async (id) => {
    if (!id) return;
    setLoading(true); setReport(null); setMsg('');
    try {
      const { data } = await api.get(`${API}/api/trainer/student-weekly-report/${id}`, { headers });
      setReport(data);
    } catch(e) {
      setMsg('❌ Failed to load report: ' + (e.response?.data?.message || e.message));
    }
    setLoading(false);
  };

  const buildAttMsg = (r) => {
    const s = r.student, a = r.attendance;
    const today = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const todayRec = a.days?.find(d => d.date === new Date().toISOString().split('T')[0]);
    const statusStr = todayRec ? ({ present:'Present ✅', absent:'Absent ❌', late:'Late ⚠️' }[todayRec.status] || 'Not marked') : 'Not yet marked';
    return `📚 *LMS Attendance Update*\n\nDear Parent/Guardian of *${s.name}*,\n\n📅 Date: ${today}\n🏫 Today's Attendance: *${statusStr}*\n\n📊 This Week:\n• Present: ${a.present} days\n• Absent: ${a.absent} days\n• Rate: ${a.percentage}%\n\n${a.percentage >= 75 ? '✅ Great attendance this week!' : a.percentage >= 50 ? '⚠️ Needs improvement.' : '❌ Attendance is critically low.'}\n\n— LMS Training Team`;
  };

  const buildWeeklyMsg = (r) => {
    const s = r.student, a = r.attendance, asgn = r.assignments;
    return `📈 *Weekly Performance Report*\n\nDear Parent/Guardian of *${s.name}*,\n\n📅 Period: ${r.period?.from} to ${r.period?.to}\n\n📊 *Attendance*\n• Present: ${a.present} / Absent: ${a.absent}\n• Rate: *${a.percentage}%* ${a.percentage >= 75 ? '✅' : a.percentage >= 50 ? '⚠️' : '❌'}\n\n📝 *Assignments*\n• Submitted: ${asgn.submitted}\n• Pending: ${asgn.pending}\n• Total Score: ${asgn.totalScore || 0} marks\n\n${a.percentage >= 75 ? '🌟 Excellent performance this week!' : a.percentage >= 50 ? '📢 Please encourage regular attendance.' : '⚠️ Urgent: Low attendance and engagement.'}\n\n— LMS Training Team`;
  };

  const openWhatsApp = () => {
    if (!report?.student?.parentPhone) {
      return Alert.alert('⚠️', 'Parent phone not set. Ask student to go to Profile → Parent Details tab and add their parent\'s WhatsApp number.');
    }
    const phone = report.student.parentPhone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('91') ? phone : '91' + phone;
    const msg = sendMode === 'custom' ? customMsg : sendMode === 'attendance' ? buildAttMsg(report) : buildWeeklyMsg(report);
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
    setMsg('✅ WhatsApp opened — click Send in WhatsApp to deliver the message.');
  };

  const selectedStudent = students.find(s => s._id === selectedId);

  const attPct = report?.attendance?.percentage || 0;
  const attColor = attPct >= 75 ? '#10b981' : attPct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📊 Reports & WhatsApp</Text>
        <View style={{ width:30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>

        {/* Header Info */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.textPrimary, fontSize:15, fontWeight:'700', marginBottom:4 }}>
            📊 Student Reports & WhatsApp Notifications
          </Text>
          <Text style={{ color: theme.textMuted, fontSize:13, lineHeight:18 }}>
            View weekly performance report for any student and send attendance/report notifications to their parents via WhatsApp.
          </Text>
        </View>

        {/* Student Selector */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            👤 Select Student
          </Text>
          {studLoading ? <ActivityIndicator color={theme.accent} /> : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight:200 }}>
              {students.map(st => (
                <TouchableOpacity key={st._id}
                  style={[s.studentItem, {
                    backgroundColor: selectedId === st._id ? theme.accent + '20' : 'transparent',
                    borderColor: selectedId === st._id ? theme.accent : theme.border,
                  }]}
                  onPress={() => { setSelectedId(st._id); loadReport(st._id); }}
                >
                  <View style={{ width:36, height:36, borderRadius:18, backgroundColor: theme.accent + '30', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color: theme.accent, fontWeight:'800' }}>{st.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color: theme.textPrimary, fontWeight:'600', fontSize:13 }}>{st.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>{st.email}</Text>
                  </View>
                  {selectedId === st._id && <Text style={{ color: theme.accent }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Report */}
        {loading ? (
          <View style={{ alignItems:'center', padding:30 }}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={{ color: theme.textMuted, marginTop:8 }}>Loading report…</Text>
          </View>
        ) : report ? (
          <>
            {/* Student Info */}
            <View style={[s.card, { backgroundColor:'#1a2740', borderColor:'#7c6af555' }]}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:14, marginBottom:12 }}>
                <View style={{ width:50, height:50, borderRadius:25, backgroundColor:'#7c6af5', alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ color:'#fff', fontWeight:'900', fontSize:20 }}>{report.student?.name?.charAt(0)}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>{report.student?.name}</Text>
                  <Text style={{ color:'#94a3b8', fontSize:12 }}>{report.student?.email}</Text>
                  <Text style={{ color: report.student?.parentPhone ? '#10b981' : '#ef4444', fontSize:11, marginTop:2 }}>
                    {report.student?.parentPhone ? `📱 Parent: ${report.student.parentPhone}` : '⚠️ No parent phone set'}
                  </Text>
                </View>
              </View>

              {/* Attendance stats */}
              <Text style={{ color:'#94a3b8', fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                📅 Attendance ({report.period?.from} — {report.period?.to})
              </Text>
              <View style={{ flexDirection:'row', gap:10, marginBottom:10 }}>
                {[
                  { label:'Present', value: report.attendance?.present || 0, color:'#10b981' },
                  { label:'Absent',  value: report.attendance?.absent  || 0, color:'#ef4444' },
                  { label:'Rate',    value: `${attPct}%`,                    color: attColor },
                ].map((item,i) => (
                  <View key={i} style={{ flex:1, backgroundColor: item.color + '20', borderRadius:10, padding:10, alignItems:'center' }}>
                    <Text style={{ color: item.color, fontSize:20, fontWeight:'800' }}>{item.value}</Text>
                    <Text style={{ color: item.color, fontSize:10, fontWeight:'600' }}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* Assignment stats */}
              <Text style={{ color:'#94a3b8', fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                📝 Assignments
              </Text>
              <View style={{ flexDirection:'row', gap:10, marginBottom:10 }}>
                {[
                  { label:'Submitted', value: report.assignments?.submitted || 0, color:'#8b5cf6' },
                  { label:'Pending',   value: report.assignments?.pending   || 0, color:'#f59e0b' },
                  { label:'Score',     value: report.assignments?.totalScore || 0, color:'#06b6d4' },
                ].map((item,i) => (
                  <View key={i} style={{ flex:1, backgroundColor: item.color + '20', borderRadius:10, padding:10, alignItems:'center' }}>
                    <Text style={{ color: item.color, fontSize:20, fontWeight:'800' }}>{item.value}</Text>
                    <Text style={{ color: item.color, fontSize:10, fontWeight:'600' }}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* Daily attendance dots */}
              {report.attendance?.days && (
                <>
                  <Text style={{ color:'#94a3b8', fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                    📆 This Week
                  </Text>
                  <View style={{ flexDirection:'row', gap:6, flexWrap:'wrap' }}>
                    {report.attendance.days.map((day, i) => (
                      <View key={i} style={{ alignItems:'center', gap:3 }}>
                        <Text style={{ color:'#64748b', fontSize:10 }}>{day.day}</Text>
                        <View style={{ width:32, height:32, borderRadius:16, backgroundColor: day.status === 'present' ? '#10b981' : day.status === 'absent' ? '#ef4444' : '#334155', alignItems:'center', justifyContent:'center' }}>
                          <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>
                            {day.status === 'present' ? '✓' : day.status === 'absent' ? '✗' : '–'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* WhatsApp Section */}
            <View style={[s.card, { backgroundColor:'#0d2818', borderColor:'#10b98144' }]}>
              <Text style={{ color:'#10b981', fontSize:14, fontWeight:'700', marginBottom:10 }}>
                📱 Send WhatsApp Notification to Parent
              </Text>

              {/* Mode selector */}
              <View style={{ flexDirection:'row', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                {[
                  { key:'attendance', label:'📅 Today\'s Attendance' },
                  { key:'weekly',     label:'📈 Weekly Report' },
                  { key:'custom',     label:'✏️ Custom Message' },
                ].map(m => (
                  <TouchableOpacity key={m.key}
                    style={{ paddingHorizontal:12, paddingVertical:7, borderRadius:10, backgroundColor: sendMode === m.key ? '#10b981' : '#10b98120', borderWidth:1, borderColor:'#10b98140' }}
                    onPress={() => setSendMode(m.key)}>
                    <Text style={{ color: sendMode === m.key ? '#fff' : '#10b981', fontWeight:'600', fontSize:12 }}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Message preview */}
              {sendMode !== 'custom' && (
                <View style={{ backgroundColor:'#0a1a10', borderRadius:10, padding:12, marginBottom:12 }}>
                  <Text style={{ color:'#6ee7b7', fontSize:12, lineHeight:20 }}>
                    {sendMode === 'attendance' ? buildAttMsg(report) : buildWeeklyMsg(report)}
                  </Text>
                </View>
              )}

              {sendMode === 'custom' && (
                <View style={{ backgroundColor:'#0a1a10', borderRadius:10, padding:10, marginBottom:12 }}>
                  <Text
                    style={{ color:'#6ee7b7', fontSize:13, minHeight:80 }}
                    onStartShouldSetResponder={() => true}
                  >
                    <Text style={{ color:'#475569', fontSize:12 }}>Custom message feature — use WhatsApp to type directly after opening</Text>
                  </Text>
                </View>
              )}

              {msg ? (
                <Text style={{ color: msg.startsWith('✅') ? '#10b981' : '#f59e0b', fontSize:12, fontWeight:'600', marginBottom:10 }}>{msg}</Text>
              ) : null}

              <TouchableOpacity
                style={[s.btn, { backgroundColor: report.student?.parentPhone ? '#10b981' : '#64748b' }]}
                onPress={openWhatsApp}
              >
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:14 }}>📱 Open WhatsApp & Send</Text>
              </TouchableOpacity>

              {!report.student?.parentPhone && (
                <Text style={{ color:'#f59e0b', fontSize:12, marginTop:8 }}>
                  ⚠️ Parent phone not set. Ask student to go to Profile → Parent Details tab and add their parent's WhatsApp number.
                </Text>
              )}
            </View>
          </>
        ) : selectedId && !loading ? (
          <View style={{ alignItems:'center', padding:30 }}>
            <Text style={{ fontSize:32 }}>📭</Text>
            <Text style={{ color: theme.textMuted, marginTop:8 }}>{msg || 'No report data available'}</Text>
          </View>
        ) : !selectedId ? (
          <View style={{ alignItems:'center', padding:30 }}>
            <Text style={{ fontSize:32 }}>👆</Text>
            <Text style={{ color: theme.textMuted, marginTop:8 }}>Select a student to view their report</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:16, fontWeight:'700' },
  card:        { borderRadius:14, padding:16, borderWidth:1 },
  studentItem: { flexDirection:'row', alignItems:'center', gap:12, padding:10, borderRadius:10, borderWidth:1, marginBottom:6 },
  btn:         { borderRadius:10, padding:14, alignItems:'center' },
});
