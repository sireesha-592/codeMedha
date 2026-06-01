// src/screens/student/GroupChatScreen.js
// Converted from GroupChatPage.js
// WebSocket/socket.io → polling every 3s (RN doesn't have easy WS in metro by default)

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function GroupChatScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [courseId, setCourseId] = useState(user?.enrolledCourse || null);
  const scrollRef = useRef(null);
  const pollRef   = useRef(null);

  useEffect(() => {
    if (!courseId && user?._id) {
      api.get(`${API}/api/courses/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if (res.data?.[0]) setCourseId(res.data[0]._id); });
    }
  }, [user]);

  useEffect(() => {
    if (!courseId) return;
    fetchMessages();
    // Poll every 3 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [courseId]);

  const fetchMessages = async () => {
    if (!courseId) return;
    try {
      const res = await api.get(`${API}/api/chat/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data || []);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !courseId) return;
    setSending(true);
    const text = newMsg.trim();
    setNewMsg('');
    try {
      await api.post(`${API}/api/chat/${courseId}`, { message: text }, { headers: { Authorization: `Bearer ${token}` } });
      fetchMessages();
    } catch (e) { setNewMsg(text); }
    finally { setSending(false); }
  };

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const isMe = (msg) => msg.sender?._id === user?._id || msg.senderId === user?._id;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[gc.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Text style={{ fontSize:20 }}>☰</Text></TouchableOpacity>
        <Text style={[gc.headerTitle, { color:theme.textPrimary }]}>💬 Group Chat</Text>
        <View style={{ width:32 }} />
      </View>

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : !courseId ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:20 }}>
          <Text style={{ fontSize:40 }}>💬</Text>
          <Text style={[{ color:theme.textMuted, fontSize:14, marginTop:12, textAlign:'center' }]}>Enroll in a course to access the group chat.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding:16, gap:8, paddingBottom:16 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, i) => {
              const mine = isMe(msg);
              const senderName = msg.sender?.name || msg.senderName || 'Unknown';
              const initial    = senderName[0].toUpperCase();
              return (
                <View key={msg._id || i} style={[gc.msgRow, mine && gc.msgRowMe]}>
                  {!mine && (
                    <View style={[gc.avatar, { backgroundColor: theme.accentPurple }]}>
                      <Text style={gc.avatarText}>{initial}</Text>
                    </View>
                  )}
                  <View style={{ maxWidth:'75%' }}>
                    {!mine && <Text style={[gc.senderName, { color:theme.textMuted }]}>{senderName}</Text>}
                    <View style={[gc.bubble, mine ? { backgroundColor:theme.accent } : { backgroundColor:theme.cardBg, borderColor:theme.border, borderWidth:1 }]}>
                      <Text style={[gc.msgText, { color: mine ? '#000' : theme.textPrimary }]}>{msg.message || msg.content}</Text>
                    </View>
                    <Text style={[gc.time, { color:theme.textMuted, alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit', hour12:true })}
                    </Text>
                  </View>
                </View>
              );
            })}
            {messages.length === 0 && (
              <Text style={[{ color:theme.textMuted, textAlign:'center', marginTop:40 }]}>No messages yet. Say hi! 👋</Text>
            )}
          </ScrollView>

          {/* Input */}
          <View style={[gc.inputRow, { backgroundColor:theme.sidebarBg, borderTopColor:theme.border }]}>
            <TextInput
              style={[gc.input, { backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.textPrimary }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.textMuted}
              value={newMsg}
              onChangeText={setNewMsg}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[gc.sendBtn, { backgroundColor: newMsg.trim() ? theme.accent : theme.border }]}
              onPress={sendMessage}
              disabled={!newMsg.trim() || sending}
            >
              {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={gc.sendIcon}>↑</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
const gc = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  msgRow:      { flexDirection:'row', gap:8, alignItems:'flex-end' },
  msgRowMe:    { flexDirection:'row-reverse' },
  avatar:      { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  avatarText:  { color:'#fff', fontWeight:'700', fontSize:13 },
  senderName:  { fontSize:10, marginBottom:3, marginLeft:2 },
  bubble:      { borderRadius:16, padding:10, paddingHorizontal:14 },
  msgText:     { fontSize:14, lineHeight:20 },
  time:        { fontSize:10, marginTop:3 },
  inputRow:    { flexDirection:'row', alignItems:'flex-end', padding:12, gap:8, borderTopWidth:1 },
  input:       { flex:1, borderRadius:12, borderWidth:1, padding:10, fontSize:14, maxHeight:100 },
  sendBtn:     { width:42, height:42, borderRadius:21, alignItems:'center', justifyContent:'center' },
  sendIcon:    { fontSize:18, fontWeight:'700', color:'#000' },
});
