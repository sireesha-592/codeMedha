// src/components/CustomDrawer.js
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const NAV_ITEMS = {
  student: [
    { label: 'Dashboard',     screen: 'Home',          icon: '🏡', tab: true  },
    { label: 'Attendance',    screen: 'Attend',         icon: '📅', tab: true  },
    { label: 'Classes',       screen: 'Classes',        icon: '🎓', tab: false },
    { label: 'My Course',     screen: 'MyCourse',       icon: '📚', tab: false },
    { label: 'Assignments',   screen: 'Tasks',          icon: '📝', tab: true  },
    { label: 'Notifications', screen: 'Notifications',  icon: '🔔', tab: false },
    { label: 'Analytics',     screen: 'Stats',          icon: '📊', tab: true  },
    { label: 'Leaderboard',   screen: 'Leaderboard',   icon: '🏆', tab: false },
    { label: 'Group Chat',    screen: 'Chat',           icon: '💬', tab: false },
    { label: 'Weekly Report', screen: 'WeeklyReport',   icon: '📋', tab: false },
    { label: 'Profile',       screen: 'Me',             icon: '👤', tab: true  },
  ],
  trainer: [
    { label: 'Dashboard',      screen: 'Dashboard',    icon: '📊' },
    { label: 'Students',       screen: 'Students',     icon: '👥' },
    { label: 'Classes',        screen: 'Classes',      icon: '🎥' },
    { label: 'Assignments',    screen: 'Assignments',  icon: '📝' },
    { label: 'Session Notes',  screen: 'SessionNotes', icon: '📓' },
    { label: 'Doubt Tracker',  screen: 'Doubts',       icon: '❓' },
    { label: 'Resources',      screen: 'Resources',    icon: '📎' },
    { label: 'Analytics',      screen: 'Analytics',    icon: '📈' },
  ],
  admin: [
    { label: 'Dashboard',     screen: 'Dashboard',    icon: '🏠' },
    { label: 'Students',      screen: 'Students',     icon: '👥' },
    { label: 'Questions',     screen: 'Questions',    icon: '📝' },
    { label: 'Submissions',   screen: 'Submissions',  icon: '📬' },
    { label: 'Attendance',    screen: 'Attendance',   icon: '📋' },
    { label: 'Daily Feedback',screen: 'Feedback',     icon: '⭐' },
    { label: 'Upload Video',  screen: 'VideoUpload',  icon: '🎬' },
    { label: 'Course Info',   screen: 'CourseInfo',   icon: '🎓' },
    { label: 'Reports',       screen: 'Analytics',    icon: '📊' },
    { label: 'Login Tracker', screen: 'LoginTracker', icon: '🕐' },
    { label: 'Settings',      screen: 'Settings',     icon: '⚙️' },
  ],
};

const ROLE_ACCENT = {
  student: '#00d4aa',
  trainer: '#8b5cf6',
  admin:   '#c77dff',
};

export default function CustomDrawer({ role = 'student', state, navigation: drawerNav, ...rest }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const { unreadCount } = useToast();

  // Auto-detect role from user if not passed
  const userRole = role || (user?.role === 'admin' ? 'admin' : (user?.role === 'trainer' || user?.role === 'teacher') ? 'trainer' : 'student');
  const accentColor = ROLE_ACCENT[userRole] || '#00d4aa';
  const items       = NAV_ITEMS[userRole] || NAV_ITEMS.student;

  const activeRoute = state?.routes[state.index]?.name || '';

  const handleNav = (item) => {
    drawerNav.closeDrawer();
    if (item.tab) {
      drawerNav.navigate('MainTabs', { screen: item.screen });
    } else {
      drawerNav.navigate(item.screen);
    }
  };

  const handleLogout = () => {
    drawerNav.closeDrawer();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <View style={[s.container, { backgroundColor: theme.sidebarBg }]}>
      {/* Logo */}
      <View style={[s.logoRow, { borderBottomColor: theme.border }]}>
        <View style={[s.logoCircle, { backgroundColor: accentColor }]}>
          <Text style={s.logoIcon}>⚡</Text>
        </View>
        <View>
          <Text style={[s.logoText, { color: theme.textPrimary }]}>CodeMedha</Text>
          <Text style={[s.roleText, { color: accentColor }]}>
            {userRole === 'admin' ? '🏢 Admin' : userRole === 'trainer' ? '🎓 Trainer' : '👤 Student'}
          </Text>
        </View>
      </View>

      {/* Nav Items */}
      <ScrollView style={s.navList} showsVerticalScrollIndicator={false}>
        {items.map((item, i) => {
          const isActive = activeRoute === item.screen ||
            (activeRoute === 'MainTabs' && item.tab);
          const showBadge = item.screen === 'Notifications' && unreadCount > 0;

          return (
            <TouchableOpacity
              key={i}
              style={[s.navItem, isActive && { backgroundColor: accentColor + '18' }]}
              onPress={() => handleNav(item)}
              activeOpacity={0.75}
            >
              <Text style={s.navIcon}>{item.icon}</Text>
              <Text style={[s.navLabel, { color: isActive ? accentColor : theme.navInactiveColor }, isActive && { fontWeight: '700' }]}>
                {item.label}
              </Text>
              {showBadge && (
                <View style={[s.badge, { backgroundColor: '#f55555' }]}>
                  <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
              {isActive && <View style={[s.activeLine, { backgroundColor: accentColor }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={[s.themeToggle, { backgroundColor: theme.hoverBg }]} onPress={toggleTheme}>
          <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          <Text style={[{ color: theme.textSecondary, fontSize: 12, fontWeight: '500' }]}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>
        <View style={s.userRow}>
          <View style={[s.avatar, { backgroundColor: accentColor }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.userName, { color: theme.textPrimary }]} numberOfLines={1}>{user?.name || 'User'}</Text>
            <Text style={[s.userEmail, { color: theme.textMuted }]} numberOfLines={1}>{user?.email || ''}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1 },
  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingTop: 48, borderBottomWidth: 1 },
  logoCircle: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  logoIcon:   { fontSize: 20 },
  logoText:   { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  roleText:   { fontSize: 11, fontWeight: '600', marginTop: 1 },
  navList:    { flex: 1, paddingVertical: 10, paddingHorizontal: 10 },
  navItem:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, marginBottom: 2, position: 'relative' },
  navIcon:    { fontSize: 17, width: 24, textAlign: 'center' },
  navLabel:   { flex: 1, fontSize: 14, fontWeight: '500' },
  activeLine: { position: 'absolute', right: 0, top: '20%', width: 3, height: '60%', borderRadius: 2 },
  badge:      { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:  { color: '#fff', fontSize: 10, fontWeight: '700' },
  footer:     { padding: 14, borderTopWidth: 1, gap: 10 },
  themeToggle:{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10 },
  userRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontWeight: '800', fontSize: 14 },
  userName:   { fontSize: 13, fontWeight: '600' },
  userEmail:  { fontSize: 11, marginTop: 1 },
  logoutBtn:  { padding: 4 },
});
