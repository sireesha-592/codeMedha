// src/screens/student/AssignmentScreen.js
// Converted from: src/pages/AssignmentPage.js
// CodeEditor (Monaco) → TextInput (RN has no browser Monaco; use TextInput for code)
// useParams date → today's date auto-selected
// Timer logic preserved

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AssignmentScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const date = new Date().toISOString().split('T')[0]; // always today

  const [questions, setQuestions]     = useState({ A: [], B: [], C: [] });
  const [submission, setSubmission]   = useState(null);
  const [answers, setAnswers]         = useState({});
  const [activeSection, setActiveSection] = useState('A');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [timeLeft, setTimeLeft]       = useState('');
  const [timerUrgent, setTimerUrgent] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(null);

  // Timer
  useEffect(() => {
    if (!deadlineDate) return;
    const tick = () => {
      const diff = deadlineDate - new Date();
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

  useEffect(() => { fetchAssignment(); }, [date, token]);

  const fetchAssignment = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [qRes, subRes, configRes] = await Promise.allSettled([
        api.get(`${API}/api/questions/${date}`, { headers }),
        api.get(`${API}/api/submissions/${date}`, { headers }),
        api.get(`${API}/api/assignment-config/${date}`, { headers }),
      ]);

      if (qRes.status === 'fulfilled') {
        const all = qRes.value.data || [];
        setQuestions({
          A: all.filter(q => q.section === 'A'),
          B: all.filter(q => q.section === 'B'),
          C: all.filter(q => q.section === 'C'),
        });
      }

      if (subRes.status === 'fulfilled' && subRes.value.data) {
        const sub = subRes.value.data;
        setSubmission(sub);
        setSubmitted(sub.status === 'submitted');
        // Restore saved answers
        const restored = {};
        (sub.answers || []).forEach(a => { restored[a.questionId] = a.answer; });
        setAnswers(restored);
      }

      if (configRes.status === 'fulfilled' && configRes.value.data?.deadline) {
        setDeadlineDate(new Date(configRes.value.data.deadline));
      } else {
        // fallback: midnight
        const midnight = new Date();
        midnight.setHours(23, 59, 59, 999);
        setDeadlineDate(midnight);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveAnswer = async (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    try {
      await api.post(`${API}/api/submissions/save-answer`, { date, questionId, answer }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {}
  };

  const submitAssignment = async () => {
    Alert.alert(
      'Submit Assignment',
      'Are you sure you want to submit? You cannot edit after submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit', style: 'default',
          onPress: async () => {
            setSaving(true);
            try {
              await api.post(`${API}/api/submissions/submit`, { date }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setSubmitted(true);
              Alert.alert('✅ Submitted!', 'Assignment submitted successfully.');
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.message || 'Submission failed.');
            } finally { setSaving(false); }
          }
        }
      ]
    );
  };

  const currentQuestions = questions[activeSection] || [];
  const sections = ['A', 'B', 'C'];
  const totalAnswered = Object.keys(answers).length;
  const totalQ = (questions.A?.length || 0) + (questions.B?.length || 0) + (questions.C?.length || 0);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.pageBg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize: 20 }}>☰</Text>
        </TouchableOpacity>
        <View>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Assignment</Text>
          <Text style={[s.headerSub, { color: theme.textMuted }]}>{date}</Text>
        </View>
        {/* Timer */}
        <View style={[s.timer, { backgroundColor: timerUrgent ? '#f5555522' : theme.hoverBg }]}>
          <Text style={[s.timerText, { color: timerUrgent ? theme.accentRed : theme.accent }]}>
            ⏱ {timeLeft || '--:--:--'}
          </Text>
        </View>
      </View>

      {/* Submitted banner */}
      {submitted && (
        <View style={[s.submittedBanner, { backgroundColor: '#00d4aa20', borderColor: '#00d4aa44' }]}>
          <Text style={{ color: '#00d4aa', fontWeight: '700', fontSize: 14 }}>
            ✅ Assignment Submitted — Read Only
          </Text>
        </View>
      )}

      {/* Progress bar */}
      <View style={[s.progressBar, { backgroundColor: theme.hoverBg }]}>
        <View style={[s.progressFill, { backgroundColor: theme.accent, width: `${totalQ ? (totalAnswered / totalQ) * 100 : 0}%` }]} />
      </View>
      <Text style={[s.progressText, { color: theme.textMuted }]}>
        {totalAnswered}/{totalQ} answered
      </Text>

      {/* Section Tabs */}
      <View style={[s.tabs, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        {sections.map(sec => (
          <TouchableOpacity
            key={sec}
            style={[s.tab, activeSection === sec && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveSection(sec)}
          >
            <Text style={[s.tabText, { color: activeSection === sec ? theme.accent : theme.navInactiveColor }]}>
              Section {sec}
            </Text>
            <Text style={[s.tabCount, { color: theme.textMuted }]}>({questions[sec]?.length || 0})</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {currentQuestions.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 32 }}>📝</Text>
            <Text style={[{ color: theme.textMuted, fontSize: 14, marginTop: 8 }]}>No questions in Section {activeSection}</Text>
          </View>
        ) : (
          currentQuestions.map((q, idx) => (
            <View key={q._id} style={[s.questionCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={s.questionHeader}>
                <View style={[s.qNum, { backgroundColor: theme.accent + '22' }]}>
                  <Text style={[s.qNumText, { color: theme.accent }]}>{idx + 1}</Text>
                </View>
                <Text style={[s.questionText, { color: theme.textPrimary }]}>{q.question}</Text>
              </View>

              {/* MCQ */}
              {q.type === 'mcq' && q.options?.map((opt, oi) => (
                <TouchableOpacity
                  key={oi}
                  style={[
                    s.option,
                    { borderColor: answers[q._id] === opt ? theme.accent : theme.border },
                    answers[q._id] === opt && { backgroundColor: theme.accent + '15' },
                  ]}
                  onPress={() => !submitted && !deadlinePassed && saveAnswer(q._id, opt)}
                  disabled={submitted || deadlinePassed}
                >
                  <View style={[s.radio, {
                    borderColor: answers[q._id] === opt ? theme.accent : theme.border,
                    backgroundColor: answers[q._id] === opt ? theme.accent : 'transparent',
                  }]} />
                  <Text style={[s.optionText, { color: theme.textPrimary }]}>{opt}</Text>
                </TouchableOpacity>
              ))}

              {/* Short answer or code */}
              {(q.type === 'short' || q.type === 'code' || !q.type) && (
                <TextInput
                  style={[s.answerInput, {
                    backgroundColor: theme.inputBg,
                    borderColor: answers[q._id] ? theme.accent : theme.border,
                    color: theme.textPrimary,
                    fontFamily: q.type === 'code' ? 'monospace' : undefined,
                  }]}
                  placeholder={q.type === 'code' ? 'Write your code here...' : 'Type your answer...'}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  value={answers[q._id] || ''}
                  onChangeText={(text) => !submitted && !deadlinePassed && saveAnswer(q._id, text)}
                  editable={!submitted && !deadlinePassed}
                />
              )}

              {answers[q._id] && (
                <Text style={[s.savedLabel, { color: theme.accent }]}>✓ Saved</Text>
              )}
            </View>
          ))
        )}

        {/* Submit Button */}
        {!submitted && !deadlinePassed && (
          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: theme.accent, opacity: saving ? 0.7 : 1 }]}
            onPress={submitAssignment}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#000" />
              : <Text style={s.submitBtnText}>Submit Assignment 🚀</Text>
            }
          </TouchableOpacity>
        )}
        {deadlinePassed && !submitted && (
          <View style={[s.deadlineBanner, { backgroundColor: theme.accentRed + '20', borderColor: theme.accentRed + '44' }]}>
            <Text style={{ color: theme.accentRed, fontWeight: '700' }}>⏰ Deadline Passed</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  headerTitle:     { fontSize: 16, fontWeight: '700' },
  headerSub:       { fontSize: 11 },
  timer:           { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  timerText:       { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  submittedBanner: { padding: 12, alignItems: 'center', borderBottomWidth: 1 },
  progressBar:     { height: 3, marginHorizontal: 0 },
  progressFill:    { height: 3 },
  progressText:    { fontSize: 11, textAlign: 'right', paddingRight: 12, paddingTop: 2 },
  tabs:            { flexDirection: 'row', borderBottomWidth: 1 },
  tab:             { flex: 1, alignItems: 'center', paddingVertical: 12, paddingBottom: 10 },
  tabText:         { fontSize: 13, fontWeight: '600' },
  tabCount:        { fontSize: 11 },
  scroll:          { padding: 16, gap: 14 },
  emptyState:      { alignItems: 'center', paddingVertical: 40 },
  questionCard:    { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  questionHeader:  { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  qNum:            { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qNumText:        { fontSize: 13, fontWeight: '700' },
  questionText:    { flex: 1, fontSize: 14, lineHeight: 20 },
  option:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5 },
  radio:           { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  optionText:      { fontSize: 14 },
  answerInput:     { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  savedLabel:      { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  submitBtn:       { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText:   { color: '#000', fontWeight: '700', fontSize: 16 },
  deadlineBanner:  { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
});
