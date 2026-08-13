import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider><StatusBar style="dark" /><AuthGate /></AuthProvider>
    </SafeAreaProvider>
  );
}

const publicPaths = ['/', '/auth/sign-in', '/auth/sign-up', '/auth/forgot-password', '/auth/update-password', '/invite'];
function AuthGate() {
  const { loading, isAuthenticated, user, demoSession, familyId, syncStatus } = useAuth(); const pathname = usePathname(); const router = useRouter();
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const lastVisitedPath = useAppStore((state) => state.lastVisitedPath);
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Font.loadAsync(MaterialCommunityIcons.font).catch(() => undefined).finally(() => { if (mounted) setIconsReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !publicPaths.includes(pathname)) return router.replace('/');
    if (isAuthenticated && syncStatus !== 'loading' && pathname !== '/consent' && pathname !== '/onboarding' && !publicPaths.includes(pathname)) {
      if (!demoSession && !familyId) { router.replace('/consent'); return; }
      if (!hasCompletedOnboarding) { router.replace('/onboarding'); return; }
    }
    if (isAuthenticated && pathname === '/' && lastVisitedPath && lastVisitedPath !== '/' && !lastVisitedPath.startsWith('/auth/') && lastVisitedPath !== '/consent' && lastVisitedPath !== '/onboarding') router.replace(lastVisitedPath as never);
  }, [demoSession, familyId, hasCompletedOnboarding, isAuthenticated, lastVisitedPath, loading, pathname, router, syncStatus]);
  if (loading || !iconsReady) return <View style={styles.loading}><ActivityIndicator color={colors.sageDark} /></View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F4EE' } }} />;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F4EE' } });
