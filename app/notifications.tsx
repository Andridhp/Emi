import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import { deriveOperationalNotices, OperationalNotice } from '@/lib/notices';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

const toneColor = { peach: '#F8E4D6', amber: '#FFF1D8', mint: colors.mint };

export default function NotificationsScreen() {
  const router = useRouter();
  const { activeProfileId, profileNames, events, documents, activeSessions, dismissedNoticeIds, dismissNotice, restoreNotice } = useAppStore();
  const all = deriveOperationalNotices({ profileId: activeProfileId, events, documents, activeSessions });
  const pending = all.filter((notice) => !dismissedNoticeIds.includes(notice.id));
  const archived = all.filter((notice) => dismissedNoticeIds.includes(notice.id));
  return <AppShell>
    <Text style={styles.eyebrow}>CENTRO DE AVISOS</Text><Text style={styles.title}>Lo importante, sin ruido</Text><Text style={styles.subtitle}>Solo tareas y recordatorios de {profileNames[activeProfileId] || 'este perfil'}. Las señales clínicas viven en Orientación segura.</Text>
    <View style={styles.summary}><View><Text style={styles.summaryValue}>{pending.length}</Text><Text style={styles.summaryLabel}>pendientes</Text></View><View style={styles.summaryRule} /><Text style={styles.summaryText}>No enviamos avisos por cada registro ni usamos promedios para alarmarte.</Text></View>
    <Text style={styles.section}>POR REVISAR</Text>
    <View style={styles.list}>{pending.length ? pending.map((notice) => <NoticeRow key={notice.id} notice={notice} onOpen={() => router.push(notice.href as never)} onSecondary={() => dismissNotice(notice.id)} secondaryLabel="Archivar" />) : <View style={styles.empty}><MaterialCommunityIcons name="check-circle-outline" size={29} color={colors.sageDark} /><Text style={styles.emptyTitle}>Todo al día</Text><Text style={styles.emptyBody}>No hay tareas pendientes para este perfil.</Text></View>}</View>
    {archived.length ? <><Text style={styles.section}>ARCHIVADOS</Text><View style={styles.list}>{archived.map((notice) => <NoticeRow key={notice.id} notice={notice} onOpen={() => router.push(notice.href as never)} onSecondary={() => restoreNotice(notice.id)} secondaryLabel="Restaurar" />)}</View></> : null}
    <Pressable accessibilityRole="link" onPress={() => router.push('/guidance')} style={styles.info}><MaterialCommunityIcons name="shield-alert-outline" size={19} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>¿Te preocupa algo que ocurre ahora?</Text><Text style={styles.infoText}>Abre Orientación segura para revisar señales explícitas de atención.</Text></View><MaterialCommunityIcons name="chevron-right" size={19} color={colors.sageDark} /></Pressable>
  </AppShell>;
}

function NoticeRow({ notice, onOpen, onSecondary, secondaryLabel }: { notice: OperationalNotice; onOpen: () => void; onSecondary: () => void; secondaryLabel: string }) {
  return <View style={styles.notice}><Pressable accessibilityRole="link" onPress={onOpen} style={styles.noticeMain}><View style={[styles.icon, { backgroundColor: toneColor[notice.tone] }]}><MaterialCommunityIcons name={notice.icon} size={22} color={colors.ink} /></View><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>{notice.title}</Text><Text style={styles.noticeBody}>{notice.body}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} /></Pressable><Pressable accessibilityRole="button" onPress={onSecondary} style={styles.secondaryAction}><Text style={styles.secondaryText}>{secondaryLabel}</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.sageDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 28, fontWeight: '900', marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5, marginBottom: 18, maxWidth: 590 }, summary: { backgroundColor: colors.mint, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }, summaryValue: { color: colors.sageDark, fontSize: 23, fontWeight: '900' }, summaryLabel: { color: colors.muted, fontSize: 8 }, summaryRule: { width: 1, height: 35, backgroundColor: '#C9DCD4' }, summaryText: { color: colors.sageDark, fontSize: 9, lineHeight: 14, flex: 1 }, section: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 22, marginBottom: 8 }, list: { gap: 9 }, notice: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 19, overflow: 'hidden' }, noticeMain: { minHeight: 70, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }, icon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, noticeTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, noticeBody: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 }, secondaryAction: { borderTopWidth: 1, borderTopColor: colors.line, minHeight: 34, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: colors.sageDark, fontSize: 8, fontWeight: '900' }, empty: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 24, alignItems: 'center' }, emptyTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 7 }, emptyBody: { color: colors.muted, fontSize: 9, marginTop: 3 }, info: { backgroundColor: colors.mint, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22 }, infoTitle: { color: colors.sageDark, fontSize: 10, fontWeight: '900' }, infoText: { color: colors.sageDark, fontSize: 8, lineHeight: 13, marginTop: 2 }
});
