import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, Linking, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const TECH_STYLES = {
  'mongodb':    { color:'#13aa52', icon:'🍃', desc:'NoSQL Database' },
  'express':    { color:'#353535', icon:'⚡', desc:'Backend Framework' },
  'express.js': { color:'#353535', icon:'⚡', desc:'Backend Framework' },
  'react':      { color:'#20232a', icon:'⚛️', desc:'Frontend Library' },
  'react.js':   { color:'#20232a', icon:'⚛️', desc:'Frontend Library' },
  'node':       { color:'#026e00', icon:'🟢', desc:'Runtime Environment' },
  'node.js':    { color:'#026e00', icon:'🟢', desc:'Runtime Environment' },
  'javascript': { color:'#f7df1e', icon:'📜', desc:'Programming Language', textDark:true },
  'html':       { color:'#e34f26', icon:'🌐', desc:'Markup Language' },
  'css':        { color:'#264de4', icon:'🎨', desc:'Styling Language' },
  'git':        { color:'#f05032', icon:'🔀', desc:'Version Control' },
  'github':     { color:'#24292e', icon:'🐙', desc:'Code Hosting' },
  'rest api':   { color:'#ff6b35', icon:'🔗', desc:'API Architecture' },
  'jwt':        { color:'#d63aff', icon:'🔐', desc:'Auth Tokens' },
  'socket.io':  { color:'#010101', icon:'📡', desc:'Real-time' },
  'typescript': { color:'#3178c6', icon:'📘', desc:'Typed JavaScript' },
  'python':     { color:'#3776ab', icon:'🐍', desc:'Programming Language' },
  'docker':     { color:'#2496ed', icon:'🐳', desc:'Containerization' },
  'aws':        { color:'#ff9900', icon:'☁️', desc:'Cloud Platform', textDark:true },
  'vs code':    { color:'#007acc', icon:'💻', desc:'Code Editor' },
};
const FALLBACK = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6','#ef4444'];
const getTechStyle = (name, idx) => TECH_STYLES[name.toLowerCase().trim()] || { color: FALLBACK[idx % FALLBACK.length], icon:'🔧', desc:'Technology' };

const MERN_ROADMAP = [
  { phase:'Phase 1', title:'Web Fundamentals',       weeks:'Week 1–2',  color:'#e34f26', topics:['HTML5 — Semantic tags, Forms, Tables','CSS3 — Flexbox, Grid, Animations','Responsive Design — Media queries','JavaScript Basics — Variables, Loops, Functions'] },
  { phase:'Phase 2', title:'JavaScript Deep Dive',   weeks:'Week 3–4',  color:'#f7df1e', topics:['ES6+ — Arrow functions, Destructuring, Spread','Async JS — Promises, async/await','DOM Manipulation','Fetch API & JSON'] },
  { phase:'Phase 3', title:'React Frontend',         weeks:'Week 5–7',  color:'#61dafb', topics:['React Basics — JSX, Components, Props','State & Hooks — useState, useEffect','React Router — Navigation','Axios — API calls from React'] },
  { phase:'Phase 4', title:'Node.js & Express',      weeks:'Week 8–10', color:'#68a063', topics:['Node.js — Modules, File system','Express.js — Routes, Middleware, REST APIs','JWT Authentication','File uploads — Multer'] },
  { phase:'Phase 5', title:'MongoDB Database',       weeks:'Week 11–12',color:'#13aa52', topics:['MongoDB — CRUD operations','Mongoose — Schemas, Models','Relationships — Populate','Aggregation Pipeline'] },
  { phase:'Phase 6', title:'Full Stack Integration', weeks:'Week 13–14',color:'#7c6af5', topics:['Connect React ↔ Express ↔ MongoDB','Real-time features with Socket.IO','Deployment — Environment variables','Final Project — Complete MERN app'] },
];

export default function MyCourseScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [courseInfo,    setCourseInfo]    = useState(null);
  const [courseId,      setCourseId]      = useState(user?.enrolledCourse || null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [activePhase,   setActivePhase]   = useState(null);
  const [showResources, setShowResources] = useState(false);
  const [showNotes,     setShowNotes]     = useState(false);
  const [showDoubts,    setShowDoubts]    = useState(false);
  const [resources,     setResources]     = useState([]);
  const [sessionNotes,  setSessionNotes]  = useState([]);
  const [doubts,        setDoubts]        = useState([]);
  const [doubtQ,        setDoubtQ]        = useState('');
  const [doubtPri,      setDoubtPri]      = useState('medium');
  const [expandedNotes, setExpandedNotes] = useState({});
  const [resLoading,    setResLoading]    = useState(false);
  const [notesLoading,  setNotesLoading]  = useState(false);
  const [doubtLoading,  setDoubtLoading]  = useState(false);

  useEffect(() => { fetchCourse(); }, [token]);

  const fetchCourse = async () => {
    try {
      const meRes = await api.get(`${API}/api/auth/me`, { headers });
      const freshUser = meRes.data;
      const resolvedId = freshUser?.enrolledCourse || courseId;
      if (resolvedId) {
        const courseRes = await api.get(`${API}/api/courses/id/${resolvedId}`, { headers });
        setCourseInfo(courseRes.data);
        setCourseId(resolvedId);
      } else {
        const listRes = await api.get(`${API}/api/courses/${freshUser?._id}`, { headers });
        const list = listRes.data || [];
        if (list.length > 0) { setCourseId(list[0]._id); setCourseInfo(list[0]); }
      }
    } catch(e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadResources = useCallback(async () => {
    if (!courseId) return;
    setResLoading(true);
    try {
      const res = await api.get(`${API}/api/resources?courseId=${courseId}`, { headers });
      setResources(res.data || []);
    } catch {}
    setResLoading(false);
  }, [courseId, token]);

  const loadNotes = useCallback(async () => {
    if (!courseId) return;
    setNotesLoading(true);
    try {
      const res = await api.get(`${API}/api/session-notes?courseId=${courseId}`, { headers });
      setSessionNotes(res.data || []);
    } catch {}
    setNotesLoading(false);
  }, [courseId, token]);

  const loadDoubts = useCallback(async () => {
    if (!courseId) return;
    setDoubtLoading(true);
    try {
      const res = await api.get(`${API}/api/doubts/mine?courseId=${courseId}`, { headers });
      setDoubts(res.data || []);
    } catch {}
    setDoubtLoading(false);
  }, [courseId, token]);

  useEffect(() => { if (showResources) loadResources(); }, [showResources]);
  useEffect(() => { if (showNotes) loadNotes(); }, [showNotes]);
  useEffect(() => { if (showDoubts) loadDoubts(); }, [showDoubts]);

  const submitDoubt = async () => {
    if (!doubtQ.trim()) return;
    try {
      const res = await api.post(`${API}/api/doubts`, { courseId, question: doubtQ.trim(), priority: doubtPri }, { headers });
      setDoubts(prev => [res.data, ...prev]);
      setDoubtQ('');
      Alert.alert('✅ Submitted', 'Doubt submitted! Trainer will resolve it.');
    } catch(e) {
      Alert.alert('Error', 'Failed to submit. Try again.');
    }
  };

  const adminTechs = courseInfo?.technologies?.filter(Boolean) || [];
  const hasTechs   = adminTechs.length > 0;
  const techList   = hasTechs ? adminTechs : ['MongoDB','Express.js','React','Node.js','JavaScript','HTML5','CSS3','Git','REST API','JWT','Socket.IO','VS Code'];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📚 My Course</Text>
        <View style={{ width:30 }} />
      </View>

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom:40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCourse(); }} tintColor={theme.accent} />}
        >
          {/* Hero */}
          <View style={{ backgroundColor:'#0f172a', padding:24 }}>
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:16 }}>
              <View style={{ width:52, height:52, borderRadius:14, backgroundColor:'#7c6af5', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:24 }}>⚡</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#00d4aa', fontSize:11, fontWeight:'700', letterSpacing:1.5, marginBottom:4 }}>YOUR ENROLLED COURSE</Text>
                <Text style={{ color:'#fff', fontSize:20, fontWeight:'800', lineHeight:26 }}>
                  {courseInfo?.title || 'MERN Full Stack Development'}
                </Text>
                <Text style={{ color:'#94a3b8', fontSize:12, marginTop:8, lineHeight:18 }}>
                  {courseInfo?.description || 'Master the complete MERN stack — from HTML/CSS basics to building full-stack web applications.'}
                </Text>
                <View style={{ flexDirection:'row', gap:8, marginTop:12, flexWrap:'wrap' }}>
                  {[`⏱ 14 Weeks`, `📦 6 Phases`, `🛠 ${techList.length} Tech`].map((t,i) => (
                    <View key={i} style={{ backgroundColor:'#ffffff15', borderRadius:20, paddingHorizontal:10, paddingVertical:4 }}>
                      <Text style={{ color:'#e2e8f0', fontSize:11, fontWeight:'600' }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={{ padding:16, gap:16 }}>

            {/* Syllabus */}
            {courseInfo?.syllabus?.length > 0 && (
              <View>
                <Text style={[s.sectionTitle, { color: theme.textMuted }]}>📋 Course Syllabus</Text>
                {courseInfo.syllabus.map((s, i) => (
                  <View key={i} style={[s.syllabusCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Text style={{ color:'#7c6af5', fontSize:11, fontWeight:'700', marginBottom:4 }}>{s.week || `Module ${i+1}`}</Text>
                    <Text style={{ color: theme.textPrimary, fontSize:13, lineHeight:20 }}>{s.topics}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Technologies */}
            <View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 }}>
                <Text style={[s.sectionTitle, { color: theme.textMuted, marginBottom:0 }]}>🛠 Technologies</Text>
                <View style={{ backgroundColor: hasTechs ? '#10b98120' : '#f59e0b20', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}>
                  <Text style={{ color: hasTechs ? '#10b981' : '#f59e0b', fontSize:10, fontWeight:'700' }}>{hasTechs ? 'Set by Admin' : 'Default Stack'}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:10, flexDirection:'row' }}>
                {techList.map((name, idx) => {
                  const ts = getTechStyle(name, idx);
                  return (
                    <View key={name} style={{ backgroundColor: ts.color, borderRadius:12, padding:12, alignItems:'center', gap:4, minWidth:80 }}>
                      <Text style={{ fontSize:20 }}>{ts.icon}</Text>
                      <Text style={{ color: ts.textDark ? '#000' : '#fff', fontSize:11, fontWeight:'700', textAlign:'center' }}>{name}</Text>
                      <Text style={{ color: ts.textDark ? '#00000099' : '#ffffff99', fontSize:9, textAlign:'center' }}>{ts.desc}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Roadmap */}
            <View>
              <Text style={[s.sectionTitle, { color: theme.textMuted }]}>🗺️ Learning Roadmap</Text>
              {MERN_ROADMAP.map((phase, idx) => {
                const isOpen = activePhase === idx;
                return (
                  <View key={idx} style={[s.phaseCard, { backgroundColor: theme.cardBg, borderColor: isOpen ? phase.color : theme.border }]}>
                    <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', gap:12, padding:14 }} onPress={() => setActivePhase(isOpen ? null : idx)}>
                      <View style={{ width:34, height:34, borderRadius:10, backgroundColor: phase.color, alignItems:'center', justifyContent:'center' }}>
                        <Text style={{ color:'#fff', fontWeight:'800', fontSize:13 }}>{idx+1}</Text>
                      </View>
                      <View style={{ flex:1 }}>
                        <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700' }}>{phase.title}</Text>
                        <Text style={{ color: theme.textMuted, fontSize:11, marginTop:2 }}>{phase.phase} • {phase.weeks}</Text>
                      </View>
                      <Text style={{ color: theme.textMuted, fontSize:12, backgroundColor: theme.pageBg, paddingHorizontal:8, paddingVertical:3, borderRadius:8 }}>{phase.topics.length} topics</Text>
                      <Text style={{ color: theme.textMuted }}>{isOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={{ borderTopWidth:1, borderTopColor: theme.border, padding:14, paddingLeft:60, gap:8 }}>
                        {phase.topics.map((topic, ti) => (
                          <View key={ti} style={{ flexDirection:'row', gap:10, alignItems:'flex-start' }}>
                            <View style={{ width:6, height:6, borderRadius:3, backgroundColor: phase.color, marginTop:6 }} />
                            <Text style={{ color: theme.textPrimary, fontSize:13, flex:1, lineHeight:20 }}>{topic}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Resources */}
            <View>
              <TouchableOpacity style={[s.sectionToggle, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setShowResources(v => !v)}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
                  <Text style={{ fontSize:18 }}>📚</Text>
                  <View>
                    <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700' }}>Trainer Resources</Text>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>Study materials shared by trainer</Text>
                  </View>
                  {resources.length > 0 && <View style={{ backgroundColor:'#7c6af520', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}><Text style={{ color:'#7c6af5', fontWeight:'700', fontSize:11 }}>{resources.length}</Text></View>}
                </View>
                <Text style={{ color: theme.textMuted }}>{showResources ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showResources && (
                resLoading ? <ActivityIndicator color={theme.accent} style={{ padding:20 }} /> :
                resources.length === 0 ? (
                  <View style={[s.emptyBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Text style={{ fontSize:28 }}>📭</Text>
                    <Text style={{ color: theme.textMuted, marginTop:8 }}>No resources shared yet</Text>
                  </View>
                ) : resources.map(r => {
                  const typeIcons = { link:'🔗', pdf:'📄', video:'🎥', note:'📝', tool:'🛠️' };
                  const typeColors = { link:'#3b82f6', pdf:'#ef4444', video:'#a78bfa', note:'#10b981', tool:'#f59e0b' };
                  const color = typeColors[r.type] || '#64748b';
                  return (
                    <View key={r._id} style={[s.resourceCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                      <View style={{ height:3, backgroundColor: color, borderRadius:3 }} />
                      <View style={{ padding:12 }}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
                          <Text>{typeIcons[r.type] || '📎'}</Text>
                          <Text style={{ color: theme.textPrimary, fontSize:13, fontWeight:'700', flex:1 }}>{r.title}</Text>
                        </View>
                        {r.desc && <Text style={{ color: theme.textMuted, fontSize:11, marginBottom:8 }}>{r.desc}</Text>}
                        {r.url && (
                          <TouchableOpacity onPress={() => Linking.openURL(r.url.startsWith('/uploads') ? `${API}${r.url}` : r.url)} style={{ alignSelf:'flex-start', backgroundColor:'#3b82f615', borderRadius:8, paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:'#3b82f630' }}>
                            <Text style={{ color:'#3b82f6', fontSize:12, fontWeight:'600' }}>{r.url.startsWith('/uploads') ? '⬇️ Download' : 'Open ↗'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Session Notes */}
            <View>
              <TouchableOpacity style={[s.sectionToggle, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setShowNotes(v => !v)}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
                  <Text style={{ fontSize:18 }}>🗒️</Text>
                  <View>
                    <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700' }}>Session Notes</Text>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>Class notes shared by trainer</Text>
                  </View>
                  {sessionNotes.length > 0 && <View style={{ backgroundColor:'#10b98120', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}><Text style={{ color:'#10b981', fontWeight:'700', fontSize:11 }}>{sessionNotes.length}</Text></View>}
                </View>
                <Text style={{ color: theme.textMuted }}>{showNotes ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showNotes && (
                notesLoading ? <ActivityIndicator color={theme.accent} style={{ padding:20 }} /> :
                sessionNotes.length === 0 ? (
                  <View style={[s.emptyBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Text style={{ fontSize:28 }}>📭</Text>
                    <Text style={{ color: theme.textMuted, marginTop:8 }}>No session notes shared yet</Text>
                  </View>
                ) : sessionNotes.map(n => {
                  const isOpen = !!expandedNotes[n._id];
                  return (
                    <View key={n._id} style={{ backgroundColor: theme.cardBg, borderWidth:1, borderColor: theme.border, borderLeftWidth:4, borderLeftColor:'#10b981', borderRadius:12, marginBottom:8, overflow:'hidden' }}>
                      <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12 }} onPress={() => setExpandedNotes(prev => ({ ...prev, [n._id]: !prev[n._id] }))}>
                        <View style={{ flex:1 }}>
                          <Text style={{ color: theme.textPrimary, fontSize:13, fontWeight:'700' }} numberOfLines={1}>{n.topic}</Text>
                          <Text style={{ color: theme.textMuted, fontSize:11 }}>{n.date}</Text>
                        </View>
                        <Text style={{ color: theme.textMuted }}>{isOpen ? '▲' : '▼'}</Text>
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={{ borderTopWidth:1, borderTopColor: theme.border, padding:12 }}>
                          {(n.tags||[]).length > 0 && (
                            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                              {n.tags.map((t,i) => <View key={t} style={{ backgroundColor:'#3b82f620', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}><Text style={{ color:'#3b82f6', fontSize:10, fontWeight:'600' }}>{t}</Text></View>)}
                            </View>
                          )}
                          <Text style={{ color: theme.textPrimary, fontSize:13, lineHeight:20 }}>{n.content}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Ask a Doubt */}
            <View>
              <TouchableOpacity style={[s.sectionToggle, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setShowDoubts(v => !v)}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
                  <Text style={{ fontSize:18 }}>❓</Text>
                  <View>
                    <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700' }}>Ask a Doubt</Text>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>Submit questions to trainer</Text>
                  </View>
                  {doubts.filter(d => d.status === 'pending').length > 0 && <View style={{ backgroundColor:'#f59e0b20', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}><Text style={{ color:'#f59e0b', fontWeight:'700', fontSize:11 }}>{doubts.filter(d=>d.status==='pending').length} pending</Text></View>}
                </View>
                <Text style={{ color: theme.textMuted }}>{showDoubts ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDoubts && (
                <View style={[s.doubtBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={{ color: theme.textPrimary, fontSize:13, fontWeight:'700', marginBottom:12 }}>💬 Submit a New Doubt</Text>
                  <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
                    {['high','medium','low'].map(p => (
                      <TouchableOpacity key={p} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:8, backgroundColor: doubtPri === p ? '#7c6af5' : theme.pageBg, borderWidth:1, borderColor: doubtPri === p ? '#7c6af5' : theme.border }} onPress={() => setDoubtPri(p)}>
                        <Text style={{ color: doubtPri === p ? '#fff' : theme.textMuted, fontSize:12, fontWeight:'600' }}>{p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[s.doubtInput, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Describe your doubt clearly…"
                    placeholderTextColor={theme.textMuted}
                    value={doubtQ}
                    onChangeText={setDoubtQ}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity style={[s.submitBtn, { backgroundColor: doubtQ.trim() ? '#7c6af5' : '#374151' }]} onPress={submitDoubt} disabled={!doubtQ.trim()}>
                    <Text style={{ color:'#fff', fontWeight:'700', fontSize:14 }}>📤 Submit Doubt</Text>
                  </TouchableOpacity>

                  {doubtLoading ? <ActivityIndicator color={theme.accent} style={{ padding:16 }} /> :
                  doubts.length > 0 && (
                    <View style={{ marginTop:16, gap:10 }}>
                      <Text style={{ color: theme.textMuted, fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:1 }}>My Submitted Doubts</Text>
                      {doubts.map(d => {
                        const pColors = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };
                        const pColor = pColors[d.priority] || '#64748b';
                        return (
                          <View key={d._id} style={{ backgroundColor: theme.pageBg, borderWidth:1, borderColor: theme.border, borderLeftWidth:4, borderLeftColor: d.status === 'resolved' ? '#10b981' : pColor, borderRadius:10, padding:12 }}>
                            <View style={{ flexDirection:'row', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                              <View style={{ backgroundColor: pColor + '20', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}><Text style={{ color: pColor, fontSize:10, fontWeight:'700' }}>{d.priority?.toUpperCase()}</Text></View>
                              <View style={{ backgroundColor: d.status === 'resolved' ? '#10b98120' : '#f59e0b20', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}>
                                <Text style={{ color: d.status === 'resolved' ? '#10b981' : '#f59e0b', fontSize:10, fontWeight:'700' }}>{d.status === 'resolved' ? '✅ RESOLVED' : '⏳ PENDING'}</Text>
                              </View>
                            </View>
                            <Text style={{ color: theme.textPrimary, fontSize:13, marginBottom:6 }}>{d.question}</Text>
                            {d.status === 'resolved' && d.answer && (
                              <View style={{ backgroundColor:'#10b98110', borderLeftWidth:3, borderLeftColor:'#10b981', borderRadius:8, padding:10 }}>
                                <Text style={{ color:'#10b981', fontSize:10, fontWeight:'700', marginBottom:4 }}>💡 Trainer's Answer</Text>
                                <Text style={{ color: theme.textPrimary, fontSize:12, lineHeight:18 }}>{d.answer}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View style={{ flexDirection:'row', gap:10, flexWrap:'wrap' }}>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Classes')}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>🎥 Today's Class</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: theme.cardBg, borderWidth:1, borderColor: theme.border }]} onPress={() => navigation.navigate('Tasks')}>
                <Text style={{ color: theme.textPrimary, fontWeight:'600', fontSize:13 }}>📝 Today's Assignment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: theme.cardBg, borderWidth:1, borderColor: theme.border }]} onPress={() => navigation.navigate('Stats')}>
                <Text style={{ color: theme.textPrimary, fontWeight:'600', fontSize:13 }}>📊 My Progress</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:  { fontSize:17, fontWeight:'700' },
  sectionTitle: { fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 },
  syllabusCard: { borderRadius:12, padding:14, borderWidth:1, borderLeftWidth:3, borderLeftColor:'#7c6af5', marginBottom:8 },
  phaseCard:    { borderRadius:14, borderWidth:1, marginBottom:8, overflow:'hidden' },
  sectionToggle:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:14, borderRadius:14, borderWidth:1, marginBottom:8 },
  emptyBox:     { alignItems:'center', padding:24, borderRadius:14, borderWidth:1, marginBottom:8 },
  resourceCard: { borderRadius:12, borderWidth:1, marginBottom:8, overflow:'hidden' },
  doubtBox:     { borderRadius:14, borderWidth:1, padding:16, marginBottom:8 },
  doubtInput:   { borderWidth:1, borderRadius:10, padding:12, fontSize:13, marginBottom:10, minHeight:80 },
  submitBtn:    { borderRadius:10, padding:12, alignItems:'center', marginBottom:4 },
  actionBtn:    { backgroundColor:'#7c6af5', borderRadius:12, paddingHorizontal:16, paddingVertical:12 },
});
