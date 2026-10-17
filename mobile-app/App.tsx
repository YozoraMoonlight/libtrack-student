import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BookOpen, FileText, Home, Receipt, ScanLine, Settings as SettingsIcon } from 'lucide-react-native';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ErrorBoundary } from './src/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BooksScreen } from './src/screens/BooksScreen';
import { BorrowingsScreen } from './src/screens/BorrowingsScreen';
import { FinesScreen } from './src/screens/FinesScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { flushOutbox } from './src/offline/outbox';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, gcTime: 1000 * 60 * 60 * 24 } },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'libtrack_query_cache_v2' });

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  const { c } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.inkFaint,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.line,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color }) => <Home size={21} color={color} /> }}
      />
      <Tab.Screen
        name="Browse"
        component={BooksScreen}
        options={{ tabBarIcon: ({ color }) => <BookOpen size={21} color={color} /> }}
      />
      <Tab.Screen
        name="Loans"
        component={BorrowingsScreen}
        options={{ tabBarIcon: ({ color }) => <FileText size={21} color={color} /> }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{ tabBarIcon: ({ color }) => <ScanLine size={21} color={color} /> }}
      />
      <Tab.Screen
        name="Fines"
        component={FinesScreen}
        options={{ tabBarIcon: ({ color }) => <Receipt size={21} color={color} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color }) => <SettingsIcon size={21} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { user, loading } = useAuth();
  const { c, isDark } = useTheme();

  // Drain the offline return queue whenever the device is back online.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flushOutbox();
    });
    const timer = setInterval(() => void flushOutbox(), 30_000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
        <ActivityIndicator color={c.ink} />
        <Text style={{ color: c.inkFaint, marginTop: 12 }}>Opening your library…</Text>
      </View>
    );
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: c.paper,
      card: c.surface,
      text: c.ink,
      border: c.line,
      primary: c.ember,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={Tabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}>
            <ThemeProvider>
              <AuthProvider>
                <Root />
              </AuthProvider>
            </ThemeProvider>
          </PersistQueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
