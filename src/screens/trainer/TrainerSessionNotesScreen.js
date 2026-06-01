import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function TrainerSessionNotesScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };
  const courseId = user?.enrolledCourse || user?.courseId || '';

  const [notes,     setNotes]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [title,     setTitle]     = useState('');
  const [content,   setContent]   = useState('');
  const [tags,      setTags]      = useState('');
  const [shared,    setShared]    = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [expanded,  setExpanded]  = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/api/session-notes${courseId ? `?courseId=${courseId}` : ''}`, { headers });
      setNotes(res.data || []);
    } catch(e) {}
    setLoading(false);
  }, [courseId, token]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!title.trim() || !content.trim()) return Alert.alert('⚠️ Required', 'Title and content are required');
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = { topic: title.trim(), content: content.trim(), tags: tags.split(',').map(t => t.trim()).filter(Boolean), sharedWithStudents: shared, courseId, date: today };
      if (editId) {
        const res = await api.patch(`${API}/api/session-notes/${editId}`, payload, { headers });
        setNotes(prev => prev.map(n => n._id === editId ? res.data : n));
        Alert.alert('✅', 'Note updated!');
      } else {
        const res = await api.post(`${API}/api/session-notes`, payload, { headers });
        setNotes(prev => [res.data, ...prev]);
        Alert.alert('✅', 'Note saved!');
      }
      setTitle(''); setContent(''); setTags(''); setShared(false); setEditId(null);
    } catch(e) { Alert.alert('Error', e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const toggleShare = async (note) => {
    try {
      const res = await api.patch(`${API}/api/session-notes/${note._id}`, { sharedWithStudents: !note.sharedWithStudents }, { headers });
      setNotes(prev => prev.map(n => n._id === note._id ? res.data : n));
    } catch(e) { Alert.alert('Error', 'Failed to update'); }
  };

  const deleteNote = (id) => {
    Alert.alert('Delete', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`${API}/api/session-notes/${id}`, { headers });
          setNotes(prev => prev.filter(n => n._id !== id));
        } catch(e) { Alert.alert('Error', 'Delete failed'); }
      }}
    ]);
  };

  const startEdit = (note) => {
    setEditId(note._id);
    setTitle(note.topic || note.title || '');
    setContent(note.content || '');
    setTags((note.tags || []).join(', '));
    setShared(note.sharedWithStudents || false);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📓 Session Notes</Text>
        <View style={{ width:30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>
        {/* Add/Edit Form */}
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.textPrimary, fontSize:15, fontWeight:'700', marginBottom:12 }}>
            {editId ? '✏️ Edit Note' : '➕ New Session Note'}
          </Text>
          <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Session title (e.g. React Hooks – Day 5)" placeholderTextColor={theme.textMuted}
            value={title} onChangeText={setTitle} />
          <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary, minHeight:100, textAlignVertical:'top' }]}
            placeholder="Session content, summary, key points…" placeholderTextColor={theme.textMuted}
            value={content} onChangeText={setContent} multiline numberOfLines={4} />
          <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Tags (comma separated): React, Hooks" placeholderTextColor={theme.textMuted}
            value={tags} onChangeText={setTags} />
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <Text style={{ color: theme.textPrimary, fontSize:13 }}>👁️ Share with students</Text>
            <Switch value={shared} onValueChange={setShared} trackColor={{ true:'#10b981', false: theme.border }} />
          </View>
          <View style={{ flexDirection:'row', gap:10 }}>
            <TouchableOpacity style={[s.btn, { backgroundColor:'#8e44ad', flex:1 }]} onPress={save} disabled={saving}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>{saving ? '💾 Saving…' : editId ? '💾 Update' : '💾 Save Note'}</Text>
            </TouchableOpacity>
            {editId && (
              <TouchableOpacity style={[s.btn, { backgroundColor:'#64748b' }]} onPress={() => { setEditId(null); setTitle(''); setContent(''); setTags(''); setShared(false); }}>
                <Text style={{ color:'#fff', fontWeight:'700' }}>✕ Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notes List */}
        {loading ? <ActivityIndicator color={theme.accent} style={{ padding:20 }} /> :
        notes.length === 0 ? (
          <View style={{ alignItems:'center', padding:40, gap:8 }}>
            <Text style={{ fontSize:32 }}>📭</Text>
            <Text style={{ color: theme.textMuted }}>No session notes yet</Text>
          </View>
        ) : notes.map(note => (
          <View key={note._id} style={[s.noteCard, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: note.sharedWithStudents ? '#10b981' : '#8e44ad' }]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <View style={{ flex:1 }}>
                <Text style={{ color: theme.textPrimary, fontSize:15, fontWeight:'700' }}>{note.topic || note.title}</Text>
                <Text style={{ color: theme.textMuted, fontSize:11, marginTop:2 }}>{note.date || new Date(note.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={{ gap:6 }}>
                <TouchableOpacity style={[s.smallBtn, { backgroundColor: note.sharedWithStudents ? '#10b981' : '#64748b' }]} onPress={() => toggleShare(note)}>
                  <Text style={{ color:'#fff', fontSize:11, fontWeight:'700' }}>{note.sharedWithStudents ? '👁️ Shared' : '🔒 Private'}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection:'row', gap:6 }}>
                  <TouchableOpacity style={[s.smallBtn, { backgroundColor:'#e67e22' }]} onPress={() => startEdit(note)}>
                    <Text style={{ color:'#fff', fontSize:11 }}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.smallBtn, { backgroundColor:'#ef4444' }]} onPress={() => deleteNote(note._id)}>
                    <Text style={{ color:'#fff', fontSize:11 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => setExpanded(prev => ({ ...prev, [note._id]: !prev[note._id] }))}>
              <Text style={{ color: theme.textPrimary, fontSize:13, lineHeight:20 }} numberOfLines={expanded[note._id] ? undefined : 3}>
                {note.content}
              </Text>
              <Text style={{ color: theme.accent, fontSize:12, marginTop:4 }}>{expanded[note._id] ? 'Show less ▲' : 'Show more ▼'}</Text>
            </TouchableOpacity>
            {(note.tags || []).length > 0 && (
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:8 }}>
                {note.tags.map((tag, i) => (
                  <View key={i} style={{ backgroundColor:'#8e44ad15', borderRadius:10, paddingHorizontal:8, paddingVertical:2 }}>
                    <Text style={{ color:'#8e44ad', fontSize:11, fontWeight:'600' }}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:      { borderRadius:14, padding:16, borderWidth:1 },
  input:     { borderWidth:1, borderRadius:10, padding:12, fontSize:13, marginBottom:10 },
  btn:       { borderRadius:10, padding:12, alignItems:'center' },
  noteCard:  { borderRadius:12, padding:14, borderWidth:1, borderLeftWidth:4 },
  smallBtn:  { borderRadius:8, paddingHorizontal:10, paddingVertical:5, alignItems:'center' },
});
