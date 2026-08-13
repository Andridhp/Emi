import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { primaryNavigation } from '@/data/navigation';
import { colors, webDepth } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { BrandMark } from './BrandMark';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { profiles, activeProfileId } = useAppStore();
  const { conflictCount } = useAuth();
  const profile = profiles.find((item) => item.id === activeProfileId) ?? profiles[0];
  return (
    <View style={styles.sidebar}>
      <Pressable style={styles.brand} onPress={() => router.push('/home')}>
        <BrandMark size={39} />
        <View><Text style={styles.brandName}>Emi</Text><Text style={styles.brandSub}>Acompañamiento familiar</Text></View>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/profiles')} style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{profile?.avatar || '♡'}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.profileName}>{profile?.name || 'Familia'}</Text><Text style={styles.profileMeta}>Cambiar o agregar perfil</Text></View>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <View style={styles.nav}>
        <Text style={styles.groupLabel}>Tu ruta</Text>
          {primaryNavigation.map((item) => {
            const active = path === item.href;
            return <Pressable accessibilityRole="link" key={item.href} onPress={() => router.push(item.href as never)} style={[styles.item, active && styles.itemActive]}>
              <MaterialCommunityIcons name={item.icon} size={19} color={active ? colors.sageDark : '#71807C'} />
              <Text style={[styles.itemText, active && styles.itemTextActive]} numberOfLines={1}>{item.label}</Text>
              {active ? <View style={styles.activeDot} /> : null}
            </Pressable>;
          })}
      </View>
      {conflictCount ? <Pressable accessibilityRole="link" onPress={() => router.push('/sync-conflicts')} style={styles.conflict}><MaterialCommunityIcons name="compare-horizontal" size={18} color="#8A5B24" /><View style={{ flex: 1 }}><Text style={styles.conflictTitle}>{conflictCount} {conflictCount === 1 ? 'cambio por revisar' : 'cambios por revisar'}</Text><Text style={styles.conflictBody}>La sincronización está en pausa.</Text></View><MaterialCommunityIcons name="chevron-right" size={17} color="#8A5B24" /></Pressable> : null}
      <View style={styles.disclaimer}><MaterialCommunityIcons name="shield-check-outline" size={17} color={colors.sageDark} /><Text style={styles.disclaimerText}>Guía basada en registros. No sustituye atención médica.</Text></View>
    </View>
  );
}

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  sidebar: { width: 286, height: '100%', backgroundColor: 'rgba(252,250,246,.96)', borderRightWidth: 1, borderRightColor: colors.line, paddingHorizontal: 18, paddingTop: 23, paddingBottom: 18, ...Platform.select({ web: { boxShadow: '14px 0 45px rgba(41,65,60,.045)' } as any }) },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 7, marginBottom: 20 },
  brandName: { color: colors.ink, fontFamily: serif, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 }, brandSub: { color: colors.muted, fontSize: 7, letterSpacing: .25, marginTop: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, backgroundColor: 'rgba(255,253,252,.9)', borderWidth: 1, borderColor: 'rgba(231,226,218,.9)', borderRadius: 20, marginBottom: 19, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, avatar: { width: 37, height: 37, borderRadius: 14, backgroundColor: colors.peach, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, avatarText: { color: '#744A3A', fontFamily: serif, fontWeight: '700' }, profileName: { color: colors.ink, fontSize: 11, fontWeight: '800' }, profileMeta: { color: colors.muted, fontSize: 7, marginTop: 2 },
  nav: { flex: 1 }, groupLabel: { color: '#9AA29F', fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 7, paddingHorizontal: 10 },
  item: { height: 46, borderRadius: 16, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 4, ...Platform.select({ web: { transitionDuration: '150ms' } as any }) }, itemActive: { backgroundColor: colors.mint, borderWidth: 1, borderColor: 'rgba(134,169,157,.18)', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, itemText: { flex: 1, color: '#60706C', fontSize: 10, fontWeight: '600' }, itemTextActive: { color: colors.sageDeep, fontWeight: '900' }, activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.apricot, borderWidth: 1, borderColor: '#FFF' },
  conflict: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 10, marginBottom: 8, backgroundColor: '#FFF3DD', borderWidth: 1, borderColor: '#E8D2AA' }, conflictTitle: { color: '#704A20', fontSize: 8, fontWeight: '900' }, conflictBody: { color: '#8B7354', fontSize: 7, marginTop: 2 },
  disclaimer: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', backgroundColor: colors.mint, borderRadius: 13, padding: 10 }, disclaimerText: { flex: 1, color: colors.sageDark, fontSize: 8, lineHeight: 12 }
});
