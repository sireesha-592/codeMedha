// src/navigation/StudentNavigator.js
// Replaces: Sidebar BOTTOM_NAV + full nav for student role
// Bottom tabs: Home, Attend, Tasks, Stats, Me
// Drawer: full sidebar navigation (all 11 items)

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Student Screens
import DashboardScreen     from '../screens/student/DashboardScreen';
import AttendanceScreen    from '../screens/student/AttendanceScreen';
import AssignmentScreen    from '../screens/student/AssignmentScreen';
import AnalyticsScreen     from '../screens/student/AnalyticsScreen';
import ProfileScreen       from '../screens/student/ProfileScreen';
import CourseScreen        from '../screens/student/CourseScreen';
import MyCourseScreen      from '../screens/student/MyCourseScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import LeaderboardScreen   from '../screens/student/LeaderboardScreen';
import WeeklyReportScreen  from '../screens/student/WeeklyReportScreen';
import GroupChatScreen     from '../screens/student/GroupChatScreen';
import CustomDrawer        from '../components/CustomDrawer';

const Tab    = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack  = createNativeStackNavigator();

// Tab icon component
const TabIcon = ({ icon, focused, color }) => (
  <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

// Bottom Tab navigator (Home, Attend, Tasks, Stats, Me)
function StudentTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.sidebarBg,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.navInactiveColor,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarIcon: (p) => <TabIcon icon="🏠" {...p} /> }}
      />
      <Tab.Screen
        name="Attend"
        component={AttendanceScreen}
        options={{ tabBarIcon: (p) => <TabIcon icon="📅" {...p} /> }}
      />
      <Tab.Screen
        name="Tasks"
        component={AssignmentScreen}
        options={{ tabBarIcon: (p) => <TabIcon icon="📝" {...p} /> }}
      />
      <Tab.Screen
        name="Stats"
        component={AnalyticsScreen}
        options={{ tabBarIcon: (p) => <TabIcon icon="📊" {...p} /> }}
      />
      <Tab.Screen
        name="Me"
        component={ProfileScreen}
        options={{ tabBarIcon: (p) => <TabIcon icon="👤" {...p} /> }}
      />
    </Tab.Navigator>
  );
}

// Drawer wraps Tabs — provides full sidebar navigation
function StudentDrawer() {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="student" />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.sidebarBg, width: 260 },
        drawerType: 'front',
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="MainTabs"       component={StudentTabs} />
      <Drawer.Screen name="Classes"        component={CourseScreen} />
      <Drawer.Screen name="MyCourse"       component={MyCourseScreen} />
      <Drawer.Screen name="Notifications"  component={NotificationsScreen} />
      <Drawer.Screen name="Leaderboard"    component={LeaderboardScreen} />
      <Drawer.Screen name="Chat"           component={GroupChatScreen} />
      <Drawer.Screen name="WeeklyReport"   component={WeeklyReportScreen} />
    </Drawer.Navigator>
  );
}

// Root stack for student — allows modal/push screens on top of drawer
export default function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentDrawer" component={StudentDrawer} />
    </Stack.Navigator>
  );
}
