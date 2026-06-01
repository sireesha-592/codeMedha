// src/navigation/AdminNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import CustomDrawer from '../components/CustomDrawer';

import AdminDashboardScreen  from '../screens/admin/AdminDashboardScreen';
import AdminStudentsScreen   from '../screens/admin/AdminStudentsScreen';
import AdminCoursesScreen    from '../screens/admin/AdminCoursesScreen';
import AdminAnalyticsScreen  from '../screens/admin/AdminAnalyticsScreen';
import AdminSettingsScreen   from '../screens/admin/AdminSettingsScreen';

const Tab    = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TabIcon = ({ icon, focused }) => (
  <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

function AdminTabs() {
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
        tabBarActiveTintColor: '#c77dff',
        tabBarInactiveTintColor: theme.navInactiveColor,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen}  options={{ tabBarIcon: (p) => <TabIcon icon="👑" {...p} /> }} />
      <Tab.Screen name="Students"  component={AdminStudentsScreen}   options={{ tabBarIcon: (p) => <TabIcon icon="👥" {...p} /> }} />
      <Tab.Screen name="Courses"   component={AdminCoursesScreen}    options={{ tabBarIcon: (p) => <TabIcon icon="📚" {...p} /> }} />
      <Tab.Screen name="Analytics" component={AdminAnalyticsScreen}  options={{ tabBarIcon: (p) => <TabIcon icon="📊" {...p} /> }} />
      <Tab.Screen name="Settings"  component={AdminSettingsScreen}   options={{ tabBarIcon: (p) => <TabIcon icon="⚙️" {...p} /> }} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="admin" />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.sidebarBg, width: 260 },
        drawerType: 'front',
      }}
    >
      <Drawer.Screen name="AdminMain" component={AdminTabs} />
    </Drawer.Navigator>
  );
}
