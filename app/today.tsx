import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { BreastfeedingChoice } from '@/components/BreastfeedingChoice';
import { CareChoiceKind, CareQuickChoice } from '@/components/CareQuickChoice';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { eventsForProfile, getDailyMetrics } from '@/lib/eventMetrics';
import { pregnancyTimeline } from '@/lib/prenatal';
import { useAppStore } from '@/store/useAppStore';
import { colors, shadow, webDepth } from '@/theme';
import { EventKind } from '@/types/domain';

type QuickItem = { kind: EventKind; label: string; hint: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; detail: string; color: string; behavior: 'timer' | 'instant' | 'details' };
const quick: QuickItem[] = [
  { kind: 'feeding', label: 'Iniciar pecho', hint: '1 toque', icon: 'mother-nurse', detail: 'Pecho', color: '#F4D3C1', behavior: 'timer' },
  { kind: 'sleep', label: 'Iniciar sueño', hint: '1 toque', icon: 'weather-night', detail: 'Durmiendo', color: '#DDD9ED', behavior: 'timer' },
  { kind: 'diaper', label: 'Pañal mojado', hint: 'Guardar ahora', icon: 'water-outline', detail: 'Mojado', color: '#DCECE6', behavior: 'instant' },
  { kind: 'symptom', label: 'Síntoma', hint: 'Añadir detalle', icon: 'medical-bag', detail: 'Observación nueva', color: '#F8E4D6', behavior: 'details' },
  { kind: 'medicine', label: 'Medicina', hint: 'Añadir detalle', icon: 'pill', detail: 'Pendiente de completar', color: '#E8E1D5', behavior: 'details' },
  { kind: 'comfort', label: 'Confort', hint: 'Añadir detalle', icon: 'heart-outline', detail: 'Rutina o episodio', color: '#F3E4DC', behavior: 'details' }
];

const eventIcons: Record<EventKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  feeding: 'mother-nurse', sleep: 'weather-night', diaper: 'water-outline', symptom: 'medical-bag',
  medicine: 'pill', temperature: 'thermometer', growth: 'chart-line', prenatal: 'heart-pulse', comfort: 'heart-outline'
};

function BabyDashboard() {
  const router = useRouter();
  const { events, activeProfileId, activeSessions, startSession, addQuickEvent, undoLastAdd, lastAddedEventId } = useAppStore();
  const [feedback, setFeedback] = useState('');
  const [feedingChoice, setFeedingChoice] = useState(false);
  const [careChoice, setCareChoice] = useState<CareChoiceKind>();
  useEffect(() => { if (!feedback) return; const timer = setTimeout(() => setFeedback(''), 4500); return () => clearTimeout(timer); }, [feedback]);
  const recentEvents = eventsForProfile(events, activeProfileId);
  const metrics = getDailyMetrics(events, activeProfileId);
  const activeSession = activeSessions.feeding || activeSessions.sleep;
  const add = (item: QuickItem) => {
    if (item.kind === 'feeding') { if (activeSessions.feeding) router.push('/track/feeding'); else setFeedingChoice(true); return; }
    if (item.kind === 'sleep') { if (activeSessions.sleep) router.push('/track/sleep'); else setCareChoice('sleep'); return; }
    if (item.kind === 'diaper' || item.kind === 'comfort') { setCareChoice(item.kind); return; }
    if (item.behavior === 'timer') {
      const timedKind = item.kind as 'feeding' | 'sleep';
      if (activeSessions[timedKind]) { router.push({ pathname: '/track/[kind]', params: { kind: timedKind } }); return; }
      startSession(timedKind, item.detail); setFeedback('Sueño iniciado'); return;
    }
    if (item.behavior === 'instant') { addQuickEvent(item.kind, 'Pañal', item.detail); setFeedback('Pañal mojado guardado'); return; }
    router.push({ pathname: '/track/[kind]', params: { kind: item.kind } });
  };
  const chooseCare = (choice: string) => { const kind = careChoice; setCareChoice(undefined); if (kind === 'sleep') { if (choice === 'timer') { startSession('sleep', 'Durmiendo'); setFeedback('Cronómetro de sueño iniciado'); } else if (choice === 'wake') { addQuickEvent('sleep', 'Despertó', 'Despertar registrado'); setFeedback('Despertar guardado'); } else router.push('/track/sleep'); } else if (kind === 'diaper') { const detail = choice === 'wet' ? 'Mojado' : choice === 'bowel' ? 'Evacuación' : choice === 'both' ? 'Mojado y evacuación' : undefined; if (detail) { addQuickEvent('diaper', 'Pañal', detail); setFeedback(`${detail} guardado`); } else router.push('/track/diaper'); } else if (kind === 'comfort') { const title = choice === 'irritability' ? 'Irritabilidad' : choice === 'gas' ? 'Gases' : choice === 'regurgitation' ? 'Regurgitación' : undefined; if (title) { addQuickEvent('comfort', title, `${title} observada`); setFeedback(`${title} guardada`); } else router.push('/track/comfort'); } };
  return (
    <>
      <BreastfeedingChoice visible={feedingChoice} onClose={() => setFeedingChoice(false)} onRegister={() => { addQuickEvent('feeding', 'Lactancia', 'Pecho · sin duración'); setFeedingChoice(false); setFeedback('Lactancia guardada sin tiempo'); }} onTimer={() => { startSession('feeding', 'Pecho'); setFeedingChoice(false); setFeedback('Cronómetro de lactancia iniciado'); }} onDetails={() => { setFeedingChoice(false); router.push('/track/feeding'); }} />
      {careChoice ? <CareQuickChoice kind={careChoice} visible onClose={() => setCareChoice(undefined)} onChoose={chooseCare} /> : null}
      <Text style={styles.kicker}>REGISTRO</Text><Text style={styles.greeting}>Lo cotidiano, en un toque</Text><Text style={styles.pageIntro}>Toca una vez para iniciar o guardar. Los detalles siempre son opcionales y pueden añadirse después.</Text>

      {activeSession ? <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/track/[kind]', params: { kind: activeSession.kind } })} style={styles.activeSession}><View style={styles.activePulse} /><View style={{ flex: 1 }}><Text style={styles.activeOverline}>EN CURSO</Text><Text style={styles.activeTitle}>{activeSession.kind === 'feeding' ? 'Lactancia' : 'Sueño'} · {activeSession.label}</Text></View><Text style={styles.activeAction}>Abrir</Text><MaterialCommunityIcons name="chevron-right" size={19} color={colors.sageDark} /></Pressable> : null}

      <SectionTitle title="Lo más frecuente" action="Un toque" />
      <View style={styles.quickGrid}>{quick.slice(0, 3).map((item) => <QuickRegistration key={item.kind} item={item} onPress={() => add(item)} />)}</View>
      <View style={styles.subsectionHead}><Text style={styles.subsectionTitle}>Salud y bienestar</Text><Text style={styles.subsectionHint}>Agrega solo lo necesario</Text></View>
      <View style={styles.quickGrid}>{quick.slice(3).map((item) => <QuickRegistration key={item.kind} item={item} onPress={() => add(item)} secondary />)}</View>
      {feedback ? <View style={styles.feedback}><MaterialCommunityIcons name="check-circle" size={18} color={colors.sageDark} /><Text style={styles.feedbackText}>{feedback}</Text>{lastAddedEventId ? <Pressable accessibilityRole="button" onPress={() => { undoLastAdd(); setFeedback('Registro deshecho'); }}><Text style={styles.feedbackUndo}>DESHACER</Text></Pressable> : null}</View> : null}

      <SectionTitle title="Resumen de hoy" action="Ver agenda" onPress={() => router.push('/calendar')} />
      <View style={styles.metricRow}>
        <Metric value={String(metrics.feedings)} label="Tomas" note={metrics.feedings ? 'registradas hoy' : 'sin registros'} />
        <Metric value={metrics.sleepMinutes >= 60 ? `${Math.floor(metrics.sleepMinutes / 60)} h ${metrics.sleepMinutes % 60}` : `${metrics.sleepMinutes} min`} label="Sueño" note={`${metrics.sleepPeriods} ${metrics.sleepPeriods === 1 ? 'periodo' : 'periodos'}`} />
        <Metric value={String(metrics.diapers)} label="Pañales" note={metrics.diapers ? `${metrics.wetDiapers} mojados · ${metrics.bowelMovements} evacuaciones` : 'sin registros'} />
      </View>
      {metrics.symptoms ? <Pressable onPress={() => router.push({ pathname: '/track/[kind]', params: { kind: 'symptom' } })} style={styles.dailySignal}><MaterialCommunityIcons name="medical-bag" size={18} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.dailySignalTitle}>{metrics.symptoms} {metrics.symptoms === 1 ? 'observación de bienestar' : 'observaciones de bienestar'} hoy</Text><Text style={styles.dailySignalBody}>{metrics.latestTemperature ? `Última temperatura: ${metrics.latestTemperature} °C. ` : ''}Abre el registro para revisar el detalle.</Text></View><MaterialCommunityIcons name="chevron-right" size={19} color={colors.muted} /></Pressable> : null}

      <SectionTitle title="Últimos movimientos" action="Ver todo" onPress={() => router.push('/calendar')} />
      <View style={styles.timeline}>{recentEvents.slice(0, 3).map((event, index, list) => <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/track/[kind]', params: { kind: event.kind === 'temperature' ? 'symptom' : event.kind } })} key={event.id} style={styles.event}><View style={styles.eventRail}><View style={styles.eventDot}><MaterialCommunityIcons name={eventIcons[event.kind]} size={17} color={colors.sageDark} /></View>{index < list.length - 1 && <View style={styles.line} />}</View><View style={styles.eventBody}><View style={styles.eventTitleRow}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventTime}>{new Date(event.occurredAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text></View><Text style={styles.eventDetail}>{event.detail}</Text></View></Pressable>)}</View>
    </>
  );
}

function PrenatalDashboard() {
  const router = useRouter();
  const { activeProfileId, profiles, prenatalRecords } = useAppStore();
  const profile = profiles.find((item) => item.id === activeProfileId);
  const record = prenatalRecords[activeProfileId];
  const timeline = pregnancyTimeline({ lastMenstrualPeriod: record?.lastMenstrualPeriod, dueDate: record?.dueDate || profile?.dueDate });
  return <>
    <Text style={styles.kicker}>EMBARAZO ACTUAL</Text><Text style={styles.greeting}>Todo en un solo lugar</Text>
    <LinearGradient colors={['#B97769', '#D29380']} style={[styles.hero, { marginTop: 18 }]}>
      <Text style={styles.heroOverline}>SEMANA ACTUAL</Text><Text style={styles.week}>{timeline.weeks ?? '—'} <Text style={styles.weekSmall}>{timeline.weeks !== undefined ? `+ ${timeline.days} días` : 'sin fecha'}</Text></Text>
      <Text style={styles.heroBody}>{timeline.trimester ? `${timeline.trimester === 1 ? 'Primer' : timeline.trimester === 2 ? 'Segundo' : 'Tercer'} trimestre` : 'Agrega las fechas del embarazo'} · FPP {timeline.dueDate ? new Date(`${timeline.dueDate}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'sin registrar'}</Text><View style={styles.progress}><View style={{ width: `${timeline.progress ?? 0}%`, height: '100%', borderRadius: 6, backgroundColor: '#FFF' }} /></View>
      <Text style={styles.heroFoot}>Cálculo de la app a partir de la fecha confirmada</Text>
    </LinearGradient>
    <Pressable style={styles.primaryButton} onPress={() => router.push('/prenatal')}><MaterialCommunityIcons name="folder-heart-outline" size={20} color="#FFF" /><Text style={styles.primaryButtonText}>Abrir expediente prenatal</Text></Pressable>
    <SectionTitle title="Próximos pasos" />
    <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/track/[kind]', params: { kind: 'prenatal' } })} style={styles.appointment}><View style={styles.dateBox}><Text style={styles.dateDay}>22</Text><Text style={styles.dateMonth}>JUL</Text></View><View style={{ flex: 1 }}><Text style={styles.appointmentTitle}>Consulta de ginecología</Text><Text style={styles.eventDetail}>11:30 · Dra. Martínez</Text><Text style={styles.appointmentNote}>3 preguntas guardadas</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} /></Pressable>
    <SectionTitle title="Tu seguimiento" />
    <View style={styles.prenatalGrid}><PrenatalCard icon="pill" value="Desde 12 ene" label="Ácido fólico" /><PrenatalCard icon="stethoscope" value="5 consultas" label="Ginecología" /><PrenatalCard icon="baby-face-outline" value="3 estudios" label="Materno-fetal" /><PrenatalCard icon="test-tube" value="2 recientes" label="Laboratorios" /></View>
    <SectionTitle title="Análisis y documentos" />
    <Pressable onPress={() => router.push('/analysis')} style={styles.insight}><View style={[styles.insightMark, { backgroundColor: colors.lilac }]}><MaterialCommunityIcons name="file-search-outline" size={21} color="#6D5E8A" /></View><View style={styles.insightText}><Text style={styles.insightTitle}>Revisar comparaciones verificables</Text><Text style={styles.insightBody}>Emi solo mostrará cambios cuando existan campos equivalentes en documentos confirmados.</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>
    <Pressable style={styles.primaryButton} onPress={() => router.push('/documents')}><MaterialCommunityIcons name="file-plus-outline" size={20} color="#FFF" /><Text style={styles.primaryButtonText}>Cargar un informe</Text></Pressable>
  </>;
}

export default function TodayScreen() {
  const isPregnancy = useAppStore((s) => s.profiles.find((profile) => profile.id === s.activeProfileId)?.stage === 'pregnancy');
  return <AppShell><ProfileHeader />{isPregnancy ? <PrenatalDashboard /> : <BabyDashboard />}</AppShell>;
}

function Metric({ value, label, note }: { value: string; label: string; note: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricNote}>{note}</Text></View>; }
function QuickRegistration({ item, onPress, secondary }: { item: QuickItem; onPress: () => void; secondary?: boolean }) { return <Pressable accessibilityRole="button" accessibilityLabel={item.label} style={({ pressed }) => [styles.quickItem, secondary && styles.quickSecondary, pressed && styles.quickPressed]} onPress={onPress}><View style={[styles.quickIcon, { backgroundColor: item.color }]}><MaterialCommunityIcons name={item.icon} size={23} color={colors.sageDeep} /></View><Text style={styles.quickLabel}>{item.label}</Text><Text style={styles.quickHint}>{item.hint}</Text><View style={styles.quickPlus}><MaterialCommunityIcons name="plus" size={12} color={colors.sageDark} /></View></Pressable>; }
function PrenatalCard({ icon, value, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string }) { return <View style={styles.prenatalCard}><MaterialCommunityIcons name={icon} size={22} color={colors.sageDark} /><Text style={styles.prenatalValue}>{value}</Text><Text style={styles.metricNote}>{label}</Text></View>; }

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  kicker: { color: colors.sageDark, fontSize: 8, letterSpacing: 1.3, fontWeight: '900' }, greeting: { color: colors.ink, fontFamily: serif, fontSize: 30, lineHeight: 37, fontWeight: '700', letterSpacing: -.5, marginTop: 4 },
  pageIntro: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  hero: { marginTop: 18, borderRadius: 24, padding: 20, ...shadow }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, heroIcon: { width: 34, height: 34, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }, heroOverline: { color: '#F2F7F5', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, heroTitle: { color: '#FFF', fontSize: 23, fontWeight: '800', marginTop: 14 }, heroBody: { color: '#E8F0ED', fontSize: 13, marginTop: 5 }, heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,.22)', marginVertical: 15 }, heroFoot: { color: '#F1F5F3', fontSize: 10, lineHeight: 15 },
  activeSession: { minHeight: 60, marginTop: 12, borderRadius: 18, paddingHorizontal: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: '#BED4CD', flexDirection: 'row', alignItems: 'center', gap: 9 }, activePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sageDark }, activeOverline: { color: colors.sageDark, fontSize: 8, fontWeight: '900', letterSpacing: .8 }, activeTitle: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 2 }, activeAction: { color: colors.sageDark, fontSize: 9, fontWeight: '800' },
  subsectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 19, marginBottom: 9 }, subsectionTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' }, subsectionHint: { color: colors.muted, fontSize: 7 }, quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, quickItem: { position: 'relative', width: '31%', minHeight: 124, backgroundColor: 'rgba(255,253,252,.92)', borderRadius: 23, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(231,226,218,.88)', ...Platform.select({ web: { boxShadow: webDepth.soft, transitionDuration: '140ms' } as any }) }, quickSecondary: { minHeight: 108, backgroundColor: 'rgba(252,250,247,.92)' }, quickPressed: { opacity: .75, transform: [{ scale: .97 }, { translateY: 2 }] }, quickIcon: { width: 48, height: 48, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, quickLabel: { color: colors.ink, fontSize: 9, fontWeight: '900', textAlign: 'center' }, quickHint: { color: colors.muted, fontSize: 7, fontWeight: '700' }, quickPlus: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 9, backgroundColor: colors.mint, borderWidth: 1, borderColor: 'rgba(255,255,255,.8)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, feedback: { minHeight: 45, borderRadius: 15, marginTop: 10, paddingHorizontal: 12, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', gap: 8 }, feedbackText: { color: colors.sageDark, fontSize: 9, fontWeight: '800', flex: 1 }, feedbackUndo: { color: colors.sageDark, fontSize: 8, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 15 }, metricValue: { color: colors.sageDeep, fontFamily: serif, fontWeight: '700', fontSize: 21 }, metricLabel: { color: colors.ink, fontWeight: '800', fontSize: 10, marginTop: 2 }, metricNote: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  dailySignal: { minHeight: 62, marginTop: 9, borderRadius: 17, backgroundColor: colors.mint, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, dailySignalTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' }, dailySignalBody: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  insight: { backgroundColor: colors.white, borderRadius: 20, padding: 15, flexDirection: 'row', gap: 12, marginBottom: 9, borderWidth: 1, borderColor: colors.line }, insightMark: { width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, insightText: { flex: 1 }, insightHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, insightTitle: { color: colors.ink, fontWeight: '800', fontSize: 13, flex: 1 }, insightBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginVertical: 6 }, level: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' }, levelText: { fontSize: 8, fontWeight: '800' },
  timeline: { backgroundColor: colors.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line }, event: { flexDirection: 'row', minHeight: 72 }, eventRail: { width: 38, alignItems: 'center' }, eventDot: { width: 32, height: 32, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, line: { width: 1, flex: 1, backgroundColor: colors.line }, eventBody: { flex: 1, paddingBottom: 14 }, eventTitleRow: { flexDirection: 'row', justifyContent: 'space-between' }, eventTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, eventTime: { color: colors.muted, fontSize: 10 }, eventDetail: { color: colors.muted, fontSize: 11, marginVertical: 4 },
  week: { color: '#FFF', fontSize: 52, fontWeight: '800', marginTop: 4 }, weekSmall: { fontSize: 20, fontWeight: '700' }, progress: { height: 7, borderRadius: 6, backgroundColor: 'rgba(255,255,255,.25)', marginVertical: 15 },
  appointment: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 14 }, dateBox: { width: 50, height: 55, borderRadius: 15, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' }, dateDay: { color: '#9A5B49', fontSize: 20, fontWeight: '800' }, dateMonth: { color: '#9A5B49', fontSize: 9, fontWeight: '800' }, appointmentTitle: { color: colors.ink, fontWeight: '800', fontSize: 13 }, appointmentNote: { color: colors.sageDark, fontSize: 10, fontWeight: '700', marginTop: 5 },
  prenatalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, prenatalCard: { width: '48.5%', backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.line, padding: 15 }, prenatalValue: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 14 }, primaryButton: { backgroundColor: colors.sageDark, borderRadius: 18, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 14 }, primaryButtonText: { color: '#FFF', fontWeight: '800', fontSize: 13 }
});
