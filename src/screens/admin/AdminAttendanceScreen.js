import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminAttendanceScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [attRows,    setAttRows]    = useState([]);
  const [classInfo,  setClassInfo]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,     setSaving]     = useState({});
  const [msg,        setMsg]        = useState('');

  useEffect(() => { loadAttendance(); }, [date]);

  const loadAttendance = async () => {
    setLoading(true); setMsg('');
    try {
      const [studRes, actRes, classRes] = await Promise.all([
        api.get(`${API}/api/trainer/students`, { headers }),
        api.get(`${API}/api/attendance/class-activity/${date}`, { headers }),
        api.get(`${API}/api/classes/today`, { headers }).catch(() => ({ data: null })),
      ]);

      const students   = studRes.data || [];
      const actPayload = actRes.data  || {};
      const activities = actPayload.activities || (Array.isArray(actRes.data) ? actRes.data : []);
      const cls        = classRes.data;

      const actMap = {};
      activities.forEach(a => {
        const sid = a.studentId?._id?.toString() || a.studentId?.toString();
        if (sid) actMap[sid] = a;
      });

      const rows = students.map(s => {
        const sid = s._id.toString();
        const act = actMap[sid] || null;
        return {
          student:       s,
          status:        act?.attendanceStatus || 'not_marked',
          markedByAdmin: act?.markedByAdmin    || false,
          markedAt:      act?.markedAt         || null,
          classActivity: act,
        };
      });

      setAttRows(rows);
      const deadlineFromAct = actPayload.attendanceDeadline;
      setClassInfo(cls ? { ...cls, attendanceDeadline: deadlineFromAct || cls.attendanceDeadline }
        : (deadlineFromAct ? { attendanceDeadline: deadlineFromAct } : null));
    } catch(e) { setMsg('❌ Failed to load: ' + e.message); }
    setLoading(false); setRefreshing(false);
  };

  const markAttendance = async (studentId, status) => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    try {
      await api.post(`${API}/api/attendance/mark`, { studentId, date, status }, { headers });
      // Lock this row permanently — markedByAdmin = true (same as web)
      setAttRows(prev => prev.map(r =>
        r.student?._id?.toString() === studentId
          ? { ...r, status, markedByAdmin: true, markedAt: new Date().toISOString() }
          : r
      ));
      setMsg('');
    } catch(e) {
      const data = e.response?.data;
      if (data?.alreadyMarked) {
        setMsg(`🔒 Already marked as "${data.status}" — attendance is final and cannot be changed.`);
        loadAttendance(); // refresh to show locked state
      } else if (data?.deadlineNotReached) {
        const dl = new Date(data.deadline).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
        setMsg(`⏳ Cannot mark yet. Deadline is ${dl}. Please wait until it passes.`);
      } else {
        setMsg('❌ Failed: ' + (data?.message || e.message));
      }
    }
    setSaving(prev => ({ ...prev, [studentId]: false }));
  };

  const markAllByWatch = async (threshold) => {
    const unfinalized = attRows.filter(r => !r.markedByAdmin);
    if (unfinalized.length === 0) return Alert.alert('⚠️', 'All rows already finalized');
    Alert.alert(
      `Bulk mark by ≥${threshold}% watch?`,
      `Present if watched ≥${threshold}%, absent otherwise.
${unfinalized.length} students will be processed.`,
      [
        { text:'Cancel', style:'cancel' },
        { text:'Confirm', onPress: async () => {
          let marked = 0;
          for (const row of unfinalized) {
            const pct    = row.classActivity?.watchedPercent || 0;
            const status = pct >= threshold ? 'present' : 'absent';
            await markAttendance(row.student._id.toString(), status);
            marked++;
          }
          setMsg(`✅ Bulk marked ${marked} trainees based on ${threshold}% watch threshold.`);
        }}
      ]
    );
  };

  const markAllPresent = () => {
    Alert.alert('Mark ALL Present?', `${attRows.filter(r=>!r.markedByAdmin).length} students`, [
      { text:'Cancel', style:'cancel' },
      { text:'Confirm', onPress: async () => {
        for (const row of attRows) {
          if (!row.markedByAdmin) await markAttendance(row.student._id.toString(), 'present');
        }
        setMsg('✅ All marked Present');
      }}
    ]);
  };

  // Date navigation
  const changeDate = (days) => {
    const d = new Date(date); d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  // Date picker buttons — quick jump
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })();

  const present  = attRows.filter(r => r.status === 'present').length;
  const absent   = attRows.filter(r => r.status === 'absent').length;
  const unmarked = attRows.filter(r => !r.status || r.status === 'not_marked').length;
  const opened   = attRows.filter(r => r.classActivity?.opened).length;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📋 Attendance</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); loadAttendance(); }}>
          <Text style={{ color: theme.accent, fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding:16, gap:12, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAttendance(); }} tintColor={theme.accent} />}
      >
        {/* Date Picker */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontSize:12, marginBottom:10 }}>
            📋 After the class attendance deadline passes, review who watched and mark present/absent.
          </Text>

          {/* Date navigation */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <TouchableOpacity style={s.dateBtn} onPress={() => changeDate(-1)}>
              <Text style={{ color: theme.accent, fontWeight:'700' }}>◀ Prev</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:16 }}>📅 {date}</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => changeDate(1)}>
              <Text style={{ color: theme.accent, fontWeight:'700' }}>Next ▶</Text>
            </TouchableOpacity>
          </View>

          {/* Quick date shortcuts */}
          <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity style={[s.quickBtn, { backgroundColor: date === today ? theme.accent : theme.pageBg, borderColor: date === today ? theme.accent : theme.border }]} onPress={() => setDate(today)}>
              <Text style={{ color: date === today ? '#000' : theme.textMuted, fontSize:12, fontWeight:'600' }}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.quickBtn, { backgroundColor: date === yesterday ? theme.accent : theme.pageBg, borderColor: date === yesterday ? theme.accent : theme.border }]} onPress={() => setDate(yesterday)}>
              <Text style={{ color: date === yesterday ? '#000' : theme.textMuted, fontSize:12, fontWeight:'600' }}>Yesterday</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.quickBtn, { backgroundColor: theme.pageBg, borderColor: theme.border }]} onPress={() => { setRefreshing(true); loadAttendance(); }}>
              <Text style={{ color: theme.accent, fontSize:12, fontWeight:'600' }}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Class Info */}
        {classInfo ? (
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:13 }}>🎬 {classInfo.title || 'Class'}</Text>
            {classInfo.attendanceDeadline && (
              <Text style={{ color: new Date() > new Date(classInfo.attendanceDeadline) ? '#ef4444' : '#10b981', fontSize:12, marginTop:4, fontWeight:'600' }}>
                {new Date() > new Date(classInfo.attendanceDeadline) ? '⌛ Deadline passed' : '⏳ Deadline not reached yet'}
                {' — '}{new Date(classInfo.attendanceDeadline).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        ) : (
          <View style={[s.card, { backgroundColor:'#1c1100', borderColor:'#f5a62344' }]}>
            <Text style={{ color:'#f5a623', fontSize:13 }}>⚠️ No class uploaded for {date}. Go to Upload Video tab first.</Text>
          </View>
        )}

        {/* Bulk Actions */}
        <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <Text style={{ color: theme.textMuted, fontSize:12, fontWeight:'600' }}>Bulk mark:</Text>
          <TouchableOpacity style={s.bulkBtn50} onPress={() => markAllByWatch(50)}>
            <Text style={{ color:'#10b981', fontWeight:'700', fontSize:11 }}>✅ ≥50% watched → Present</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bulkBtn75} onPress={() => markAllByWatch(75)}>
            <Text style={{ color:'#185FA5', fontWeight:'700', fontSize:11 }}>✅ ≥75% watched → Present</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bulkBtnAll} onPress={markAllPresent}>
            <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:11 }}>📋 All Present</Text>
          </TouchableOpacity>
        </View>

        {msg ? <Text style={{ color: msg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight:'600' }}>{msg}</Text> : null}

        {/* Summary Bar */}
        <View style={{ flexDirection:'row', gap:8 }}>
          {[
            { label:'Total',   value: attRows.length, color: theme.accent },
            { label:'Present', value: present,        color:'#10b981' },
            { label:'Absent',  value: absent,         color:'#ef4444' },
            { label:'Unmarked',value: unmarked,       color:'#64748b' },
            { label:'Opened',  value: opened,         color:'#185FA5' },
          ].map((item,i) => (
            <View key={i} style={{ flex:1, backgroundColor: item.color + '15', borderRadius:10, padding:8, alignItems:'center', borderWidth:1, borderColor: item.color + '30' }}>
              <Text style={{ color: item.color, fontSize:18, fontWeight:'800' }}>{item.value}</Text>
              <Text style={{ color: item.color, fontSize:9, fontWeight:'600', textAlign:'center' }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Column Headers */}
        <View style={{ flexDirection:'row', paddingHorizontal:12, paddingVertical:6, backgroundColor: theme.pageBg, borderRadius:8 }}>
          <Text style={[s.colHead, { flex:1 }]}>Trainee</Text>
          <Text style={[s.colHead, { width:52, textAlign:'center' }]}>Opened</Text>
          <Text style={[s.colHead, { width:52, textAlign:'center' }]}>Watched</Text>
          <Text style={[s.colHead, { width:60, textAlign:'center' }]}>Status</Text>
          <Text style={[s.colHead, { width:80, textAlign:'center' }]}>Mark</Text>
        </View>

        {/* Student List */}
        {loading ? <ActivityIndicator color={theme.accent} style={{ padding:20 }} /> :
        attRows.length === 0 ? (
          <View style={{ alignItems:'center', padding:40 }}>
            <Text style={{ fontSize:32 }}>📭</Text>
            <Text style={{ color: theme.textMuted, marginTop:8 }}>No trainees found for {date}</Text>
          </View>
        ) : attRows.map((row, i) => {
          const sid      = row.student?._id?.toString();
          const name     = row.student?.name || 'Student';
          const email    = row.student?.email || '';
          const status   = row.status;
          const act      = row.classActivity;
          const pct      = act?.watchedPercent || 0;
          const pctColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
          const isLocked = row.markedByAdmin;

          return (
            <View key={i} style={[s.studentRow, {
              backgroundColor: isLocked ? (status === 'present' ? '#10b98110' : '#ef444410') : theme.cardBg,
              borderColor: isLocked ? (status === 'present' ? '#10b98130' : '#ef444430') : theme.border,
            }]}>
              <View style={{ flex:1 }}>
                <Text style={{ color: theme.textPrimary, fontWeight:'700', fontSize:13 }} numberOfLines={1}>{name}</Text>
                <Text style={{ color: theme.textMuted, fontSize:10 }} numberOfLines={1}>{email}</Text>
                {isLocked && row.markedAt && (
                  <Text style={{ color: theme.textMuted, fontSize:9 }}>
                    🔒 {new Date(row.markedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </Text>
                )}
              </View>

              {/* Opened */}
              <View style={{ width:52, alignItems:'center' }}>
                <Text style={{ color: act?.opened ? '#10b981' : '#ef4444', fontSize:13 }}>{act?.opened ? '✅' : '❌'}</Text>
                {act?.openedAt && <Text style={{ color: theme.textMuted, fontSize:9 }}>{new Date(act.openedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</Text>}
              </View>

              {/* Watched % */}
              <View style={{ width:52, alignItems:'center' }}>
                {act ? (
                  <>
                    <Text style={{ color: pctColor, fontWeight:'700', fontSize:13 }}>{pct}%</Text>
                    <Text style={{ color: theme.textMuted, fontSize:9 }}>{Math.floor((act.watchedSeconds||0)/60)}m</Text>
                  </>
                ) : <Text style={{ color:'#64748b' }}>—</Text>}
              </View>

              {/* Status */}
              <View style={{ width:60, alignItems:'center' }}>
                <Text style={{ fontSize:11, fontWeight:'700', color: status === 'present' ? '#10b981' : status === 'absent' ? '#ef4444' : '#64748b' }}>
                  {status === 'present' ? '✅ P' : status === 'absent' ? '❌ A' : '—'}
                </Text>
              </View>

              {/* Mark Buttons */}
              <View style={{ width:80, flexDirection:'row', gap:4, justifyContent:'center' }}>
                {isLocked ? (
                  <Text style={{ color: theme.textMuted, fontSize:11 }}>🔒 Final</Text>
                ) : saving[sid] ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={{ backgroundColor: status === 'present' ? '#10b981' : '#10b98120', borderRadius:16, paddingHorizontal:8, paddingVertical:4, borderWidth:1, borderColor:'#10b98140' }}
                      onPress={() => markAttendance(sid, 'present')}
                    >
                      <Text style={{ color: status === 'present' ? '#fff' : '#10b981', fontWeight:'700', fontSize:11 }}>✅P</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: status === 'absent' ? '#ef4444' : '#ef444420', borderRadius:16, paddingHorizontal:8, paddingVertical:4, borderWidth:1, borderColor:'#ef444440' }}
                      onPress={() => markAttendance(sid, 'absent')}
                    >
                      <Text style={{ color: status === 'absent' ? '#fff' : '#ef4444', fontWeight:'700', fontSize:11 }}>❌A</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:       { borderRadius:14, padding:14, borderWidth:1 },
  dateBtn:    { paddingHorizontal:14, paddingVertical:8, borderRadius:10, backgroundColor:'#7c6af520' },
  quickBtn:   { paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1 },
  bulkBtn50:  { backgroundColor:'#10b98120', borderRadius:20, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'#10b98140' },
  bulkBtn75:  { backgroundColor:'#185FA520', borderRadius:20, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'#185FA540' },
  bulkBtnAll: { backgroundColor:'#ef444420', borderRadius:20, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'#ef444440' },
  colHead:    { fontSize:10, fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 },
  studentRow: { flexDirection:'row', alignItems:'center', padding:12, borderRadius:12, borderWidth:1 },
});
