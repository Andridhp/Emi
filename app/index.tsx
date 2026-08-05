import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Animated, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

const clues: { icon: keyof typeof MaterialCommunityIcons.glyphMap; eyebrow: string; title: string; tone: string; side: 'left' | 'right' }[] = [
  { icon: 'gesture-tap', eyebrow: 'EN SEGUNDOS', title: 'Registra sin interrumpir el momento', tone: '#F6DCCB', side: 'left' },
  { icon: 'chart-timeline-variant-shimmer', eyebrow: 'CON CALMA', title: 'Reconoce ritmos, no impone metas', tone: '#DDEBE5', side: 'right' },
  { icon: 'folder-heart-outline', eyebrow: 'TODO EN SU LUGAR', title: 'Conserva la historia de tu familia', tone: '#EAE5F4', side: 'left' },
  { icon: 'stethoscope', eyebrow: 'CUANDO LO NECESITES', title: 'Llega a consulta con mayor claridad', tone: '#F8E7DD', side: 'right' }
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { enterLocal, isAuthenticated } = useAuth();
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const scrollY = useRef(new Animated.Value(0)).current;
  const startLocal = async () => { await enterLocal(); router.push('/consent'); };
  const heroHeight = Math.max(660, height - 1);

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' })}
    >
      <LinearGradient colors={['#FBF8F2', '#F8F5EF', '#EEF4F0']} style={[styles.hero, { minHeight: heroHeight }]}>
        <View style={styles.auraPeach} /><View style={styles.auraSage} />
        <View style={styles.heroCenter}>
          <View style={styles.markHalo}><BrandMark size={88} /></View>
          <Text style={styles.name}>Emi</Text>
          <Text style={styles.message}>Un lugar amable para cuidar{`\n`}la historia de tu familia.</Text>
          <Text style={styles.submessage}>Menos memoria. Más claridad. Siempre a tu ritmo.</Text>
        </View>
        <View style={styles.scrollHint}><Text style={styles.scrollText}>DESCUBRE EMI</Text><MaterialCommunityIcons name="chevron-down" size={20} color={colors.sageDark} /></View>
      </LinearGradient>

      <View style={styles.story}>
        <Animated.View style={{ opacity: scrollY.interpolate({ inputRange: [heroHeight - 260, heroHeight - 80], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: scrollY.interpolate({ inputRange: [heroHeight - 260, heroHeight - 80], outputRange: [38, 0], extrapolate: 'clamp' }) }] }}>
          <Text style={styles.storyEyebrow}>CERCA, SIN ABRUMAR</Text>
          <Text style={styles.storyTitle}>Pequeñas ayudas{`\n`}para días muy grandes.</Text>
        </Animated.View>
        <View style={styles.thread} />
        {clues.map((item, index) => {
          const revealAt = heroHeight + 70 + index * 270;
          const progress = scrollY.interpolate({ inputRange: [revealAt - 210, revealAt], outputRange: [0, 1], extrapolate: 'clamp' });
          const lift = scrollY.interpolate({ inputRange: [revealAt - 210, revealAt], outputRange: [72, 0], extrapolate: 'clamp' });
          const scale = scrollY.interpolate({ inputRange: [revealAt - 210, revealAt - 40, revealAt + 40], outputRange: [.72, 1.05, 1], extrapolate: 'clamp' });
          const twist = scrollY.interpolate({ inputRange: [revealAt - 210, revealAt], outputRange: [item.side === 'left' ? '-9deg' : '9deg', '0deg'], extrapolate: 'clamp' });
          const orbLift = scrollY.interpolate({ inputRange: [revealAt - 210, revealAt, revealAt + 190], outputRange: [22, 0, -12], extrapolate: 'clamp' });
          const orbTurn = scrollY.interpolate({ inputRange: [revealAt - 210, revealAt, revealAt + 190], outputRange: [item.side === 'left' ? '-14deg' : '14deg', '0deg', item.side === 'left' ? '3deg' : '-3deg'], extrapolate: 'clamp' });
          return <Animated.View key={item.title} style={[styles.clueStage, item.side === 'right' ? styles.stageRight : styles.stageLeft, { opacity: progress, transform: [{ translateY: lift }, { scale }, { rotate: twist }] }]}>
            <Animated.View style={[styles.orbScene, { transform: [{ perspective: 650 }, { translateY: orbLift }, { rotateY: orbTurn }] }]}>
              <View style={styles.orbShadow} />
              <View style={[styles.iconOrb, { backgroundColor: item.tone }]}>
                <View style={styles.orbHighlight} />
                <View style={styles.orbDepth} />
                <View style={styles.orbRim} />
                <MaterialCommunityIcons name={item.icon} size={36} color={colors.sageDeep} />
                <View style={styles.orbDot} />
              </View>
            </Animated.View>
            <View style={[styles.clueCopy, item.side === 'right' && styles.copyRight]}><Text style={styles.clueEyebrow}>{item.eyebrow}</Text><Text style={styles.clueTitle}>{item.title}</Text></View>
          </Animated.View>;
        })}
      </View>

      <View style={styles.close}>
        <BrandMark size={48} />
        <Text style={styles.closeTitle}>Tu familia no necesita hacerlo perfecto.</Text>
        <Text style={styles.closeBody}>Emi acompaña con evidencia y sensibilidad. No diagnostica ni sustituye atención profesional.</Text>
        {isAuthenticated ? <Pressable accessibilityRole="link" onPress={() => router.push(hasCompletedOnboarding ? '/home' : '/consent')} style={styles.primary}><Text style={styles.primaryText}>Continuar a Emi</Text><MaterialCommunityIcons name="arrow-right" size={19} color="#FFF" /></Pressable> : <>
          <Pressable accessibilityRole="link" onPress={() => router.push('/auth/sign-up')} style={styles.primary}><Text style={styles.primaryText}>Crear mi cuenta</Text><MaterialCommunityIcons name="arrow-right" size={19} color="#FFF" /></Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.push('/auth/sign-in')} style={styles.secondary}><Text style={styles.secondaryText}>Ya tengo cuenta</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={startLocal} style={styles.demo}><MaterialCommunityIcons name="cellphone-lock" size={17} color={colors.sageDark} /><Text style={styles.demoText}>Usar Emi gratis en este dispositivo</Text></Pressable>
        </>}
      </View>
    </Animated.ScrollView>
  </SafeAreaView>;
}

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF8F2' }, page: { backgroundColor: colors.canvas },
  hero: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }, auraPeach: { position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: 'rgba(241,200,176,.20)', top: -330, left: -220 }, auraSage: { position: 'absolute', width: 520, height: 520, borderRadius: 260, backgroundColor: 'rgba(134,169,157,.13)', right: -260, bottom: -330 },
  heroCenter: { alignItems: 'center', marginTop: -26 }, markHalo: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.58)', ...Platform.select({ web: { boxShadow: '0 24px 70px rgba(41,78,71,.10)' } as any, default: {} }) }, name: { color: colors.ink, fontFamily: serif, fontSize: 54, lineHeight: 62, fontWeight: '700', letterSpacing: -1.8, marginTop: 19 }, message: { color: colors.ink, fontFamily: serif, fontSize: 22, lineHeight: 31, fontWeight: '700', textAlign: 'center', marginTop: 14 }, submessage: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
  scrollHint: { position: 'absolute', bottom: 30, alignItems: 'center', gap: 3 }, scrollText: { color: colors.sageDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  story: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 112, paddingBottom: 120, minHeight: 1420 }, storyEyebrow: { color: colors.sageDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' }, storyTitle: { color: colors.ink, fontFamily: serif, fontSize: 38, lineHeight: 46, fontWeight: '700', letterSpacing: -1, textAlign: 'center', marginTop: 11 }, thread: { position: 'absolute', width: 1, top: 300, bottom: 120, left: '50%', backgroundColor: '#E5E0D9' },
  clueStage: { width: '74%', minHeight: 230, marginTop: 46, justifyContent: 'center', gap: 20 }, stageLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' }, stageRight: { alignSelf: 'flex-end', alignItems: 'flex-end' }, orbScene: { width: 122, height: 126, alignItems: 'center', justifyContent: 'flex-start' }, orbShadow: { position: 'absolute', width: 76, height: 20, borderRadius: 38, bottom: 1, backgroundColor: 'rgba(42,66,60,.16)', transform: [{ scaleX: 1.12 }], ...Platform.select({ web: { filter: 'blur(8px)' } as any, default: {} }) }, iconOrb: { width: 108, height: 108, borderRadius: 38, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.78)', ...Platform.select({ web: { boxShadow: '0 26px 48px rgba(40,66,60,.20), inset 0 3px 4px rgba(255,255,255,.82), inset 0 -14px 28px rgba(40,66,60,.12)' } as any, default: { elevation: 9 } }) }, orbHighlight: { position: 'absolute', width: 66, height: 32, borderRadius: 30, backgroundColor: 'rgba(255,255,255,.48)', top: 9, left: 12, transform: [{ rotate: '-18deg' }] }, orbDepth: { position: 'absolute', width: 120, height: 50, borderRadius: 60, backgroundColor: 'rgba(61,91,82,.10)', bottom: -22, right: -22, transform: [{ rotate: '-12deg' }] }, orbRim: { position: 'absolute', width: 80, height: 80, borderRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(255,255,255,.38)', top: 13, left: 13 }, orbDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.apricot, right: 13, top: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.7)' }, clueCopy: { maxWidth: 370 }, copyRight: { alignItems: 'flex-end' }, clueEyebrow: { color: colors.sageDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.25 }, clueTitle: { color: colors.ink, fontFamily: serif, fontSize: 24, lineHeight: 30, fontWeight: '700', marginTop: 6 },
  close: { minHeight: 620, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 80, backgroundColor: '#EDF3EF' }, closeTitle: { color: colors.ink, fontFamily: serif, fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -.7, textAlign: 'center', maxWidth: 520, marginTop: 23 }, closeBody: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 460, marginTop: 12, marginBottom: 26 }, primary: { minWidth: 238, minHeight: 54, borderRadius: 18, backgroundColor: colors.sageDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 21 }, primaryText: { color: '#FFF', fontSize: 13, fontWeight: '900' }, secondary: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 }, secondaryText: { color: colors.sageDark, fontSize: 12, fontWeight: '900' }, demo: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12 }, demoText: { color: colors.muted, fontSize: 10, fontWeight: '700' }
});
