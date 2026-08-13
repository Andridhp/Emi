import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, webDepth } from '@/theme';
import { BrandMark } from './BrandMark';
import { useAuth } from '@/context/AuthContext';

export function MobileHeader() {
  const router = useRouter();
  const { syncStatus, pendingChanges, conflictCount, demoSession } = useAuth();
  const syncBadge = demoSession
    ? { label: 'Local', icon: 'cellphone-link' as const, color: '#D9C7A9' }
    : syncStatus === 'loading'
      ? { label: pendingChanges ? `${pendingChanges}` : '…', icon: 'cloud-sync-outline' as const, color: '#E8D2AA' }
      : syncStatus === 'conflict'
        ? { label: `${conflictCount}`, icon: 'cloud-alert-outline' as const, color: '#E8C8C8' }
        : syncStatus === 'error'
          ? { label: '!', icon: 'cloud-off-outline' as const, color: '#E8C8C8' }
          : { label: 'En vivo', icon: 'cloud-check-outline' as const, color: '#DCECE6' };
  return <View style={styles.header}>
    <Pressable accessibilityRole="link" onPress={() => router.push('/home')} style={styles.brand}><BrandMark size={31} /><Text style={styles.brandText}>Emi</Text></Pressable>
    <View style={styles.actions}>
      <Pressable accessibilityRole="link" accessibilityLabel={syncStatus === 'conflict' ? `${conflictCount} cambios por revisar` : syncBadge.label} onPress={() => syncStatus === 'conflict' ? router.push('/sync-conflicts') : router.push('/privacy')} style={[styles.syncBadge, { backgroundColor: syncBadge.color }]}>
        <MaterialCommunityIcons name={syncBadge.icon} size={14} color={colors.sageDark} />
        <Text style={styles.syncBadgeText}>{syncBadge.label}</Text>
      </Pressable>
      {conflictCount ? <Pressable accessibilityRole="link" accessibilityLabel={`${conflictCount} cambios por revisar`} onPress={() => router.push('/sync-conflicts')} style={styles.conflictButton}><MaterialCommunityIcons name="compare-horizontal" size={18} color="#7A5021" /><Text style={styles.conflictCount}>{conflictCount}</Text></Pressable> : null}
      <Pressable accessibilityRole="link" accessibilityLabel="Abrir avisos" onPress={() => router.push('/notifications')} style={styles.iconButton}><MaterialCommunityIcons name="bell-outline" size={19} color={colors.ink} /></Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel="Abrir más opciones" onPress={() => router.push('/explore')} style={styles.menuButton}><MaterialCommunityIcons name="dots-horizontal" size={20} color={colors.ink} /><Text style={styles.menuText}>Más</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  header: { height: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: 'rgba(251,250,246,.94)', ...Platform.select({ web: { backdropFilter: 'blur(18px)' } as any }) },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandText: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7 }, syncBadge: { height: 38, minWidth: 48, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }, syncBadgeText: { color: colors.sageDark, fontSize: 8, fontWeight: '900' }, conflictButton: { height: 38, minWidth: 42, paddingHorizontal: 9, borderRadius: 14, backgroundColor: '#FFF3DD', borderWidth: 1, borderColor: '#E8D2AA', flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }, conflictCount: { color: '#704A20', fontSize: 9, fontWeight: '900' }, iconButton: { width: 38, height: 38, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, menuButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 11, ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, menuText: { color: colors.ink, fontSize: 10, fontWeight: '800' }
});
