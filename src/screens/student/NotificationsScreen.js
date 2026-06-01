import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function NotificationsScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (user) fetchNotifications(); }, [user]);

  const fetchNotifications = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const todayStr = new Date().toISOString().split('T')[0];

      const [classRes, subRes] = await Promise.allSettled([
        api.get(`${API}/api/classes/all`, { headers }),
        api.get(`${API}/api/submissions/all`, { headers }),
      ]);

      const notifs = [];

      if (classRes.status === 'fulfilled') {
        const classes = Array.isArray(classRes.value.data) ? classRes.value.data : [];
        classes.slice(0, 15).forEach(cls => {
          const classDateStr = (cls.date || cls.createdAt || '').split('T')[0];
          const isToday = classDateStr === todayStr;
          notifs.push({
            id:          'class_' + cls._id,
            type:        'class',
            icon:        '🎥',
            title:       isToday ? '🔴 New Class Available Today!' : 'Class Uploaded',
            message:     cls.title || 'A new class has been uploaded by your trainer',
            time:        new Date(cls.createdAt || cls.date),
            color:       '#00d4aa',
            read:        !isToday,
            urgent:      false,
            actionLabel: 'Watch Now',
            actionScreen:'Classes',
          });
        });
      }

      if (subRes.status === 'fulfilled') {
        const allSubs = Array.isArray(subRes.value.data) ? subRes.value.data : [];
        const subs = allSubs.filter(s => s.date <= todayStr);
        subs.forEach(s => {
          if (s.status !== 'submitted') {
            const answered = (s.secA?.answered || 0) + (s.secB?.answered || 0) + (s.secC?.answered || 0);
            const total    = (s.secA?.total || 20) + (s.secB?.total || 20) + (s.secC?.total || 10);
            notifs.push({
              id:          'sub_' + s._id,
              type:        'assignment',
              icon:        '📝',
              title:       'Assignment Pending',
              message:     'Assignment (' + s.date + ') — ' + answered + '/' + total + ' questions answered. Do not forget to submit!',
              time:        new Date(s.date),
              color:       '#f5a623',
              read:        false,
              urgent:      answered === 0,
              actionLabel: 'Continue Now',
              actionScreen:'Tasks',
              actionParams:{ date: s.date },
            });
          } else {
            const score = (s.secA?.score||0) + (s.secB?.score||0) + (s.secC?.score||0);
            notifs.push({
              id:          'sub_done_' + s._id,
              type:        'assignment',
              icon:        '✅',
              title:       'Assignment Submitted!',
              message:     'Assignment (' + s.date + ') successfully submitted. Score: ' + score,
              time:        new Date(s.submittedAt || s.date),
              color:       '#7c6af5',
              read:        true,
              urgent:      false,
              actionLabel: 'View Analytics',
              actionScreen:'Stats',
            });
          }
        });
      }

      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(notifs);
    } catch(e) {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead   = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const filtered = notifications.filter(n => {
    if (filter === 'unread')     return !n.read;
    if (filter === 'class')      return n.type === 'class';
    if (filter === 'assignment') return n.type === 'assignment';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (time) => {
    const diff = Math.floor((new Date() - new Date(time)) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  };

  const FILTERS = [
    { key: 'all',        label: 'All',           count: notifications.length },
    { key: 'unread',     label: 'Unread',        count: unreadCount },
    { key: 'class',      label: '🎥 Classes',    count: notifications.filter(n => n.type === 'class').length },
    { key: 'assignment', label: '📝 Assignments', count: notifications.filter(n => n.type === 'assignment').length },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>🔔 Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={{ color: theme.accent, fontSize:12, fontWeight:'600' }}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width:80 }} />}
      </View>

      {/* Subtitle */}
      <View style={{ paddingHorizontal:16, paddingVertical:8, backgroundColor: theme.sidebarBg, borderBottomWidth:1, borderBottomColor: theme.border }}>
        <Text style={{ color: theme.textMuted, fontSize:12 }}>
          {unreadCount > 0 ? unreadCount + ' unread notification' + (unreadCount > 1 ? 's' : '') : 'All caught up! ✓'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={{ backgroundColor: theme.sidebarBg, borderBottomWidth:1, borderBottomColor: theme.border, paddingVertical:10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, gap:8, flexDirection:'row' }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={{
                flexDirection:'row', alignItems:'center', gap:6,
                paddingHorizontal:14, paddingVertical:8, borderRadius:20,
                backgroundColor: filter === f.key ? theme.accent : theme.cardBg,
                borderWidth:1,
                borderColor: filter === f.key ? theme.accent : theme.border,
              }}
              onPress={() => setFilter(f.key)}
            >
              <Text style={{ color: filter === f.key ? '#000' : theme.textPrimary, fontSize:13, fontWeight:'600' }}>
                {f.label}
              </Text>
              <View style={{
                backgroundColor: filter === f.key ? 'rgba(0,0,0,0.2)' : theme.border,
                paddingHorizontal:6, paddingVertical:1, borderRadius:10,
              }}>
                <Text style={{ color: filter === f.key ? '#000' : theme.textMuted, fontSize:11, fontWeight:'700' }}>{f.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding:16, gap:10, paddingBottom:40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={theme.accent} />}
        >
          {filtered.length === 0 ? (
            <View style={{ alignItems:'center', paddingVertical:60, gap:8 }}>
              <Text style={{ fontSize:48, opacity:0.3 }}>🔕</Text>
              <Text style={{ fontSize:16, color: theme.textMuted, fontWeight:'500' }}>No notifications here</Text>
              <Text style={{ fontSize:13, color: theme.textMuted, textAlign:'center', maxWidth:300, lineHeight:20, opacity:0.7 }}>
                {notifications.length === 0
                  ? 'Notifications will appear when admin uploads a class or you have pending assignments.'
                  : "You're all caught up!"}
              </Text>
            </View>
          ) : (
            filtered.map(notif => (
              <TouchableOpacity
                key={notif.id}
                style={[s.card, {
                  backgroundColor: notif.read ? theme.cardBg : notif.color + '08',
                  borderColor: notif.read ? theme.border : notif.color + '44',
                }]}
                onPress={() => markRead(notif.id)}
                activeOpacity={0.8}
              >
                {!notif.read && (
                  <View style={[s.unreadDot, { backgroundColor: notif.color }]} />
                )}
                <View style={[s.iconBox, { backgroundColor: notif.color + '20' }]}>
                  <Text style={{ fontSize:20 }}>{notif.icon}</Text>
                </View>
                <View style={{ flex:1, gap:4 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700', flex:1 }}>{notif.title}</Text>
                    {notif.urgent && (
                      <View style={s.urgentBadge}>
                        <Text style={{ color:'#f55', fontSize:9, fontWeight:'800' }}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize:12, lineHeight:18 }}>{notif.message}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginTop:4 }}>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>{formatTime(notif.time)}</Text>
                    {notif.actionScreen && (
                      <TouchableOpacity
                        style={[s.actionBtn, { borderColor: notif.color + '44' }]}
                        onPress={(e) => {
                          markRead(notif.id);
                          navigation.navigate(notif.actionScreen, notif.actionParams || {});
                        }}
                      >
                        <Text style={{ color: notif.color, fontSize:11, fontWeight:'600' }}>
                          {notif.actionLabel} →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  filterBtn:  { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:7, borderRadius:10, borderWidth:1 },
  badge:      { paddingHorizontal:6, paddingVertical:1, borderRadius:8 },
  card:       { flexDirection:'row', alignItems:'flex-start', gap:14, padding:16, borderRadius:14, borderWidth:1, position:'relative' },
  iconBox:    { width:42, height:42, borderRadius:12, alignItems:'center', justifyContent:'center', flexShrink:0 },
  unreadDot:  { position:'absolute', top:16, right:16, width:7, height:7, borderRadius:4 },
  urgentBadge:{ backgroundColor:'#f5515122', borderWidth:1, borderColor:'#f5555544', borderRadius:4, paddingHorizontal:6, paddingVertical:2 },
  actionBtn:  { borderWidth:1, borderRadius:7, paddingHorizontal:10, paddingVertical:4 },
});
