import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';

import TrainerDashboardScreen     from '../screens/trainer/TrainerDashboardScreen';
import TrainerStudentsScreen      from '../screens/trainer/TrainerStudentsScreen';
import TrainerClassScreen         from '../screens/trainer/TrainerClassScreen';
import TrainerAssignmentsScreen   from '../screens/trainer/TrainerAssignmentsScreen';
import TrainerAnalyticsScreen     from '../screens/trainer/TrainerAnalyticsScreen';
import TrainerSessionNotesScreen  from '../screens/trainer/TrainerSessionNotesScreen';
import TrainerDoubtTrackerScreen  from '../screens/trainer/TrainerDoubtTrackerScreen';
import TrainerResourcesScreen     from '../screens/trainer/TrainerResourcesScreen';
import CustomDrawer               from '../components/CustomDrawer';

const Drawer = createDrawerNavigator();

export default function TrainerNavigator() {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawer {...props} role='trainer' />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.sidebarBg, width: 260 },
        drawerActiveTintColor: theme.accent,
        drawerInactiveTintColor: theme.textMuted,
      }}
    >
      <Drawer.Screen name="Dashboard"    component={TrainerDashboardScreen}    options={{ drawerLabel:'📊 Dashboard',      title:'Dashboard' }} />
      <Drawer.Screen name="Students"     component={TrainerStudentsScreen}      options={{ drawerLabel:'👥 Students',        title:'Students' }} />
      <Drawer.Screen name="Classes"      component={TrainerClassScreen}         options={{ drawerLabel:'🎥 Classes',         title:'Classes' }} />
      <Drawer.Screen name="Assignments"  component={TrainerAssignmentsScreen}   options={{ drawerLabel:'📝 Assignments',     title:'Assignments' }} />
      <Drawer.Screen name="SessionNotes" component={TrainerSessionNotesScreen}  options={{ drawerLabel:'📓 Session Notes',   title:'Session Notes' }} />
      <Drawer.Screen name="Doubts"       component={TrainerDoubtTrackerScreen}  options={{ drawerLabel:'❓ Doubt Tracker',   title:'Doubt Tracker' }} />
      <Drawer.Screen name="Resources"    component={TrainerResourcesScreen}     options={{ drawerLabel:'📎 Resources',       title:'Resources' }} />
      <Drawer.Screen name="Analytics"    component={TrainerAnalyticsScreen}     options={{ drawerLabel:'📈 Analytics',       title:'Analytics' }} />
    </Drawer.Navigator>
  );
}
