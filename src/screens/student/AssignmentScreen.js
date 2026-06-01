// src/screens/student/AssignmentScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';
import CodeEditorModal from '../../components/CodeEditorModal';

const { width: SW } = Dimensions.get('window');

const SEC_INFO = {
  A: { label:'Section A', level:'Easy',   total:20, min:10, marks:1, color:'#1D9E75', bg:'#1D9E7515' },
  B: { label:'Section B', level:'Medium', total:20, min:10, marks:3, color:'#185FA5', bg:'#185FA515' },
  C: { label:'Section C', level:'Hard',   total:10, min:5,  marks:5, color:'#534AB7', bg:'#534AB715' },
};

export default function AssignmentScreen({ route }) {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const date = route?.params?.date || new Date().toISOString().split('T')[0];

  const [questions,     setQuestions]     = useState({ A:[], B:[], C:[] });
  const [submission,    setSubmission]    = useState(null);
  const [answers,       setAnswers]       = useState({});
  const [activeSection, setActiveSection] = useState('A');
  const [loading,       setLoading]       = useState(true);
  const [savingQ,       setSavingQ]       = useState({});
  const [submitted,     setSubmitted]     = useState(false);
  const [isEditing,     setIsEditing]     = useState(false);
  const [deadlinePassed,setDeadlinePassed]= useState(false);
  const [deadlineDate,  setDeadlineDate]  = useState(null);
  const [timeLeft,      setTimeLeft]      = useState('');
  const [timerUrgent,   setTimerUrgent]   = useState(false);
  const [msLeft,        setMsLeft]        = useState(null);
  const [courseId,      setCourseId]      = useState(null);
  const [openEditors,   setOpenEditors]   = useState({});
  const [editorModal,   setEditorModal]   = useState({ visible:false, question:null });

  const saveTimer = useRef({});
  const firedWarnings = useRef(new Set());

  // Load courseId
  useEffect(() => {
    api.get(`${API}/api/courses/${user._id}`, { headers })
      .then(res => {
        const courses = Array.isArray(res.data) ? res.data : [];
        if (courses.length > 0) setCourseId(courses[0]._id);
      }).catch(() => {});
  }, []);

  // Load assignment when courseId is ready
  useEffect(() => {
    if (courseId) loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qRes, subRes] = await Promise.allSettled([
        api.get(`${API}/api/questions/${courseId}/${date}`, { headers }),
        api.post(`${API}/api/submissions/init`,
          { traineeId: user._id, courseId, date },
          { headers }),
      ]);

      if (qRes.status === 'fulfilled') {
        const { questions: allQs, deadline: deadlineISO } = qRes.value.data || {};
        const qs = Array.isArray(allQs) ? allQs : [];
        setQuestions({
          A: qs.filter(q => q.section === 'A'),
          B: qs.filter(q => q.section === 'B'),
          C: qs.filter(q => q.section === 'C'),
        });

        // Set deadline
        let effectiveDeadline;
        if (deadlineISO) {
          effectiveDeadline = new Date(deadlineISO);
        } else {
          const d = new Date(date);
          d.setDate(d.getDate() + 1);
          d.setHours(0, 0, 0, 0);
          effectiveDeadline = d;
        }
        setDeadlineDate(effectiveDeadline);
        if (effectiveDeadline <= new Date()) setDeadlinePassed(true);

        // Restore answers
        if (subRes.status === 'fulfilled') {
          const sub = subRes.value.data;
          setSubmission(sub);
          const isSubmitted = sub.status === 'submitted';
          setSubmitted(isSubmitted);
          if (isSubmitted) setIsEditing(false);

          const ea = {};
          ['A','B','C'].forEach(sec => {
            const subAnswers = sub[`sec${sec}`]?.answers || [];
            const secQs = qs.filter(q => q.section === sec);
            const byQId = {};
            subAnswers.forEach(a => { byQId[a.questionId?.toString()] = a.answerText || ''; });
            secQs.forEach(q => {
              const qid = q._id.toString();
              ea[qid] = byQId[qid] !== undefined ? byQId[qid] : '';
            });
          });
          setAnswers(ea);
        }
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Timer
  useEffect(() => {
    if (!deadlineDate) return;
    const tick = () => {
      const diff = deadlineDate - new Date();
      setMsLeft(diff);
      if (diff <= 0) { setTimeLeft('Time Up!'); setDeadlinePassed(true); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      setTimerUrgent(diff < 30 * 60_000);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadlineDate]);

  // Warning milestones + auto-submit
  useEffect(() => {
    if (!msLeft || submitted || deadlinePassed) return;
    const milestones = [
      { ms: 30*60_000, key:'30min', msg:'⚠️ 30 minutes left! Submit soon.' },
      { ms: 10*60_000, key:'10min', msg:'🚨 10 minutes! AUTO-SUBMIT approaching!' },
      { ms:  5*60_000, key:'5min',  msg:'🔴 5 minutes left! AUTO-SUBMIT very close!' },
    ];
    milestones.forEach(({ ms, key, msg }) => {
      if (msLeft <= ms && !firedWarnings.current.has(key)) {
        firedWarnings.current.add(key);
        Alert.alert('⏰ Time Warning', msg);
      }
    });
    if (msLeft <= 0 && !firedWarnings.current.has('autosubmit')) {
      firedWarnings.current.add('autosubmit');
      doAutoSubmit();
    }
  }, [msLeft]);

  const doAutoSubmit = useCallback(async () => {
    if (submitted) return;
    try {
      await api.patch(`${API}/api/submissions/submit`,
        { traineeId: user._id, date }, { headers });
      setSubmitted(true);
      setIsEditing(false);
      Alert.alert('✅ Auto-Submitted', 'Assignment automatically submitted at deadline!');
    } catch(e) {}
  }, [submitted]);

  const handleAnswer = (questionId, text, section, marks) => {
    const qid = questionId.toString();
    setAnswers(prev => ({ ...prev, [qid]: text }));
    if (saveTimer.current[qid]) clearTimeout(saveTimer.current[qid]);
    saveTimer.current[qid] = setTimeout(async () => {
      try {
        const res = await api.patch(`${API}/api/submissions/answer`,
          { traineeId: user._id, date, section, questionId: qid, answerText: text, marks },
          { headers });
        setSubmission(res.data);
      } catch(e) {}
    }, 800);
  };

  const handleSaveQuestion = async (questionId, section, marks) => {
    const qid = questionId.toString();
    const text = answers[qid] || '';
    setSavingQ(prev => ({ ...prev, [qid]: true }));
    if (saveTimer.current[qid]) { clearTimeout(saveTimer.current[qid]); delete saveTimer.current[qid]; }
    try {
      const res = await api.patch(`${API}/api/submissions/answer`,
        { traineeId: user._id, date, section, questionId: qid, answerText: text, marks },
        { headers });
      setSubmission(res.data);
    } catch(e) {}
    finally { setSavingQ(prev => ({ ...prev, [qid]: false })); }
  };

  const handleSubmit = () => {
    Alert.alert('Submit Assignment', 'Submit now? You can still edit until deadline.',
      [
        { text:'Cancel', style:'cancel' },
        { text:'Submit', onPress: async () => {
          try {
            // Save all pending answers first
            for (const sec of ['A','B','C']) {
              for (const q of (questions[sec]||[])) {
                const qid = q._id.toString();
                const text = answers[qid] || '';
                if (text.trim()) {
                  try {
                    await api.patch(`${API}/api/submissions/answer`,
                      { traineeId: user._id, date, section: sec, questionId: qid, answerText: text, marks: q.marks },
                      { headers });
                  } catch(e) {}
                }
              }
            }
            await api.patch(`${API}/api/submissions/submit`,
              { traineeId: user._id, date }, { headers });
            setSubmitted(true);
            setIsEditing(false);
            Alert.alert('✅ Submitted!', 'Assignment submitted successfully.');
          } catch(e) {
            Alert.alert('Error', 'Submission failed. Try again.');
          }
        }}
      ]
    );
  };

  const getAnswered = (sec) => submission?.[`sec${sec}`]?.answered || 0;
  const getScore    = (sec) => submission?.[`sec${sec}`]?.score    || 0;
  const isReadOnly  = deadlinePassed || (submitted && !isEditing);

  const totalAnswered = ['A','B','C'].reduce((acc, sec) => acc + getAnswered(sec), 0);
  const totalQ = (questions.A?.length||0) + (questions.B?.length||0) + (questions.C?.length||0);

  if (loading) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: theme.pageBg }}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={{ color: theme.textMuted, marginTop:12 }}>Loading assignment...</Text>
    </View>
  );

  const secColor = SEC_INFO[activeSection].color;
  const currentQs = questions[activeSection] || [];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor:'#1e3a5f' }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20, color:'#fff' }}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex:1, marginLeft:12 }}>
          <Text style={{ color:'#fff', fontSize:16, fontWeight:'700' }}>Assignment — {date}</Text>
          <Text style={{ color:'#a0b4c8', fontSize:11 }}>MERN Stack Developer Course</Text>
        </View>
        {/* Timer */}
        {!submitted && !deadlinePassed && (
          <View style={{ backgroundColor: timerUrgent ? '#ff000015' : 'rgba(255,255,255,0.1)', borderRadius:10, padding:'6px 10px', alignItems:'center', borderWidth:1, borderColor: timerUrgent ? '#ff5555' : 'rgba(255,255,255,0.2)', paddingHorizontal:10, paddingVertical:6 }}>
            <Text style={{ color:'#a0b4c8', fontSize:9, fontWeight:'600' }}>⏰ TIME LEFT</Text>
            <Text style={{ color: timerUrgent ? '#ff5555' : '#fff', fontSize:16, fontWeight:'800' }}>{timeLeft||'--:--:--'}</Text>
          </View>
        )}
        {submitted && (
          <View style={{ backgroundColor:'#1D9E7522', borderRadius:10, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'#1D9E75' }}>
            <Text style={{ color:'#1D9E75', fontWeight:'700', fontSize:13 }}>✅ Submitted</Text>
          </View>
        )}
      </View>

      {/* Score published banner */}
      {submission?.scorePublished && (
        <View style={{ backgroundColor:'#1D9E7515', padding:12, borderBottomWidth:1, borderBottomColor:'#1D9E7533' }}>
          <Text style={{ color:'#1D9E75', fontWeight:'700', textAlign:'center' }}>
            ✅ Score Released: {submission.manualScore??0}/130
            {submission.trainerFeedback ? `  |  ${submission.trainerFeedback}` : ''}
          </Text>
        </View>
      )}

      {/* Edit mode bar */}
      {isEditing && (
        <View style={{ backgroundColor:'#f5a62315', padding:8, borderBottomWidth:1, borderBottomColor:'#f5a62333' }}>
          <Text style={{ color:'#f5a623', textAlign:'center', fontSize:12, fontWeight:'600' }}>
            ✏️ Editing mode — Save each answer, then re-submit
          </Text>
        </View>
      )}

      {/* Deadline passed bar */}
      {deadlinePassed && submitted && (
        <View style={{ backgroundColor:'#55555515', padding:8, borderBottomWidth:1, borderBottomColor:'#88888833' }}>
          <Text style={{ color:'#888', textAlign:'center', fontSize:12, fontWeight:'600' }}>
            🔒 Deadline passed — Read-only view
          </Text>
        </View>
      )}

      {/* Progress */}
      <View style={{ height:3, backgroundColor: theme.border }}>
        <View style={{ height:3, backgroundColor: secColor, width: `${totalQ ? (totalAnswered/totalQ)*100 : 0}%` }} />
      </View>
      <Text style={{ color: theme.textMuted, fontSize:10, textAlign:'right', paddingRight:12, paddingTop:2 }}>
        {totalAnswered}/{totalQ} answered
      </Text>

      {/* Section tabs */}
      <View style={[s.tabs, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        {['A','B','C'].map(sec => (
          <TouchableOpacity
            key={sec}
            style={[s.tab, activeSection===sec && { borderBottomWidth:2, borderBottomColor: SEC_INFO[sec].color }]}
            onPress={() => setActiveSection(sec)}
          >
            <Text style={{ color: activeSection===sec ? SEC_INFO[sec].color : theme.textMuted, fontSize:12, fontWeight:'600' }}>
              Sec {sec}
            </Text>
            <Text style={{ color: SEC_INFO[sec].color, fontSize:11, fontWeight:'700' }}>
              {getAnswered(sec)}/{SEC_INFO[sec].total}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section info bar */}
      <View style={[s.secBar, { backgroundColor: SEC_INFO[activeSection].bg }]}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <View style={{ backgroundColor: secColor, borderRadius:20, paddingHorizontal:10, paddingVertical:3 }}>
            <Text style={{ color:'#fff', fontSize:11, fontWeight:'700' }}>{SEC_INFO[activeSection].level}</Text>
          </View>
          <Text style={{ color: theme.textMuted, fontSize:12 }}>Min {SEC_INFO[activeSection].min} questions</Text>
        </View>
        <Text style={{ color: secColor, fontWeight:'700', fontSize:13 }}>
          {getScore(activeSection)}/{activeSection==='A'?20:activeSection==='B'?60:50} marks
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>
          {currentQs.length === 0 ? (
            <View style={{ alignItems:'center', paddingVertical:40 }}>
              <Text style={{ fontSize:32 }}>📋</Text>
              <Text style={{ color: theme.textMuted, fontSize:14, marginTop:8 }}>No questions in Section {activeSection}</Text>
            </View>
          ) : currentQs.map((q, idx) => {
            const qid = q._id.toString();
            const answerText = answers[qid] || '';
            const isAnswered = answerText.trim().length > 0;
            const isSavingThis = savingQ[qid];
            const editorOpen = openEditors[qid];

            return (
              <View key={qid} style={[s.qCard, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: isAnswered ? secColor : theme.border }]}>
                {/* Question header */}
                <View style={{ flexDirection:'row', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                  <View style={{ width:30, height:30, borderRadius:15, backgroundColor:'#1e3a5f', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>Q{idx+1}</Text>
                  </View>
                  <Text style={{ flex:1, color: theme.textPrimary, fontSize:14, lineHeight:20 }}>{q.text || q.question}</Text>
                  <View style={{ backgroundColor: isAnswered ? SEC_INFO[activeSection].bg : theme.border+'33', borderRadius:20, paddingHorizontal:8, paddingVertical:3 }}>
                    <Text style={{ color: isAnswered ? secColor : theme.textMuted, fontSize:10, fontWeight:'700' }}>
                      {q.marks||1}m
                    </Text>
                  </View>
                </View>

                {/* Answer input */}
                <TextInput
                  style={[s.input, {
                    backgroundColor: isReadOnly ? (theme.cardBg) : theme.inputBg,
                    borderColor: isAnswered ? secColor : theme.border,
                    color: theme.textPrimary,
                    opacity: isReadOnly ? 0.8 : 1,
                  }]}
                  placeholder={activeSection==='C' ? 'Describe your approach (optional) — use code editor below 👇' : 'Your answer here...'}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  value={answerText}
                  onChangeText={text => !isReadOnly && handleAnswer(qid, text, activeSection, q.marks||1)}
                  editable={!isReadOnly}
                />

                {/* Save button */}
                {!isReadOnly && (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginTop:8 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: isSavingThis ? '#aaa' : (isAnswered ? secColor : '#334155'), borderRadius:8, paddingHorizontal:16, paddingVertical:7 }}
                      onPress={() => handleSaveQuestion(qid, activeSection, q.marks||1)}
                      disabled={isSavingThis}
                    >
                      <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>
                        {isSavingThis ? '⏳ Saving...' : '💾 Save'}
                      </Text>
                    </TouchableOpacity>
                    {isAnswered && <Text style={{ color:'#1D9E75', fontSize:11, fontWeight:'600' }}>✓ Answered</Text>}
                  </View>
                )}
                {isReadOnly && isAnswered && (
                  <Text style={{ color:'#1D9E75', fontSize:11, fontWeight:'600', marginTop:6 }}>✓ Answered</Text>
                )}

                {/* Code Editor toggle */}
                <TouchableOpacity
                  style={[s.codeBtn, { backgroundColor: editorOpen ? '#7c6af5' : '#7c6af515', borderColor:'#7c6af540' }]}
                  onPress={() => setEditorModal({ visible:true, question:q, section: activeSection })}
                >
                  <Text style={{ color: editorOpen ? '#fff' : '#7c6af5', fontSize:13, fontWeight:'700' }}>
                    💻 Open Code Editor
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Submit / Edit buttons */}
          <View style={{ gap:10, marginTop:8 }}>
            {!submitted && !deadlinePassed && (
              <TouchableOpacity style={[s.submitBtn, { backgroundColor:'#1e3a5f' }]} onPress={handleSubmit}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>Submit Assignment 🚀</Text>
              </TouchableOpacity>
            )}
            {submitted && !deadlinePassed && !isEditing && (
              <View style={{ flexDirection:'row', gap:10 }}>
                <View style={{ flex:1, backgroundColor:'#1D9E7522', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:'#1D9E75' }}>
                  <Text style={{ color:'#1D9E75', fontWeight:'700' }}>✓ Submitted</Text>
                </View>
                <TouchableOpacity
                  style={{ flex:1, backgroundColor:'#185FA522', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:'#185FA5' }}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={{ color:'#185FA5', fontWeight:'700' }}>✏️ Edit Answers</Text>
                </TouchableOpacity>
              </View>
            )}
            {isEditing && !deadlinePassed && (
              <TouchableOpacity style={[s.submitBtn, { backgroundColor:'#f5a623' }]} onPress={handleSubmit}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>🔄 Re-submit</Text>
              </TouchableOpacity>
            )}
            {submitted && deadlinePassed && (
              <View style={{ backgroundColor:'#1D9E7522', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:'#1D9E75' }}>
                <Text style={{ color:'#1D9E75', fontWeight:'700' }}>✓ Submitted — Awaiting grade</Text>
              </View>
            )}
            {!submitted && deadlinePassed && (
              <View style={{ backgroundColor:'#ef444420', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:'#ef4444' }}>
                <Text style={{ color:'#ef4444', fontWeight:'700' }}>⛔ Deadline Passed</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Code Editor Modal */}
      <CodeEditorModal
        visible={editorModal.visible}
        question={editorModal.question}
        date={date}
        courseId={courseId}
        token={token}
        isReadOnly={isReadOnly}
        onClose={() => setEditorModal({ visible:false, question:null })}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection:'row', alignItems:'center', padding:14 },
  tabs:      { flexDirection:'row', borderBottomWidth:1 },
  tab:       { flex:1, alignItems:'center', paddingVertical:10, gap:2 },
  secBar:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:10 },
  qCard:     { borderRadius:14, padding:16, borderWidth:1, borderLeftWidth:4, gap:8 },
  input:     { borderWidth:1.5, borderRadius:10, padding:12, fontSize:14, minHeight:80, textAlignVertical:'top' },
  codeBtn:   { borderRadius:10, paddingHorizontal:14, paddingVertical:8, marginTop:6, borderWidth:1, alignSelf:'flex-start' },
  codeInput: { borderWidth:1, borderRadius:10, padding:12, fontSize:13, flex:1, textAlignVertical:'top', fontFamily:'monospace', minHeight:300 },
  submitBtn: { borderRadius:14, padding:16, alignItems:'center' },
});
