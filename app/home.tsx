import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { BreastfeedingChoice } from '@/components/BreastfeedingChoice';
import { CareChoiceKind, CareQuickChoice } from '@/components/CareQuickChoice';
import { ProfileHeader } from '@/components/ProfileHeader';
import { predictNextSleep, sleepConfidenceLabel } from '@/lib/sleepEngine';
import { useAppStore } from '@/store/useAppStore';
import { colors, shadow, webDepth } from '@/theme';

const frequent: { kind: 'feeding' | 'sleep' | 'diaper'; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; detail: string }[] = [
  { kind: 'feeding', label: 'Iniciar pecho', icon: 'mother-nurse', color: '#F4D3C1', detail: 'Pecho' },
  { kind: 'sleep', label: 'Iniciar sueño', icon: 'weather-night', color: '#DDD9ED', detail: 'Durmiendo' },
  { kind: 'diaper', label: 'Pañal mojado', icon: 'water-outline', color: '#DCECE6', detail: 'Mojado' }
];

export default function HomeScreen() {
  const router = useRouter();
  const { activeProfileId, profiles, events, activeSessions, caregiverName, startSession, addQuickEvent, undoLastAdd, lastAddedEventId } = useAppStore();
  const [quickFeedback, setQuickFeedback] = useState('');
  const [feedingChoice, setFeedingChoice] = useState(false);
  const [careChoice, setCareChoice] = useState<CareChoiceKind>();
  useEffect(() => { if (!quickFeedback) return; const timer = setTimeout(() => setQuickFeedback(''), 4500); return () => clearTimeout(timer); }, [quickFeedback]);
  const profile = profiles.find((item) => item.id === activeProfileId);
  const prediction = predictNextSleep({ events, profileId: activeProfileId, birthDate: profile?.birthDate, sleepInProgress: Boolean(activeSessions.sleep) });
  const firstName = caregiverName ? `, ${caregiverName.split(' ')[0]}` : '';
  const todayLabel = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  if (profile?.stage === 'pregnancy') {
    return <AppShell><ProfileHeader eyebrow="Tu espacio" />
      <Text style={styles.greeting}>Hola{firstName}. Vamos paso a paso.</Text>
      <Text style={styles.intro}>Aquí tienes solo lo importante para hoy. El resto seguirá disponible cuando lo necesites.</Text>
      <View style={[styles.nowCard, styles.pregnancyCard]}><Text style={styles.overline}>EMBARAZO ACTUAL</Text><Text style={styles.nowTitle}>Tu historia prenatal</Text><Text style={styles.nowBody}>Planeación, fechas, suplementos, antecedentes y seguimiento en un expediente continuo.</Text><Pressable onPress={() => router.push('/prenatal')} style={styles.cardLink}><Text style={styles.cardLinkText}>Abrir expediente prenatal</Text><MaterialCommunityIcons name="arrow-right" size={18} color="#FFF" /></Pressable></View>
      <Text style={styles.sectionTitle}>¿Qué quieres hacer?</Text>
      <View style={styles.quickRow}><Quick label="Consulta" icon="stethoscope" onPress={() => router.push({ pathname: '/track/[kind]', params: { kind: 'prenatal' } })} /><Quick label="Síntoma" icon="medical-bag" onPress={() => router.push({ pathname: '/track/[kind]', params: { kind: 'symptom' } })} /><Quick label="Documento" icon="file-plus-outline" onPress={() => router.push('/documents')} /></View>
      <SecondaryLinks router={router} />
    </AppShell>;
  }

  let title = 'Estamos aprendiendo su ritmo';
  let body = prediction.explanation[0] || 'Registra sueño y despertares para construir una referencia personal.';
  if (prediction.phase === 'sleeping') { title = 'Sueño en curso'; body = 'Cuando despierte, finaliza el registro para conservar la duración.'; }
  else if (prediction.phase === 'within') { title = 'Observa sus señales ahora'; body = 'Puede acercarse un momento de sueño. La estimación acompaña; tu bebé marca el ritmo.'; }
  else if (prediction.predictedAt) {
    const min = prediction.rangeStart ? Math.max(0, Math.round((new Date(prediction.rangeStart).getTime() - Date.now()) / 60000)) : 0;
    title = min ? `Posible sueño en ${min} min` : 'Puede acercarse un momento de sueño';
    body = `${sleepConfidenceLabel[prediction.confidence]}. Es una estimación basada en sus registros.`;
  }
  const rangeLabel = prediction.rangeStart && prediction.rangeEnd
    ? `${new Date(prediction.rangeStart).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}–${new Date(prediction.rangeEnd).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    : undefined;
  const quickAction = (item: typeof frequent[number]) => {
    if (item.kind === 'feeding') { if (activeSessions.feeding) router.push('/track/feeding'); else setFeedingChoice(true); return; }
    if (item.kind === 'sleep' && activeSessions.sleep) { router.push('/track/sleep'); return; }
    setCareChoice(item.kind);
  };
  const chooseCare = (choice: string) => { const kind = careChoice; setCareChoice(undefined); if (kind === 'sleep') { if (choice === 'timer') { startSession('sleep', 'Durmiendo'); setQuickFeedback('Cronómetro de sueño iniciado'); } else if (choice === 'wake') { addQuickEvent('sleep', 'Despertó', 'Despertar registrado'); setQuickFeedback('Despertar guardado'); } else router.push('/track/sleep'); } else if (kind === 'diaper') { const detail = choice === 'wet' ? 'Mojado' : choice === 'bowel' ? 'Evacuación' : choice === 'both' ? 'Mojado y evacuación' : undefined; if (detail) { addQuickEvent('diaper', 'Pañal', detail); setQuickFeedback(`${detail} guardado`); } else router.push('/track/diaper'); } };

  return <AppShell><ProfileHeader eyebrow="Tu espacio" />
    <BreastfeedingChoice visible={feedingChoice} onClose={() => setFeedingChoice(false)} onRegister={() => { addQuickEvent('feeding', 'Lactancia', 'Pecho · sin duración'); setFeedingChoice(false); setQuickFeedback('Lactancia guardada sin tiempo'); }} onTimer={() => { startSession('feeding', 'Pecho'); setFeedingChoice(false); setQuickFeedback('Cronómetro de lactancia iniciado'); }} onDetails={() => { setFeedingChoice(false); router.push('/track/feeding'); }} />
    {careChoice ? <CareQuickChoice kind={careChoice} visible onClose={() => setCareChoice(undefined)} onChoose={chooseCare} /> : null}
    <Text style={styles.date}>{todayLabel.toUpperCase()}</Text><Text style={styles.greeting}>Hola{firstName}. ¿Qué necesitas ahora?</Text>
    <Text style={styles.intro}>Lo esencial está aquí. Registra en segundos y continúa con tu día.</Text>
    <Pressable onPress={() => router.push('/sleep')} style={styles.heroPress}>
      <LinearGradient colors={[colors.sageDeep, '#47776C', '#5B897D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nowCard}><View style={styles.heroGlow} /><View style={styles.heroRing} />
      <View style={styles.nowTop}><View style={styles.moon}><MaterialCommunityIcons name="weather-night" size={20} color="#FFF" /></View><View><Text style={styles.overline}>AHORA · SUEÑO</Text><Text style={styles.heroHint}>Una referencia tranquila, no una regla</Text></View></View>
      <Text style={styles.nowTitle}>{title}</Text><Text style={styles.nowBody}>{body}</Text>
      {rangeLabel ? <View style={styles.predictionFacts}><View><Text style={styles.factValue}>{rangeLabel}</Text><Text style={styles.factLabel}>rango estimado</Text></View><View><Text style={styles.factValue}>{prediction.sampleSize}</Text><Text style={styles.factLabel}>intervalos útiles</Text></View><View><Text style={styles.factValue}>{prediction.patternDays}</Text><Text style={styles.factLabel}>{prediction.patternDays === 1 ? 'día observado' : 'días observados'}</Text></View></View> : null}
      {prediction.explanation[0] ? <Text style={styles.why}>{prediction.explanation[0]}</Text> : null}
      <View style={styles.cardLink}><Text style={styles.cardLinkText}>Ver referencia de sueño</Text><View style={styles.linkArrow}><MaterialCommunityIcons name="arrow-right" size={16} color={colors.sageDeep} /></View></View>
      </LinearGradient>
    </Pressable>
    <View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>Registro rápido</Text><Text style={styles.sectionHint}>Lo que ocurre, sin formularios largos</Text></View><View style={styles.oneTouch}><MaterialCommunityIcons name="gesture-tap" size={14} color={colors.sageDark} /><Text style={styles.oneTouchText}>1 toque</Text></View></View>
    <View style={styles.quickRow}>{frequent.map((item) => <Quick key={item.kind} label={item.label} icon={item.icon} color={item.color} onPress={() => quickAction(item)} />)}</View>
    {quickFeedback ? <View style={styles.quickFeedback}><MaterialCommunityIcons name="check-circle" size={18} color={colors.sageDark} /><Text style={styles.quickFeedbackText}>{quickFeedback}</Text>{lastAddedEventId ? <Pressable accessibilityRole="button" onPress={() => { undoLastAdd(); setQuickFeedback('Registro deshecho'); }}><Text style={styles.quickUndo}>DESHACER</Text></Pressable> : null}</View> : null}
    <Pressable onPress={() => router.push('/today')} style={styles.allButton}><MaterialCommunityIcons name="plus-circle-outline" size={19} color={colors.sageDark} /><Text style={styles.allText}>Ver todos los registros</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>
    <SecondaryLinks router={router} />
  </AppShell>;
}

function Quick({ label, icon, color = '#EEF3F0', onPress }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quick, pressed && styles.quickPressed]}><View style={[styles.quickIcon, { backgroundColor: color }]}><MaterialCommunityIcons name={icon} size={23} color={colors.sageDeep} /></View><Text style={styles.quickText}>{label}</Text><MaterialCommunityIcons name="plus" size={14} color={colors.muted} /></Pressable>;
}

function SecondaryLinks({ router }: { router: ReturnType<typeof useRouter> }) {
  return <View style={styles.secondary}><Text style={styles.sectionTitle}>Cuando lo necesites</Text><View style={styles.linkCard}>
    <LinkRow icon="account-switch-outline" label="Relevo de cuidados" onPress={() => router.push('/handoff')} />
    <LinkRow icon="comment-question-outline" label="Preguntas para consulta" onPress={() => router.push('/consultation-prep')} />
    <LinkRow icon="calendar-blank-outline" label="Agenda e historial" onPress={() => router.push('/calendar')} />
    <LinkRow icon="chart-box-outline" label="Análisis explicable" onPress={() => router.push('/analysis')} />
    <LinkRow icon="bell-outline" label="Avisos y pendientes" onPress={() => router.push('/notifications')} />
    <LinkRow icon="file-document-outline" label="Preparar consulta" onPress={() => router.push('/report')} />
    <LinkRow icon="folder-heart-outline" label="Expediente y documentos" onPress={() => router.push('/documents')} last />
  </View></View>;
}

function LinkRow({ icon, label, onPress, last }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.linkRow, last && { borderBottomWidth: 0 }]}><MaterialCommunityIcons name={icon} size={20} color={colors.sageDark} /><Text style={styles.linkText}>{label}</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>;
}

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  date: { color: colors.sageDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 }, greeting: { color: colors.ink, fontFamily: serif, fontSize: 31, lineHeight: 38, fontWeight: '700', letterSpacing: -.7, maxWidth: 620 },
  intro: { color: colors.muted, fontSize: 12, lineHeight: 18, maxWidth: 520, marginTop: 6 },
  heroPress: { borderRadius: 28, marginTop: 21, ...shadow }, nowCard: { borderRadius: 28, padding: 23, overflow: 'hidden' }, pregnancyCard: { backgroundColor: colors.sageDeep, marginTop: 20 }, heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -80, top: -110, backgroundColor: 'rgba(255,255,255,.09)' }, heroRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -18, bottom: -95, borderWidth: 1, borderColor: 'rgba(255,255,255,.14)' },
  predictionFacts: { flexDirection: 'row', gap: 18, flexWrap: 'wrap', paddingTop: 15, marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.18)' }, factValue: { color: '#FFF', fontSize: 12, fontWeight: '800' }, factLabel: { color: '#CFE0DB', fontSize: 8, marginTop: 2 }, why: { color: '#DCE9E5', fontSize: 8, lineHeight: 13, marginTop: 12 },
  nowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, moon: { width: 38, height: 38, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  overline: { color: '#F1F6F4', fontSize: 8, letterSpacing: 1.2, fontWeight: '900' }, heroHint: { color: '#CFE0DB', fontSize: 7, marginTop: 2 }, nowTitle: { color: '#FFF', fontFamily: serif, fontSize: 23, lineHeight: 29, fontWeight: '700', marginTop: 15 }, nowBody: { color: '#E8F0ED', fontSize: 11, lineHeight: 17, marginTop: 5, maxWidth: 560 },
  cardLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 }, cardLinkText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, linkArrow: { width: 27, height: 27, borderRadius: 11, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 }, sectionTitle: { color: colors.ink, fontFamily: serif, fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 }, sectionHint: { color: colors.muted, fontSize: 8, marginTop: -7 }, oneTouch: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.mint, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6 }, oneTouchText: { color: colors.sageDark, fontSize: 7, fontWeight: '900' }, quickRow: { flexDirection: 'row', gap: 9 },
  quick: { flex: 1, minHeight: 112, backgroundColor: 'rgba(255,253,252,.92)', borderRadius: 23, borderWidth: 1, borderColor: 'rgba(231,226,218,.88)', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 9, ...Platform.select({ web: { transitionDuration: '140ms', boxShadow: webDepth.soft } as any, default: {} }) }, quickPressed: { opacity: .76, transform: [{ scale: .97 }, { translateY: 2 }] }, quickIcon: { width: 48, height: 48, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, quickText: { color: colors.ink, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  quickFeedback: { minHeight: 44, borderRadius: 14, marginTop: 9, paddingHorizontal: 12, backgroundColor: '#E8F3ED', flexDirection: 'row', alignItems: 'center', gap: 8 }, quickFeedbackText: { color: colors.sageDark, fontSize: 9, fontWeight: '800', flex: 1 }, quickUndo: { color: colors.sageDark, fontSize: 8, fontWeight: '900' }, allButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.mint }, allText: { flex: 1, color: colors.sageDark, fontSize: 10, fontWeight: '800' },
  secondary: { paddingBottom: 8 }, linkCard: { backgroundColor: 'rgba(255,253,252,.9)', borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 14, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, linkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, linkText: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: '700' }
});
