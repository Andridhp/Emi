import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { profileAgeLabel } from '@/lib/profiles';
import { colors, shadowSoft, webDepth } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/context/AuthContext';

export function ProfileHeader({ eyebrow }: { eyebrow?: string }) {
  const router = useRouter();
  const { activeProfileId, profiles, profileNames } = useAppStore();
  const { demoSession, syncStatus, pendingChanges, conflictCount } = useAuth();
  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const syncBadge = demoSession
    ? { label: 'Local', icon: 'cellphone-link' as const, color: '#D9C7A9' }
    : syncStatus === 'loading'
      ? { label: pendingChanges ? `Sincronizando ${pendingChanges}` : 'Sincronizando', icon: 'cloud-sync-outline' as const, color: '#E8D2AA' }
      : syncStatus === 'conflict'
        ? { label: `${conflictCount} por revisar`, icon: 'cloud-alert-outline' as const, color: '#E8C8C8' }
        : syncStatus === 'error'
          ? { label: 'Sin conexión', icon: 'cloud-off-outline' as const, color: '#E8C8C8' }
          : { label: 'En vivo', icon: 'cloud-check-outline' as const, color: '#DCECE6' };
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="link" onPress={() => router.push('/profiles')} style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{profile?.avatar ?? 'E'}</Text></View>
        <View>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile ? profileNames[profile.id] || profile.name : 'Configurar perfil'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={colors.ink} />
          </View>
          <Text style={styles.sub}>{profile ? profileAgeLabel(profile) : 'Agrega un embarazo o hijo'}{demoSession && profile ? ' · Guardado localmente' : !demoSession && profile ? ` · ${syncStatus === 'conflict' ? `Revisar ${conflictCount} ${conflictCount === 1 ? 'conflicto' : 'conflictos'}` : syncStatus === 'loading' ? `Guardando${pendingChanges ? ` ${pendingChanges}` : ''}…` : syncStatus === 'error' ? `${pendingChanges || ''} ${pendingChanges === 1 ? 'cambio pendiente' : 'cambios pendientes'}`.trim() : 'Protegido en la nube'}` : ''}</Text>
        </View>
      </Pressable>
      <View style={[styles.syncBadge, { backgroundColor: syncBadge.color }]}>
        <MaterialCommunityIcons name={syncBadge.icon} size={14} color={colors.sageDark} />
        <Text style={styles.syncBadgeText}>{syncBadge.label}</Text>
      </View>
      <Pressable accessibilityRole="link" accessibilityLabel="Abrir avisos" onPress={() => router.push('/notifications')} style={styles.bell}><MaterialCommunityIcons name="bell-outline" size={23} color={colors.ink} /><View style={styles.dot} /></Pressable>
    </View>
  );
}

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 50, height: 50, borderRadius: 20, backgroundColor: colors.peach, borderWidth: 1, borderColor: 'rgba(255,255,255,.75)', alignItems: 'center', justifyContent: 'center', ...shadowSoft, ...Platform.select({ web: { boxShadow: webDepth.control } as any }) },
  avatarText: { color: '#724A3A', fontFamily: serif, fontSize: 20, fontWeight: '700' },
  eyebrow: { color: colors.sageDark, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.ink, fontFamily: serif, fontSize: 21, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 10, marginTop: 1 },
  syncBadge: { height: 31, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 8 },
  syncBadgeText: { color: colors.sageDark, fontSize: 8, fontWeight: '900' },
  bell: { width: 43, height: 43, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(229,224,215,.86)', backgroundColor: 'rgba(255,253,252,.88)', alignItems: 'center', justifyContent: 'center', ...shadowSoft, ...Platform.select({ web: { boxShadow: webDepth.control } as any }) },
  dot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, backgroundColor: colors.rose, borderRadius: 4, borderWidth: 1, borderColor: colors.white }
});
