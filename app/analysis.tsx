import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { ProfileHeader } from '@/components/ProfileHeader';
import { deriveAnalysisCards } from '@/lib/analysis';
import { useAppStore } from '@/store/useAppStore';
import { colors, shadow } from '@/theme';

const stateMeta = {
  observation: { label: 'Observación', icon: 'chart-timeline-variant' as const, color: colors.mint },
  learning: { label: 'Aprendiendo', icon: 'progress-clock' as const, color: '#FFF1D8' },
  review: { label: 'Conviene revisar', icon: 'file-search-outline' as const, color: '#F8E4D6' }
};

export default function AnalysisScreen() {
  const router = useRouter();
  const { profiles, activeProfileId, events, documents } = useAppStore();
  const profile = profiles.find((item) => item.id === activeProfileId) ?? profiles[0];
  const cards = deriveAnalysisCards({ profile, events, documents });
  return <AppShell><ProfileHeader eyebrow="ANÁLISIS EXPLICABLE" />
    <Text style={styles.title}>Lo que muestran los registros</Text><Text style={styles.subtitle}>Emi reúne cálculos y comparaciones verificables. Cada tarjeta explica qué datos utilizó y evita interpretar causalidad.</Text>
    <Pressable accessibilityRole="link" onPress={() => router.push('/assistant')} style={styles.boundary}><MaterialCommunityIcons name="creation-outline" size={21} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.boundaryTitle}>Análisis local + Asistente Emi</Text><Text style={styles.boundaryText}>Este panel conserva cálculos deterministas. Si lo autorizas, el asistente puede resumir evidencias sin cambiar su origen ni decidir atención médica.</Text><Text style={styles.boundaryLink}>Abrir Asistente Emi →</Text></View></Pressable>
    <View style={styles.cards}>{cards.map((card) => { const meta = stateMeta[card.state]; return <Pressable accessibilityRole="link" key={card.id} onPress={() => router.push(card.href as never)} style={styles.card}><View style={styles.cardTop}><View style={[styles.icon, { backgroundColor: meta.color }]}><MaterialCommunityIcons name={meta.icon} size={20} color={colors.ink} /></View><View style={[styles.pill, { backgroundColor: meta.color }]}><Text style={styles.pillText}>{meta.label}</Text></View></View><Text style={styles.cardTitle}>{card.title}</Text><Text style={styles.cardBody}>{card.body}</Text><View style={styles.evidence}><Text style={styles.evidenceLabel}>BASE DEL CÁLCULO</Text><Text style={styles.evidenceText}>{card.evidence}</Text><Text style={styles.source}>{card.source === 'document' ? 'Dato documental' : 'Calculado por la app'}</Text></View><View style={styles.open}><Text style={styles.openText}>Abrir datos relacionados</Text><MaterialCommunityIcons name="arrow-right" size={17} color={colors.sageDark} /></View></Pressable>; })}</View>
    <View style={styles.notice}><MaterialCommunityIcons name="information-outline" size={19} color="#7D632B" /><Text style={styles.noticeText}>Un cambio temporal no demuestra una causa. Lleva tus preguntas y el Resumen para consulta al profesional correspondiente.</Text></View>
  </AppShell>;
}

const styles = StyleSheet.create({ title: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5, maxWidth: 620 }, boundary: { backgroundColor: colors.mint, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 10, marginTop: 18 }, boundaryTitle: { color: colors.sageDark, fontSize: 10, fontWeight: '900' }, boundaryText: { color: colors.sageDark, fontSize: 8, lineHeight: 13, marginTop: 3 }, boundaryLink: { color: colors.sageDeep, fontSize: 8, fontWeight: '900', marginTop: 6 }, cards: { gap: 11, marginTop: 18 }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 17, ...shadow }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, icon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, pillText: { color: colors.ink, fontSize: 7, fontWeight: '900' }, cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 13 }, cardBody: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5 }, evidence: { backgroundColor: colors.canvas, borderRadius: 13, padding: 11, marginTop: 12 }, evidenceLabel: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: .8 }, evidenceText: { color: colors.ink, fontSize: 8, lineHeight: 13, marginTop: 4 }, source: { color: colors.sageDark, fontSize: 7, fontWeight: '900', marginTop: 5 }, open: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }, openText: { color: colors.sageDark, fontSize: 9, fontWeight: '900' }, notice: { backgroundColor: '#FFF4DD', borderRadius: 16, padding: 13, flexDirection: 'row', gap: 9, marginTop: 15 }, noticeText: { color: '#7D632B', fontSize: 9, lineHeight: 14, flex: 1 } });
