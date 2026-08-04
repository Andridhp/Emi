import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { ProfileHeader } from '@/components/ProfileHeader';
import { useAuth } from '@/context/AuthContext';
import { syncEntityLabel } from '@/lib/syncConflicts';
import { useAppStore } from '@/store/useAppStore';
import { colors, shadowSoft } from '@/theme';

const fieldLabels: Record<string, string> = {
  name: 'Nombre', title: 'Registro', detail: 'Detalle', text: 'Pregunta', occurredAt: 'Fecha',
  dueDate: 'Fecha probable', bornAt: 'Nacimiento', updatedAt: 'Actualizado', recoveryNotes: 'Recuperación'
};

function describeValue(value: unknown) {
  if (value === null || value === undefined) return 'Esta versión elimina el registro.';
  if (typeof value !== 'object') return String(value);
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => key !== 'id' && key !== 'profileId' && item !== undefined && item !== '' && ['string', 'number', 'boolean'].includes(typeof item))
    .slice(0, 4);
  if (!entries.length) return 'Registro guardado sin una descripción breve.';
  return entries.map(([key, item]) => `${fieldLabels[key] ?? key}: ${String(item)}`).join('\n');
}

export default function SyncConflictsScreen() {
  const router = useRouter();
  const { syncNow } = useAuth();
  const conflicts = useAppStore((state) => state.syncConflicts);
  const resolveSyncConflict = useAppStore((state) => state.resolveSyncConflict);
  const [busyKey, setBusyKey] = useState<string>();

  const choose = async (key: string, resolution: 'local' | 'cloud') => {
    setBusyKey(key);
    resolveSyncConflict(key, resolution);
    if (!useAppStore.getState().syncConflicts.length) {
      const result = await syncNow();
      if (result.ok) {
        Alert.alert('Cambios protegidos', 'La versión elegida quedó sincronizada con la familia.');
        router.back();
      } else Alert.alert('La elección quedó guardada', result.message ?? 'Emi volverá a intentar cuando haya conexión.');
    }
    setBusyKey(undefined);
  };

  return <AppShell>
    <ProfileHeader eyebrow="SINCRONIZACIÓN" />
    <View style={styles.introIcon}><MaterialCommunityIcons name="compare-horizontal" size={28} color={colors.sageDark} /></View>
    <Text style={styles.title}>Revisemos estos cambios</Text>
    <Text style={styles.subtitle}>La misma información fue modificada aquí y en otro dispositivo. Emi pausó la sincronización para no sobrescribir ninguna versión.</Text>

    {!conflicts.length ? <View style={styles.empty}>
      <MaterialCommunityIcons name="cloud-check-outline" size={30} color={colors.sageDark} />
      <Text style={styles.emptyTitle}>No hay cambios por comparar</Text>
      <Pressable onPress={() => router.back()} style={styles.doneButton}><Text style={styles.doneText}>Volver</Text></Pressable>
    </View> : conflicts.map((conflict) => <View key={conflict.key} style={styles.card}>
      <Text style={styles.kind}>{syncEntityLabel(conflict.entity).toUpperCase()}</Text>
      <Text style={styles.cardTitle}>Dos versiones diferentes</Text>
      <View style={styles.version}>
        <View style={styles.versionHeader}><MaterialCommunityIcons name="cellphone" size={17} color={colors.sageDark} /><Text style={styles.versionTitle}>Este dispositivo</Text></View>
        <Text style={styles.versionBody}>{describeValue(conflict.localValue)}</Text>
        <Pressable disabled={Boolean(busyKey)} onPress={() => void choose(conflict.key, 'local')} style={styles.primaryButton}><Text style={styles.primaryText}>Conservar esta versión</Text></Pressable>
      </View>
      <View style={[styles.version, styles.cloudVersion]}>
        <View style={styles.versionHeader}><MaterialCommunityIcons name="cloud-outline" size={17} color={colors.sageDeep} /><Text style={styles.versionTitle}>Versión de la nube</Text></View>
        <Text style={styles.versionBody}>{describeValue(conflict.cloudValue)}</Text>
        <Pressable disabled={Boolean(busyKey)} onPress={() => void choose(conflict.key, 'cloud')} style={styles.secondaryButton}><Text style={styles.secondaryText}>Usar versión de la nube</Text></Pressable>
      </View>
    </View>)}

    <View style={styles.notice}><MaterialCommunityIcons name="shield-check-outline" size={19} color={colors.sageDark} /><Text style={styles.noticeText}>Elegir una versión no interpreta ni modifica su contenido clínico. Sólo decide cuál registro conservar.</Text></View>
  </AppShell>;
}

const styles = StyleSheet.create({
  introIcon: { width: 52, height: 52, borderRadius: 19, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', ...shadowSoft },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', marginTop: 15 },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 6, marginBottom: 18 },
  card: { borderRadius: 23, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 14, ...shadowSoft },
  kind: { color: colors.sageDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 5, marginBottom: 12 },
  version: { borderRadius: 17, padding: 13, backgroundColor: colors.mint, borderWidth: 1, borderColor: '#CDE0D9', marginTop: 8 },
  cloudVersion: { backgroundColor: '#EEF4F7', borderColor: '#D4E1E7' },
  versionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  versionTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  versionBody: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 8 },
  primaryButton: { minHeight: 39, borderRadius: 13, backgroundColor: colors.sageDark, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  secondaryButton: { minHeight: 39, borderRadius: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: '#C8D8DF', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { color: colors.sageDeep, fontSize: 9, fontWeight: '900' },
  empty: { borderRadius: 23, padding: 24, alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: '900', marginTop: 10 },
  doneButton: { marginTop: 15, borderRadius: 13, paddingHorizontal: 24, paddingVertical: 11, backgroundColor: colors.sageDark },
  doneText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  notice: { flexDirection: 'row', gap: 9, borderRadius: 17, padding: 13, backgroundColor: colors.mint, marginTop: 3 },
  noticeText: { flex: 1, color: colors.sageDark, fontSize: 8, lineHeight: 13 }
});
