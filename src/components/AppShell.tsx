import { PropsWithChildren, useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { Animated, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { useAppStore } from '@/store/useAppStore';

export function AppShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const setLastVisitedPath = useAppStore((state) => state.setLastVisitedPath);
  const scrollRef = useRef<ScrollView>(null);
  const entrance = useRef(new Animated.Value(1)).current;
  const desktop = width >= 760;
  useEffect(() => {
    if (pathname && pathname !== '/' && !pathname.startsWith('/auth/') && pathname !== '/consent' && pathname !== '/onboarding') {
      setLastVisitedPath(pathname);
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    entrance.setValue(0);
    Animated.spring(entrance, { toValue: 1, damping: 22, stiffness: 150, mass: .75, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [entrance, pathname, setLastVisitedPath]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.workspace}>
        {desktop ? <Sidebar /> : null}
        <View style={[styles.frame, desktop && styles.frameDesktop]}>
          <View pointerEvents="none" style={styles.ambient}>
            <View style={styles.glowPeach} /><View style={styles.glowSage} /><View style={styles.glowLilac} />
          </View>
          {!desktop ? <MobileHeader /> : null}
          <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={[styles.content, desktop && styles.contentDesktop]} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>{children}</Animated.View>
          </ScrollView>
          {!desktop ? <BottomNav /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, height: '100%', backgroundColor: '#F5F2EB' },
  workspace: { flex: 1, minHeight: 0, flexDirection: 'row', width: '100%', maxWidth: 1320, alignSelf: 'center', backgroundColor: '#F7F4EE', ...Platform.select({ web: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E9E5DD', boxShadow: '0 0 80px rgba(41,65,60,.06)' } as any }) },
  frame: { flex: 1, minHeight: 0, width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: '#F7F4EE', overflow: 'hidden' },
  frameDesktop: { maxWidth: undefined, alignSelf: 'stretch' },
  ambient: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glowPeach: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(241,200,176,.12)', top: -260, right: -130 },
  glowSage: { position: 'absolute', width: 520, height: 520, borderRadius: 260, backgroundColor: 'rgba(134,169,157,.10)', bottom: -330, left: -190 },
  glowLilac: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(218,211,236,.10)', top: '38%', right: -180 },
  scroll: { flex: 1, minHeight: 0, ...Platform.select({ web: { overflowY: 'auto' as const } }) },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 116 },
  contentDesktop: { width: '100%', maxWidth: 850, alignSelf: 'center', paddingHorizontal: 42, paddingTop: 28, paddingBottom: 60 }
});
