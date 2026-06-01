import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function AdminVideoUploadScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };

  const [title,       setTitle]       = useState('');
  const [youtubeUrl,  setYoutubeUrl]  = useState('');
  const [deadline,    setDeadline]    = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [msg,         setMsg]         = useState('');

  const uploadVideo = async () => {
    if (!title.trim() || !youtubeUrl.trim()) return Alert.alert('⚠️', 'Title and YouTube URL required');
    setUploading(true);
    try {
      await api.post(`${API}/api/classes`, {
        title: title.trim(),
        videoUrl: youtubeUrl.trim(),
        attendanceDeadline: deadline || null,
      }, { headers });
      setMsg('✅ Class uploaded successfully!');
      setTitle(''); setYoutubeUrl(''); setDeadline('');
    } catch(e) {
      setMsg('❌ ' + (e.response?.data?.message || 'Upload failed'));
    }
    setUploading(false);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>🎬 Upload Video</Text>
        <View style={{ width:30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.textPrimary, fontSize:15, fontWeight:'700', marginBottom:4 }}>🎬 Upload Today's Class Video</Text>
          <Text style={{ color:'#f59e0b', fontSize:12, marginBottom:16 }}>⚠️ When a new video is uploaded — the previous class will automatically expire!</Text>

          <Text style={[s.label, { color: theme.textMuted }]}>Class Title</Text>
          <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="e.g. Day 5 — React Hooks Deep Dive"
            placeholderTextColor={theme.textMuted}
            value={title} onChangeText={setTitle} />

          <Text style={[s.label, { color: theme.textMuted }]}>YouTube Video URL</Text>
          <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={theme.textMuted}
            value={youtubeUrl} onChangeText={setYoutubeUrl}
            autoCapitalize="none" keyboardType="url" />

          <Text style={[s.label, { color: theme.textMuted }]}>Attendance Deadline (YYYY-MM-DDTHH:MM)</Text>
          <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="2026-05-27T23:59"
            placeholderTextColor={theme.textMuted}
            value={deadline} onChangeText={setDeadline} />

          {msg ? (
            <View style={{ backgroundColor: msg.startsWith('✅') ? '#10b98120' : '#ef444420', borderRadius:10, padding:12, marginBottom:12 }}>
              <Text style={{ color: msg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight:'600' }}>{msg}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[s.btn, { backgroundColor: uploading ? '#64748b' : '#1e3a5f' }]} onPress={uploadVideo} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'700', fontSize:14 }}>🎬 Upload Class Video</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  card:       { borderRadius:14, padding:16, borderWidth:1 },
  label:      { fontSize:12, fontWeight:'600', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 },
  input:      { borderWidth:1, borderRadius:10, padding:12, fontSize:13, marginBottom:14 },
  btn:        { borderRadius:10, padding:14, alignItems:'center' },
});
