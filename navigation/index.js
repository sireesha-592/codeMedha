// src/navigation/index.js
// Main navigator — role-based routing
// Replaces: HashRouter + React Router Routes in App.js
// Roles: student → StudentStack, trainer/teacher → TrainerStack, admin → AdminStack

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Auth screen
import LoginScreen from '../screens/LoginScreen';

// Student navigator
import StudentNavigator from './StudentNavigator';

// Trainer navigator
import TrainerNavigator from './TrainerNavigator';

// Admin navigator
import AdminNavigator from './AdminNavigator';

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  // Show splash/loading while restoring session
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const getInitialRoute = () => {
    if (!user) return 'Login';
    const role = user.role;
    if (role === 'admin') return 'Admin';
    if (role === 'trainer' || role === 'teacher') return 'Trainer';
    return 'Student';
  };

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{ headerShown: false }}
      >
        {!user ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'admin' ? (
          <RootStack.Screen name="Admin" component={AdminNavigator} />
        ) : user.role === 'trainer' || user.role === 'teacher' ? (
          <RootStack.Screen name="Trainer" component={TrainerNavigator} />
        ) : (
          <RootStack.Screen name="Student" component={StudentNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
