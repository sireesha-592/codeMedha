// src/screens/student/NotificationsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { notifications, markAsRead, markAllRead } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const typeIcon = { class:'🎥', assignment:'📝', attendance:'✅', general:'🔔' };
  const typeColor = { class:theme.accent, assignment:theme.accentOrange, attendance:theme.accentPurple, general:theme.textSecondary };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[sts.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Text style={{ fontSize:20 }}>☰</Text></TouchableOpacity>
        <Text style={[sts.headerTitle, { color:theme.textPrimary }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}><Text style={[{ color:theme.accent, fontSize:12, fontWeight:'600' }]}>Mark all read</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding:16, gap:10, paddingBottom:32 }}>
        {notifications.length === 0 && (
          <View style={{ alignItems:'center', marginTop:60 }}>
            <Text style={{ fontSize:48 }}>🔔</Text>
            <Text style={[{ color:theme.textMuted, marginTop:12, fontSize:14 }]}>No notifications yet</Text>
          </View>
        )}
        {notifications.map((n, i) => (
          <TouchableOpacity key={n._id || i} style={[sts.card, { backgroundColor:theme.cardBg, borderColor: n.read ? theme.border : typeColor[n.type] || theme.accent, opacity: n.read ? 0.7 : 1 }]} onPress={() => markAsRead(n._id)}>
            <Text style={{ fontSize:24, marginRight:12 }}>{typeIcon[n.type] || '🔔'}</Text>
            <View style={{ flex:1 }}>
              <Text style={[{ color:theme.textPrimary, fontWeight:'600', fontSize:14, marginBottom:3 }]}>{n.title}</Text>
              <Text style={[{ color:theme.textSecondary, fontSize:13 }]}>{n.message}</Text>
              <Text style={[{ color:theme.textMuted, fontSize:11, marginTop:4 }]}>{new Date(n.createdAt).toLocaleDateString()}</Text>
            </View>
            {!n.read && <View style={[sts.unreadDot, { backgroundColor:typeColor[n.type] || theme.accent }]} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const sts = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  card: { flexDirection:'row', alignItems:'flex-start', borderRadius:14, padding:14, borderWidth:1.5 },
  unreadDot: { width:8, height:8, borderRadius:4, marginTop:6 },
});
