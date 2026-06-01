// src/navigation/TrainerNavigator.js
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import CustomDrawer from '../components/CustomDrawer';

import TrainerDashboardScreen from '../screens/trainer/TrainerDashboardScreen';
import TrainerStudentsScreen  from '../screens/trainer/TrainerStudentsScreen';
import TrainerClassScreen     from '../screens/trainer/TrainerClassScreen';
import TrainerAssignmentsScreen from '../screens/trainer/TrainerAssignmentsScreen';
import TrainerAnalyticsScreen from '../screens/trainer/TrainerAnalyticsScreen';

const Tab    = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TabIcon = ({ icon, focused }) => (
  <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

function TrainerTabs() {
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
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: theme.navInactiveColor,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Dashboard"   component={TrainerDashboardScreen}   options={{ tabBarIcon: (p) => <TabIcon icon="🏠" {...p} /> }} />
      <Tab.Screen name="Students"    component={TrainerStudentsScreen}     options={{ tabBarIcon: (p) => <TabIcon icon="👥" {...p} /> }} />
      <Tab.Screen name="Classes"     component={TrainerClassScreen}        options={{ tabBarIcon: (p) => <TabIcon icon="🎓" {...p} /> }} />
      <Tab.Screen name="Assignments" component={TrainerAssignmentsScreen}  options={{ tabBarIcon: (p) => <TabIcon icon="📝" {...p} /> }} />
      <Tab.Screen name="Analytics"   component={TrainerAnalyticsScreen}    options={{ tabBarIcon: (p) => <TabIcon icon="📊" {...p} /> }} />
    </Tab.Navigator>
  );
}

export default function TrainerNavigator() {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="trainer" />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.sidebarBg, width: 260 },
        drawerType: 'front',
      }}
    >
      <Drawer.Screen name="TrainerMain" component={TrainerTabs} />
    </Drawer.Navigator>
  );
}
