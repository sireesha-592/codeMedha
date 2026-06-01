import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';

import AdminDashboardScreen    from '../screens/admin/AdminDashboardScreen';
import AdminStudentsScreen     from '../screens/admin/AdminStudentsScreen';
import AdminQuestionsScreen    from '../screens/admin/AdminQuestionsScreen';
import AdminSubmissionsScreen  from '../screens/admin/AdminSubmissionsScreen';
import AdminAttendanceScreen   from '../screens/admin/AdminAttendanceScreen';
import AdminFeedbackScreen     from '../screens/admin/AdminFeedbackScreen';
import AdminVideoUploadScreen  from '../screens/admin/AdminVideoUploadScreen';
import AdminCourseInfoScreen   from '../screens/admin/AdminCourseInfoScreen';
import AdminAnalyticsScreen    from '../screens/admin/AdminAnalyticsScreen';
import AdminLoginTrackerScreen from '../screens/admin/AdminLoginTrackerScreen';
import AdminSettingsScreen     from '../screens/admin/AdminSettingsScreen';
import CustomDrawer            from '../components/CustomDrawer';

const Drawer = createDrawerNavigator();

export default function AdminNavigator() {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawer {...props} role='admin' />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.sidebarBg, width: 260 },
        drawerActiveTintColor: '#c77dff',
        drawerInactiveTintColor: theme.textMuted,
      }}
    >
      <Drawer.Screen name="Dashboard"    component={AdminDashboardScreen}    options={{ drawerLabel:'🏠 Dashboard' }} />
      <Drawer.Screen name="Students"     component={AdminStudentsScreen}     options={{ drawerLabel:'👥 Students' }} />
      <Drawer.Screen name="Questions"    component={AdminQuestionsScreen}    options={{ drawerLabel:'📝 Questions' }} />
      <Drawer.Screen name="Submissions"  component={AdminSubmissionsScreen}  options={{ drawerLabel:'📬 Submissions' }} />
      <Drawer.Screen name="Attendance"   component={AdminAttendanceScreen}   options={{ drawerLabel:'📋 Attendance' }} />
      <Drawer.Screen name="Feedback"     component={AdminFeedbackScreen}     options={{ drawerLabel:'⭐ Daily Feedback' }} />
      <Drawer.Screen name="VideoUpload"  component={AdminVideoUploadScreen}  options={{ drawerLabel:'🎬 Upload Video' }} />
      <Drawer.Screen name="CourseInfo"   component={AdminCourseInfoScreen}   options={{ drawerLabel:'🎓 Course Info' }} />
      <Drawer.Screen name="Analytics"    component={AdminAnalyticsScreen}    options={{ drawerLabel:'📊 Reports' }} />
      <Drawer.Screen name="LoginTracker" component={AdminLoginTrackerScreen} options={{ drawerLabel:'🕐 Login Tracker' }} />
      <Drawer.Screen name="Settings"     component={AdminSettingsScreen}     options={{ drawerLabel:'⚙️ Settings' }} />
    </Drawer.Navigator>
  );
}
