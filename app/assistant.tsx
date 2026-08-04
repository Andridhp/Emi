import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { ProfileHeader } from '@/components/ProfileHeader';
import {
  AssistantPurpose, AiAssistantResult, createDemoAssistantResult, FAMILY_INSIGHTS_POLICY_VERSION,
  grantAiAssistantConsent, requestAiAssistant
} from '@/lib/aiAssistant';
import { useAuth } from '@/context/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { colors, shadow, webDepth } from '@/theme';

const purposes: { id: AssistantPurpose; title: string; body: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'recent_summary', title: 'Entender lo reciente', body: 'Resume los últimos 14 días sin completar vacíos.', icon: 'timeline-text-outline' },
  { id: 'consultation_questions', title: 'Preparar una consulta', body: 'Sugiere preguntas neutrales a partir de tus registros.', icon: 'comment-question-outline' },
  { id: 'document_changes', title: 'Revisar documentos', body: 'Compara solo datos que la familia ya confirmó.', icon: 'file-search-outline' }
];

export default function AssistantScreen() {
  const router = useRouter();
  const { demoSession, familyId, user } = useAuth();
  const { profiles, activeProfileId, events, documents, consentPreferences, setConsentPreference } = useAppStore();
  const profile = profiles.find((item) => item.id === activeProfileId) ?? profiles[0];
  const [purpose, setPurpose] = useState<AssistantPurpose>('recent_summary');
  const [requestApproved, setRequestApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<AiAssistantResult>();
  const recentEvents = useMemo(() => {
    const cutoff = Date.now() - 14 * 86400000;
    return events.filter((event) => event.profileId === profile?.id && new Date(event.occurredAt).getTime() >= cutoff);
  }, [events, profile?.id]);
  const confirmedFacts = useMemo(() => documents.filter((document) => document.profileId === profile?.id && document.analysisStatus === 'confirmed')
    .flatMap((document) => document.extractedFields?.filter((field) => field.selected) ?? []), [documents, profile?.id]);

  if (!profile) return <AppShell><ProfileHeader eyebrow="ASISTENTE EMI" /><Text style={styles.title}>Primero crea un perfil</Text><Text style={styles.subtitle}>El asistente nunca mezcla información entre perfiles.</Text></AppShell>;

  const generate = async () => {
    if (!requestApproved) return setMessage('Confirma esta solicitud antes de continuar.');
    setBusy(true); setMessage(''); setResult(undefined);
    try {
      if (demoSession) {
        setResult(createDemoAssistantResult({ profile, events, documents, purpose }));
      } else {
        if (!familyId || !user) throw new Error('session unavailable');
        if (!consentPreferences.aiAssistant) {
          await grantAiAssistantConsent(familyId, user.id, FAMILY_INSIGHTS_POLICY_VERSION);
          setConsentPreference('aiAssistant', true);
        }
        setResult(await requestAiAssistant({ familyId, profileClientId: profile.id, purpose }));
      }
      setRequestApproved(false);
    } catch {
      setMessage('No pudimos preparar el resumen. Tus registros no cambiaron ni se perdió información. Inténtalo de nuevo o abre el análisis local.');
    } finally { setBusy(false); }
  };

  return <AppShell><ProfileHeader eyebrow="ASISTENTE EMI" />
    <View style={styles.hero}>
      <View style={styles.heroIcon}><MaterialCommunityIcons name="creation-outline" size={28} color={colors.sageDeep} /></View>
      <View style={{ flex: 1 }}><Text style={styles.title}>Una mirada breve, con límites claros</Text><Text style={styles.subtitle}>Emi puede ayudarte a ordenar lo que registraste para conversar mejor con un profesional. No diagnostica, prescribe ni decide urgencias.</Text></View>
    </View>

    <Text style={styles.section}>¿QUÉ NECESITAS?</Text>
    <View style={styles.purposeGrid}>{purposes.map((item) => {
      const selected = purpose === item.id;
      return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={item.id} onPress={() => { setPurpose(item.id); setResult(undefined); }} style={[styles.purpose, selected && styles.purposeActive]}>
        <View style={[styles.purposeIcon, selected && styles.purposeIconActive]}><MaterialCommunityIcons name={item.icon} size={20} color={selected ? '#FFF' : colors.sageDark} /></View>
        <Text style={styles.purposeTitle}>{item.title}</Text><Text style={styles.purposeBody}>{item.body}</Text>
        {selected ? <View style={styles.selected}><MaterialCommunityIcons name="check" size={13} color="#FFF" /></View> : null}
      </Pressable>;
    })}</View>

    <Text style={styles.section}>ANTES DE ENVIAR</Text>
    <View style={styles.dataCard}>
      <View style={styles.dataHead}><MaterialCommunityIcons name={demoSession ? 'cellphone-lock' : 'shield-lock-outline'} size={22} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.dataTitle}>{demoSession ? 'Vista local de demostración' : 'Solicitud protegida y mínima'}</Text><Text style={styles.dataBody}>{demoSession ? 'Nada saldrá de este navegador.' : 'La app pedirá al servidor únicamente la información indicada.'}</Text></View></View>
      <DataLine icon="calendar-range" title={`${recentEvents.length} ${recentEvents.length === 1 ? 'registro reciente' : 'registros recientes'}`} body="Periodo fijo de 14 días, máximo 120 registros." />
      <DataLine icon="file-check-outline" title={`${confirmedFacts.length} ${confirmedFacts.length === 1 ? 'dato documental confirmado' : 'datos documentales confirmados'}`} body="Nunca se envían los PDFs, imágenes ni propuestas pendientes." />
      <DataLine icon="account-lock-outline" title={`Solo el perfil ${profile.name}`} body="No se incluyen nombres de cuidadores ni otros perfiles." />
      <View style={styles.notSent}><Text style={styles.notSentTitle}>NO SE ENVÍA</Text><Text style={styles.notSentText}>Contraseñas · otros hijos o embarazos · documentos originales · decisiones del motor de orientación</Text></View>
    </View>

    <View style={styles.approval}>
      <View style={{ flex: 1 }}><Text style={styles.approvalTitle}>Autorizar esta solicitud</Text><Text style={styles.approvalBody}>Entiendo que recibiré una organización de mis datos, no una valoración médica. Este permiso puede retirarse en Privacidad.</Text></View>
      <Switch accessibilityLabel="Autorizar esta solicitud al Asistente Emi" value={requestApproved} onValueChange={setRequestApproved} trackColor={{ false: '#D6DDD9', true: colors.sage }} thumbColor="#FFF" />
    </View>
    {message ? <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={18} color="#8D4747" /><Text style={styles.errorText}>{message}</Text></View> : null}
    <Pressable accessibilityRole="button" disabled={busy || !requestApproved} onPress={() => void generate()} style={[styles.generate, (busy || !requestApproved) && styles.disabled]}>
      {busy ? <ActivityIndicator color="#FFF" /> : <MaterialCommunityIcons name={demoSession ? 'calculator-variant-outline' : 'creation-outline'} size={20} color="#FFF" />}
      <Text style={styles.generateText}>{busy ? 'Organizando registros…' : demoSession ? 'Preparar vista local' : 'Generar resumen protegido'}</Text>
    </Pressable>

    {result ? <View style={styles.result}>
      <View style={styles.resultHead}><View><Text style={styles.resultOverline}>{result.demo ? 'CÁLCULO LOCAL · DEMOSTRACIÓN' : 'INTERPRETACIÓN DE IA'}</Text><Text style={styles.resultTitle}>Resumen para {profile.name}</Text></View><MaterialCommunityIcons name={result.demo ? 'calculator-variant-outline' : 'creation-outline'} size={23} color={colors.sageDark} /></View>
      <Text style={styles.resultSummary}>{result.summary}</Text>
      {result.observations.length ? <ResultSection title="LO QUE ORGANIZÓ" items={result.observations.map((item) => `${item.title}. ${item.statement}${item.evidenceIds.length ? ` · ${item.evidenceIds.length} ${item.evidenceIds.length === 1 ? 'referencia' : 'referencias'}` : ''}`)} /> : null}
      {result.missingData.length ? <ResultSection title="DATOS QUE FALTAN" items={result.missingData} /> : null}
      {result.suggestedQuestions.length ? <ResultSection title="PREGUNTAS PARA EL PROFESIONAL" items={result.suggestedQuestions} /> : null}
      <ResultSection title="LÍMITES" items={result.limitations} />
      <Text style={styles.provenance}>Generado {new Date(result.generatedAt).toLocaleString('es-MX')} · {result.model || 'modelo no informado'} · no se guardó el contenido de la respuesta en el servidor</Text>
    </View> : null}

    <View style={styles.nextActions}>
      <Action icon="chart-box-outline" title="Ver análisis verificable" body="Revisa cálculos locales y la evidencia que los originó." onPress={() => router.push('/analysis')} />
      <Action icon="file-document-outline" title="Crear Resumen para consulta" body="Genera un PDF seleccionando periodo y secciones." onPress={() => router.push('/report')} />
      <Action icon="shield-alert-outline" title="Abrir Orientación segura" body="Las señales de atención viven en un motor separado de la IA." onPress={() => router.push('/guidance')} />
    </View>
  </AppShell>;
}

function DataLine({ icon, title, body }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string }) {
  return <View style={styles.dataLine}><View style={styles.dataLineIcon}><MaterialCommunityIcons name={icon} size={17} color={colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={styles.dataLineTitle}>{title}</Text><Text style={styles.dataLineBody}>{body}</Text></View></View>;
}
function ResultSection({ title, items }: { title: string; items: string[] }) {
  return <View style={styles.resultSection}><Text style={styles.resultLabel}>{title}</Text>{items.map((item, index) => <View style={styles.resultLine} key={`${title}-${index}`}><View style={styles.bullet} /><Text style={styles.resultText}>{item}</Text></View>)}</View>;
}
function Action({ icon, title, body, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string; onPress: () => void }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={styles.action}><View style={styles.actionIcon}><MaterialCommunityIcons name={icon} size={19} color={colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{body}</Text></View><MaterialCommunityIcons name="chevron-right" size={19} color={colors.muted} /></Pressable>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 }, heroIcon: { width: 52, height: 52, borderRadius: 19, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', ...shadow },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5, maxWidth: 640 },
  section: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 23, marginBottom: 8 },
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, purpose: { flex: 1, minWidth: 180, minHeight: 142, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 15, position: 'relative', ...shadow }, purposeActive: { borderColor: colors.sage, backgroundColor: '#F7FBF9', ...({ boxShadow: webDepth.raised } as any) }, purposeIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, purposeIconActive: { backgroundColor: colors.sageDark }, purposeTitle: { color: colors.ink, fontSize: 11, fontWeight: '900', marginTop: 11 }, purposeBody: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 4, paddingRight: 10 }, selected: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.sageDark, alignItems: 'center', justifyContent: 'center' },
  dataCard: { borderRadius: 23, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, ...shadow }, dataHead: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line }, dataTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, dataBody: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 3 }, dataLine: { minHeight: 61, flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }, dataLineIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, dataLineTitle: { color: colors.ink, fontSize: 9, fontWeight: '900' }, dataLineBody: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 2 }, notSent: { backgroundColor: colors.canvas, borderRadius: 14, padding: 11, marginVertical: 13 }, notSentTitle: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: .8 }, notSentText: { color: colors.ink, fontSize: 8, lineHeight: 13, marginTop: 4 },
  approval: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.mint, borderRadius: 18, padding: 14, marginTop: 12 }, approvalTitle: { color: colors.sageDeep, fontSize: 10, fontWeight: '900' }, approvalBody: { color: colors.sageDark, fontSize: 8, lineHeight: 13, marginTop: 3 },
  error: { flexDirection: 'row', gap: 8, backgroundColor: '#FBEAEA', borderRadius: 15, padding: 12, marginTop: 10 }, errorText: { flex: 1, color: '#8D4747', fontSize: 8, lineHeight: 13 }, generate: { minHeight: 54, borderRadius: 18, backgroundColor: colors.sageDeep, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 11, ...shadow }, disabled: { opacity: .42 }, generateText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  result: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 25, padding: 18, marginTop: 20, ...shadow }, resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, resultOverline: { color: colors.sageDark, fontSize: 7, fontWeight: '900', letterSpacing: 1 }, resultTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 4 }, resultSummary: { color: colors.ink, fontSize: 10, lineHeight: 17, marginTop: 14 }, resultSection: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 13, marginTop: 13, gap: 7 }, resultLabel: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: .8, marginBottom: 1 }, resultLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' }, bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.apricot, marginTop: 5 }, resultText: { flex: 1, color: colors.ink, fontSize: 9, lineHeight: 15 }, provenance: { color: colors.muted, fontSize: 7, lineHeight: 12, marginTop: 14 },
  nextActions: { marginTop: 19, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 }, action: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, actionIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, actionTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' }, actionBody: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 3 }
});
