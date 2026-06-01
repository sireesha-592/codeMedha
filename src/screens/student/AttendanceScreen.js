import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const { width: SW } = Dimensions.get('window');

const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return [val];
  return [];
};

const isSunday = (dateStr) => new Date(dateStr + 'T00:00:00').getDay() === 0;

export default function AttendanceScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [dateData,     setDateData]     = useState({});
  const [stats,        setStats]        = useState({ attendancePercentage:0, present:0, absent:0, currentStreak:0 });
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [marking,      setMarking]      = useState(false);
  const [courseId,     setCourseId]     = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (!loading) loadMonthData(); }, [currentMonth, currentYear]);

  const loadAll = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      // Stats
      const sRes = await api.get(`${API}/api/attendance/stats`, { headers: h }).catch(() => null);
      if (sRes?.data) setStats(sRes.data);
      // CourseId
      const cRes = await api.get(`${API}/api/courses/${user._id}`, { headers: h }).catch(() => null);
      const courses = Array.isArray(cRes?.data) ? cRes.data : [];
      if (courses.length > 0) setCourseId(courses[0]._id);
      // Month data
      await loadMonthData(h, user._id);
    } catch(e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadMonthData = async (headers, userId) => {
    try {
      const h   = headers || { Authorization: `Bearer ${token}` };
      const uid = userId || user._id;
      const mm  = String(currentMonth + 1).padStart(2, '0');
      const prefix = `${currentYear}-${mm}`;

      const [attRes, subRes, clsRes] = await Promise.allSettled([
        api.get(`${API}/api/attendance/${uid}`, { headers: h }),
        api.get(`${API}/api/submissions/all`,   { headers: h }),
        api.get(`${API}/api/classes/all?year=${currentYear}&month=${mm}`, { headers: h }),
      ]);

      const allAtt  = attRes.status === 'fulfilled' ? toArray(attRes.value.data)  : [];
      const allSubs = subRes.status === 'fulfilled' ? toArray(subRes.value.data)  : [];
      const allCls  = clsRes.status === 'fulfilled' ? toArray(clsRes.value.data)  : [];

      const attList = allAtt.filter(a => a.date?.startsWith(prefix));
      const subList = allSubs.filter(s => s.date?.startsWith(prefix));
      const clsList = allCls.filter(c => (c.date||'').split('T')[0].startsWith(prefix));

      const attMap = {};
      attList.forEach(a => { attMap[a.date] = attMap[a.date] ? [...attMap[a.date], a] : [a]; });
      const subMap = {};
      subList.forEach(s => { subMap[s.date] = s; });
      const clsMap = {};
      clsList.forEach(c => { const d = (c.date||'').split('T')[0]; clsMap[d] = c; });

      const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
      const result = {};
      for (let day = 1; day <= totalDays; day++) {
        const dd = String(day).padStart(2,'0');
        const dateStr = `${currentYear}-${mm}-${dd}`;
        const cellMid = new Date(dateStr + 'T00:00:00');

        if (isSunday(dateStr)) { result[dateStr] = { status:'sunday', att:[], sub:null, cls:null }; continue; }
        if (cellMid > todayMid) { result[dateStr] = { status:'future', att:[], sub:null, cls:null }; continue; }

        const att = attMap[dateStr] || [];
        const sub = subMap[dateStr] || null;
        const cls = clsMap[dateStr] || null;

        let status = 'none';
        if (att.length > 0) {
          const present = att.some(a => a.status === 'present');
          status = !present ? 'absent' : (sub?.status === 'submitted') ? 'complete' : 'pending';
        }
        result[dateStr] = { status, att, sub, cls };
      }
      setDateData(result);
    } catch(e) {}
  };

  const markAttendance = async () => {
    if (!courseId) return;
    setMarking(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      await api.post(`${API}/api/attendance/mark`, { courseId }, { headers: h });
      await loadAll();
    } catch(e) {}
    finally { setMarking(false); }
  };

  const formatDate = (day) => {
    const mm = String(currentMonth + 1).padStart(2,'0');
    const dd = String(day).padStart(2,'0');
    return `${currentYear}-${mm}-${dd}`;
  };

  const isToday = (day) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const statusColor = (status) => {
    if (status === 'complete') return '#10b981';
    if (status === 'pending')  return '#f59e0b';
    if (status === 'absent')   return '#ef4444';
    return null;
  };

  const getDaysInMonth = () => {
    const firstDay  = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  };

  const todayMarked = dateData[todayStr]?.att?.some(a => a.status === 'present') || false;

  const onDayPress = (day) => {
    const dateStr = formatDate(day);
    const data = dateData[dateStr];
    if (!data || data.status === 'future') return;
    setSelectedDate(dateStr);
    setModalVisible(true);
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); }
    else setCurrentMonth(m => m-1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); }
    else setCurrentMonth(m => m+1);
  };

  if (loading) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: theme.pageBg }}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );

  const days = getDaysInMonth();
  const selData = selectedDate ? dateData[selectedDate] : null;
  const selStatus = selData?.status || 'none';
  const selColor = statusColor(selStatus) || '#64748b';
  const selSub = selData?.sub;
  const selCls = selData?.cls;
  const selAtt = toArray(selData?.att);
  const selPresent = selAtt.some(a => a.status === 'present');

  const secAAnswered = (selSub?.secA?.answers||[]).filter(a=>a.isAnswered).length;
  const secBAnswered = (selSub?.secB?.answers||[]).filter(a=>a.isAnswered).length;
  const secCAnswered = (selSub?.secC?.answers||[]).filter(a=>a.isAnswered).length;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Attendance</Text>
        <View style={{ width:32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor={theme.accent} />}
      >
        {/* Stats */}
        <View style={{ flexDirection:'row', backgroundColor:'#0f172a', borderRadius:14, padding:14, gap:8 }}>
          {[
            { label:'Attendance', value:`${Math.round(stats.attendancePercentage||0)}%`, icon:'📊' },
            { label:'Present',    value: stats.present||0,        icon:'✅' },
            { label:'Absent',     value: stats.absent||0,         icon:'🔴' },
            { label:'Streak',     value: `${stats.currentStreak||0}🔥`, icon:'' },
          ].map((st,i) => (
            <View key={i} style={{ flex:1, alignItems:'center' }}>
              <Text style={{ color:'#f1f5f9', fontSize:16, fontWeight:'800' }}>{st.value}</Text>
              <Text style={{ color:'#64748b', fontSize:9, marginTop:2, textAlign:'center' }}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Mark Button */}
        <TouchableOpacity
          style={{ backgroundColor: todayMarked ? theme.border : theme.accent, borderRadius:14, padding:16, alignItems:'center' }}
          onPress={markAttendance}
          disabled={todayMarked || marking}
        >
          {marking
            ? <ActivityIndicator color="#000" />
            : <Text style={{ fontWeight:'700', fontSize:15, color: todayMarked ? theme.textMuted : '#000' }}>
                {todayMarked ? '✅ Marked for Today' : '📍 Mark Today\'s Attendance'}
              </Text>
          }
        </TouchableOpacity>

        {/* Calendar */}
        <View style={[s.calBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Nav */}
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
              <Text style={{ color: theme.accent, fontSize:22, fontWeight:'700' }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.textPrimary, fontSize:16, fontWeight:'700' }}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
              <Text style={{ color: theme.accent, fontSize:22, fontWeight:'700' }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={{ flexDirection:'row', marginBottom:8 }}>
            {DAYS.map(d => (
              <Text key={d} style={{ flex:1, textAlign:'center', fontSize:10, fontWeight:'600', color: d==='Sun' ? '#ef4444' : theme.textMuted }}>{d}</Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
            {days.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={{ width:'14.28%' }} />;
              const dateStr = formatDate(day);
              const data    = dateData[dateStr];
              const status  = data?.status || 'none';
              const color   = statusColor(status);
              const todayCell = isToday(day);
              const isSun   = status === 'sunday';
              const isFuture = status === 'future';
              const hasClass = !!data?.cls;

              let bgColor = 'transparent';
              let textColor = theme.textPrimary;
              if (isSun || isFuture) { textColor = theme.textMuted; }
              else if (color) { bgColor = color; textColor = '#fff'; }
              else if (todayCell) { bgColor = '#1e3a5f'; textColor = '#fff'; }

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={{ width:'14.28%', alignItems:'center', marginBottom:8 }}
                  onPress={() => !isFuture && !isSun && onDayPress(day)}
                  disabled={isFuture || isSun}
                >
                  <View style={[
                    s.dayCircle,
                    { backgroundColor: bgColor },
                    todayCell && !color && { borderWidth:2, borderColor: theme.accent },
                  ]}>
                    <Text style={{ fontSize:12, color: textColor, fontWeight: todayCell ? '700' : '400' }}>{day}</Text>
                    {!color && hasClass && !isSun && !isFuture && (
                      <View style={{ width:4, height:4, borderRadius:2, backgroundColor:'#f59e0b', marginTop:1 }} />
                    )}
                    {color && (
                      <View style={{ width:4, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.6)', marginTop:1 }} />
                    )}
                  </View>
                  {isSun && <Text style={{ fontSize:7, color: theme.textMuted, marginTop:1 }}>off</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection:'row', justifyContent:'center', gap:16, marginTop:10 }}>
            {[
              { color:'#10b981', label:'Completed' },
              { color:'#f59e0b', label:'Pending' },
              { color:'#ef4444', label:'Absent' },
            ].map((l,i) => (
              <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor: l.color }} />
                <Text style={{ color: theme.textMuted, fontSize:10 }}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Date Detail Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity style={[s.modalBox, { backgroundColor:'#0f172a' }]} activeOpacity={1}>
            {/* Color bar */}
            <View style={{ height:4, backgroundColor: selColor, borderTopLeftRadius:18, borderTopRightRadius:18 }} />
            <View style={{ padding:20 }}>
              {/* Date + status */}
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <Text style={{ color:'#e2e8f0', fontSize:15, fontWeight:'700' }}>{selectedDate}</Text>
                <View style={{ backgroundColor: selColor+'22', paddingHorizontal:10, paddingVertical:4, borderRadius:20 }}>
                  <Text style={{ color: selColor, fontSize:11, fontWeight:'700' }}>
                    {selStatus==='complete' ? '✓ Completed' : selStatus==='pending' ? '⏳ In Progress' : selStatus==='absent' ? '✗ Absent' : selStatus==='sunday' ? '😴 Holiday' : '— No class'}
                  </Text>
                </View>
              </View>

              {/* Attendance + Class pills */}
              <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
                <View style={[s.pill, { backgroundColor: (selPresent && selAtt.length>0) ? '#10b98122' : '#64748b22' }]}>
                  <Text style={{ color: (selPresent && selAtt.length>0) ? '#10b981' : '#64748b', fontSize:11, fontWeight:'600' }}>
                    {selAtt.length>0 ? (selPresent ? '✓ Present' : '✗ Absent') : selCls ? '📋 No record' : '📅 No Class'}
                  </Text>
                </View>
                <View style={[s.pill, { backgroundColor: selCls ? '#f59e0b22' : '#64748b22' }]}>
                  <Text style={{ color: selCls ? '#f59e0b' : '#64748b', fontSize:11, fontWeight:'600' }}>
                    {selCls ? '⏹ Class' : '○ No Class'}
                  </Text>
                </View>
              </View>

              {/* Assignment progress */}
              {(selAtt.length>0 || selCls) && (
                <>
                  <Text style={{ color:'#94a3b8', fontSize:10, fontWeight:'600', letterSpacing:1, marginBottom:10 }}>ASSIGNMENT PROGRESS</Text>
                  {[
                    { label:'Easy',   answered: secAAnswered, total: selSub?.secA?.total??20, color:'#10b981' },
                    { label:'Medium', answered: secBAnswered, total: selSub?.secB?.total??20, color:'#f59e0b' },
                    { label:'Hard',   answered: secCAnswered, total: selSub?.secC?.total??10, color:'#8b5cf6' },
                  ].map(sec => (
                    <View key={sec.label} style={{ marginBottom:10 }}>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                        <Text style={{ color:'#cbd5e1', fontSize:12 }}>{sec.label}</Text>
                        <Text style={{ color: sec.color, fontSize:12, fontWeight:'700' }}>{sec.answered}/{sec.total}</Text>
                      </View>
                      <View style={{ height:4, backgroundColor:'#1e293b', borderRadius:4 }}>
                        <View style={{ height:'100%', borderRadius:4, backgroundColor: sec.color, width: `${Math.min((sec.answered/sec.total)*100,100)}%` }} />
                      </View>
                    </View>
                  ))}
                  <View style={{ alignItems:'center', marginTop:4 }}>
                    <Text style={{ color: selSub?.status==='submitted' ? '#10b981' : '#f59e0b', fontSize:12, fontWeight:'700' }}>
                      {selSub?.status==='submitted' ? '✅ Assignment Submitted' : '⏳ Assignment Pending'}
                    </Text>
                  </View>
                </>
              )}

              <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
                <TouchableOpacity 
                  style={{ flex:1, alignItems:'center', padding:12, borderRadius:10, backgroundColor:'#1e293b' }} 
                  onPress={() => setModalVisible(false)}>
                  <Text style={{ color:'#94a3b8', fontSize:13, fontWeight:'600' }}>Close</Text>
                </TouchableOpacity>
                {(selAtt.length>0 || selCls) && (
                  <TouchableOpacity 
                    style={{ flex:1, alignItems:'center', padding:12, borderRadius:10, backgroundColor:'#8b5cf6' }} 
                    onPress={() => { setModalVisible(false); navigation.navigate('Tasks', { date: selectedDate }); }}>
                    <Text style={{ color:'#fff', fontSize:13, fontWeight:'700' }}>📝 Open Assignment</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  calBox:      { borderRadius:16, padding:14, borderWidth:1 },
  navBtn:      { padding:8 },
  dayCircle:   { width:34, height:34, borderRadius:17, alignItems:'center', justifyContent:'center' },
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  modalBox:    { borderTopLeftRadius:18, borderTopRightRadius:18, overflow:'hidden' },
  pill:        { flex:1, alignItems:'center', paddingVertical:6, borderRadius:8 },
});
