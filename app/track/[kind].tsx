import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { SourcePill } from '@/components/SourcePill';
import { recordFieldsFor, summarizeRecordData } from '@/data/recordFields';
import { useAppStore } from '@/store/useAppStore';
import { appendVoiceTranscript } from '@/lib/voice';
import { colors, shadow, shadowLifted, webDepth } from '@/theme';
import { EventKind, FamilyEvent } from '@/types/domain';

type ActionBehavior = 'timer' | 'instant' | 'form';
type TrackAction = { label: string; detail: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; behavior: ActionBehavior };
type TrackConfig = {
  title: string; intro: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string;
  actions: TrackAction[]; note: string;
};

const configs: Record<string, TrackConfig> = {
  feeding: { title: 'Alimentación', intro: 'Registra pecho con o sin cronómetro. El lado y los demás detalles son opcionales.', icon: 'mother-nurse', color: '#F4D3C1', actions: [{ label: 'Pecho sin tiempo', detail: 'Pecho · sin duración', icon: 'check-circle-outline', behavior: 'instant' }, { label: 'Cronómetro de pecho', detail: 'Pecho', icon: 'timer-outline', behavior: 'timer' }, { label: 'Biberón', detail: 'Cantidad y tipo de leche', icon: 'baby-bottle-outline', behavior: 'form' }, { label: 'Extracción', detail: 'Cantidad obtenida y almacenamiento', icon: 'cup-water', behavior: 'form' }, { label: 'Alimento', detail: 'Alimento y reacción observada', icon: 'food-apple-outline', behavior: 'form' }], note: 'No necesitas indicar pecho izquierdo o derecho. La duración tampoco indica por sí sola cuánto comió el bebé.' },
  sleep: { title: 'Sueño', intro: 'Inicia una siesta, registra un periodo anterior o anota un despertar.', icon: 'weather-night', color: '#DDD9ED', actions: [{ label: 'Iniciar sueño', detail: 'Durmiendo', icon: 'play', behavior: 'timer' }, { label: 'Periodo anterior', detail: 'Sueño · duración y lugar', icon: 'clock-plus-outline', behavior: 'form' }, { label: 'Despertó', detail: 'Despertar registrado', icon: 'weather-sunset-up', behavior: 'instant' }], note: 'Las ventanas de sueño son estimaciones. Prioriza las señales reales del bebé.' },
  diaper: { title: 'Pañales', intro: 'Mojado, evacuación o ambos se guardan con un toque. Si quieres, añade detalles después.', icon: 'water-outline', color: '#DCECE6', actions: [{ label: 'Mojado', detail: 'Mojado', icon: 'water', behavior: 'instant' }, { label: 'Evacuación', detail: 'Evacuación', icon: 'circle-outline', behavior: 'instant' }, { label: 'Ambos', detail: 'Mojado y evacuación', icon: 'check-all', behavior: 'instant' }], note: 'Los detalles de color o consistencia son opcionales. Un registro aislado no determina hidratación.' },
  symptom: { title: 'Síntomas y bienestar', intro: 'Registra hechos observables, intensidad y horario.', icon: 'medical-bag', color: '#F8E4D6', actions: [{ label: 'Temperatura', detail: 'Temperatura y método de medición', icon: 'thermometer', behavior: 'form' }, { label: 'Síntoma', detail: 'Describe lo que observaste', icon: 'plus-circle-outline', behavior: 'form' }, { label: 'Estado de ánimo', detail: 'Conducta observada', icon: 'emoticon-outline', behavior: 'form' }], note: 'Si hay dificultad para respirar, coloración azulada, convulsión o el bebé no responde, busca atención inmediata.' },
  medicine: { title: 'Medicamentos y vacunas', intro: 'Registra únicamente indicaciones confirmadas por un profesional.', icon: 'pill', color: '#E8E1D5', actions: [{ label: 'Medicamento', detail: 'Nombre, dosis indicada y vía', icon: 'pill', behavior: 'form' }, { label: 'Vacuna', detail: 'Nombre de la vacuna', icon: 'needle', behavior: 'form' }, { label: 'Recordatorio', detail: 'Fecha e indicación confirmada', icon: 'bell-plus-outline', behavior: 'form' }], note: 'La app no calcula ni recomienda dosis. Registra únicamente indicaciones profesionales confirmadas.' },
  growth: { title: 'Crecimiento y desarrollo', intro: 'Guarda mediciones, hitos y quién los confirmó.', icon: 'chart-line', color: '#EDF0E8', actions: [{ label: 'Peso', detail: 'Peso y unidad', icon: 'scale-bathroom', behavior: 'form' }, { label: 'Talla', detail: 'Talla y unidad', icon: 'human-male-height', behavior: 'form' }, { label: 'Hito', detail: 'Describe el hito observado', icon: 'star-outline', behavior: 'form' }], note: 'Una medición aislada se interpreta junto con la tendencia y la valoración profesional.' },
  prenatal: { title: 'Seguimiento prenatal', intro: 'Guarda una consulta o medición sin transcribir más de lo necesario.', icon: 'human-pregnant', color: '#EEE8F5', actions: [{ label: 'Ginecología', detail: 'Consulta e indicaciones', icon: 'stethoscope', behavior: 'form' }, { label: 'Materno-fetal', detail: 'Ultrasonido o revisión especializada', icon: 'baby-face-outline', behavior: 'form' }, { label: 'Laboratorio', detail: 'Estudio y resultado documental', icon: 'test-tube', behavior: 'form' }, { label: 'Medición materna', detail: 'Peso, presión o glucosa', icon: 'heart-pulse', behavior: 'form' }, { label: 'Síntoma', detail: 'Describe lo observado', icon: 'medical-bag', behavior: 'form' }], note: 'La app organiza lo registrado. Los resultados, mediciones y cálculos deben revisarse con el equipo tratante.' }
  ,comfort: { title: 'Rutinas y confort', intro: 'Guarda un episodio con un toque. El contexto puede añadirse después.', icon: 'heart-outline', color: '#F3E4DC', actions: [{ label: 'Irritabilidad', detail: 'Irritabilidad observada', icon: 'emoticon-sad-outline', behavior: 'instant' }, { label: 'Gases', detail: 'Gases observados', icon: 'weather-windy', behavior: 'instant' }, { label: 'Regurgitación', detail: 'Regurgitación observada', icon: 'cup-water', behavior: 'instant' }, { label: 'Rutina', detail: 'Actividad cotidiana', icon: 'calendar-heart', behavior: 'form' }], note: 'Registrar qué ocurrió antes y después no demuestra una causa ni que una estrategia sea un tratamiento.' }
};

const kindMap: Record<string, EventKind> = { feeding: 'feeding', sleep: 'sleep', diaper: 'diaper', symptom: 'symptom', medicine: 'medicine', growth: 'growth', prenatal: 'prenatal', comfort: 'comfort' };
const titleMap: Record<string, string> = { feeding: 'Lactancia', sleep: 'Sueño', diaper: 'Pañal', symptom: 'Síntoma', medicine: 'Medicamento', growth: 'Crecimiento', prenatal: 'Seguimiento prenatal', comfort: 'Confort' };

type Draft = { id?: string; title: string; detail: string; date: string; time: string; duration?: string; data: Record<string, string> };
type SpeechResult = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechError = { error?: string };
type SpeechRecognitionConstructor = new () => { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: (event: SpeechResult) => void; onend: () => void; onerror: (event: SpeechError) => void };
const timeValue = (date = new Date()) => date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
const dateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const occurredAt = (day: string, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const date = new Date();
  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(dayOfMonth)) date.setFullYear(year, month - 1, dayOfMonth);
  if (Number.isFinite(hours) && Number.isFinite(minutes)) date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};
const elapsedLabel = (startedAt: string, now: number) => {
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function TrackScreen() {
  const { kind = 'feeding' } = useLocalSearchParams<{ kind: string }>();
  const config = configs[kind] ?? configs.feeding;
  const eventKind = kindMap[kind] ?? 'feeding';
  const router = useRouter();
  const store = useAppStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteId, setDeleteId] = useState<string>();
  const [savedMessage, setSavedMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const timedKind = eventKind === 'feeding' || eventKind === 'sleep' ? eventKind : undefined;
  const session = timedKind ? store.activeSessions[timedKind] : undefined;
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);
  useEffect(() => {
    if (!savedMessage) return;
    const timer = setTimeout(() => setSavedMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [savedMessage]);
  const relevant = useMemo(() => store.events
    .filter((event) => event.kind === eventKind && event.profileId === store.activeProfileId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()), [store.events, eventKind, store.activeProfileId]);

  const act = (action: TrackAction) => {
    if (action.behavior === 'timer' && timedKind) {
      store.startSession(timedKind, action.detail);
      setNow(Date.now());
      setSavedMessage(`${action.label} iniciada`);
      return;
    }
    if (action.behavior === 'instant') {
      store.addQuickEvent(eventKind, eventKind === 'comfort' ? action.label : titleMap[kind] || action.label, action.detail);
      setSavedMessage(`${action.label} registrado · puedes deshacerlo`);
      return;
    }
    const fields = recordFieldsFor(kind, action.label);
    setDraft({ title: action.label, detail: fields.length ? '' : action.detail, date: dateValue(), time: timeValue(), duration: eventKind === 'sleep' ? '' : undefined, data: Object.fromEntries(fields.map((field) => [field.key, ''])) });
  };
  const edit = (event: FamilyEvent) => setDraft({ id: event.id, title: event.title, detail: event.detail, date: dateValue(new Date(event.occurredAt)), time: timeValue(new Date(event.occurredAt)), duration: event.kind === 'sleep' ? String(event.value || '') : undefined, data: Object.fromEntries(Object.entries(event.data ?? {}).map(([key, value]) => [key, String(value)])) });
  const save = () => {
    if (!draft || !draft.title.trim() || (!draft.detail.trim() && !summarizeRecordData(draft.data) && !(eventKind === 'sleep' && Number(draft.duration) > 0))) return;
    const duration = eventKind === 'sleep' ? Number(draft.duration) : undefined;
    if (eventKind === 'sleep' && (!duration || duration <= 0 || duration > 960)) return;
    const structured = Object.fromEntries(Object.entries(draft.data).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));
    const summary = summarizeRecordData(draft.data);
    const detail = [summary, draft.detail.trim()].filter(Boolean).join(' · ');
    const measured = draft.data.temperature || draft.data.measurement || draft.data.amount;
    const measuredValue = measured && Number.isFinite(Number(measured)) ? Number(measured) : undefined;
    const measuredUnit = draft.data.temperatureUnit || draft.data.measurementUnit || draft.data.unit;
    const changes = { title: draft.title.trim(), detail, occurredAt: occurredAt(draft.date, draft.time), value: duration ?? measuredValue, unit: duration ? 'min' : measuredUnit || undefined, data: structured };
    if (draft.id) store.updateEvent(draft.id, changes);
    else store.addQuickEvent(eventKind, changes.title, changes.detail, changes.occurredAt, changes.value, changes.unit, changes.data);
    setDraft(null);
    setSavedMessage(draft.id ? 'Cambios guardados' : 'Registro guardado');
  };
  const remove = (id: string) => { store.deleteEvent(id); setDeleteId(undefined); setSavedMessage('Registro eliminado'); };

  return <AppShell>
    <ProfileHeader eyebrow="SEGUIMIENTO" />
    <Pressable accessibilityRole="button" style={styles.back} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={17} color={colors.sageDark} /><Text style={styles.backText}>Volver al inicio</Text></Pressable>
    <View style={styles.header}><View style={[styles.icon, { backgroundColor: config.color }]}><MaterialCommunityIcons name={config.icon} size={30} color={colors.ink} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{config.title}</Text><Text style={styles.intro}>{config.intro}</Text></View></View>

    {session && timedKind ? <View style={styles.timerCard}>
      <View style={styles.timerTop}><View><Text style={styles.timerOverline}>REGISTRO EN CURSO</Text><Text style={styles.timerLabel}>{session.label}</Text></View><Text accessibilityLabel="Tiempo transcurrido" style={styles.timerValue}>{elapsedLabel(session.startedAt, now)}</Text></View>
      <View style={styles.timerActions}><Pressable accessibilityRole="button" style={styles.stopButton} onPress={() => { store.finishSession(timedKind); setSavedMessage('Registro finalizado y guardado'); }}><MaterialCommunityIcons name="stop" size={17} color="#FFF" /><Text style={styles.stopText}>Finalizar y guardar</Text></Pressable><Pressable accessibilityRole="button" style={styles.cancelButton} onPress={() => store.cancelSession(timedKind)}><Text style={styles.cancelText}>Cancelar</Text></Pressable></View>
    </View> : <><SectionTitle title="¿Qué quieres registrar?" /><View style={styles.actions}>{config.actions.map((action) => <Pressable accessibilityRole="button" accessibilityLabel={action.label} key={action.label} style={styles.action} onPress={() => act(action)}><View style={[styles.actionIcon, { backgroundColor: config.color }]}><MaterialCommunityIcons name={action.icon} size={21} color={colors.ink} /></View><Text style={styles.actionLabel}>{action.label}</Text><MaterialCommunityIcons name={action.behavior === 'timer' ? 'play-circle-outline' : 'plus'} size={19} color={colors.sageDark} /></Pressable>)}</View></>}

    {savedMessage ? <View style={styles.toast}><MaterialCommunityIcons name="check-circle" size={18} color={colors.sageDark} /><Text style={styles.toastText}>{savedMessage}</Text>{store.lastAddedEventId ? <Pressable accessibilityRole="button" onPress={() => { store.undoLastAdd(); setSavedMessage('Registro deshecho'); }}><Text style={styles.undo}>DESHACER</Text></Pressable> : store.lastRemovedEvent ? <Pressable accessibilityRole="button" onPress={() => { store.undoDelete(); setSavedMessage('Registro recuperado'); }}><Text style={styles.undo}>DESHACER</Text></Pressable> : null}</View> : null}
    <View style={[styles.note, kind === 'symptom' && styles.noteUrgent]}><MaterialCommunityIcons name={kind === 'symptom' ? 'alert-circle-outline' : 'information-outline'} size={20} color={kind === 'symptom' ? '#914444' : colors.sageDark} /><View style={{ flex: 1 }}><Text style={[styles.noteText, kind === 'symptom' && styles.noteUrgentText]}>{config.note}</Text>{kind === 'symptom' ? <Pressable accessibilityRole="link" onPress={() => router.push('/guidance')}><Text style={styles.guidanceLink}>Revisar señales de atención →</Text></Pressable> : null}</View></View>
    {kind === 'growth' ? <Pressable accessibilityRole="link" onPress={() => router.push('/growth')} style={{ minHeight: 48, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="chart-line" size={18} color={colors.sageDark} /><Text style={{ flex: 1, color: colors.sageDark, fontSize: 9, fontWeight: '900' }}>Ver historial de crecimiento y desarrollo</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable> : null}
    {kind === 'medicine' ? <Pressable accessibilityRole="link" onPress={() => router.push('/health-history')} style={{ minHeight: 48, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="clipboard-text-clock-outline" size={18} color={colors.sageDark} /><Text style={{ flex: 1, color: colors.sageDark, fontSize: 9, fontWeight: '900' }}>Ver historial de medicamentos y vacunas</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable> : null}
    {kind === 'feeding' ? <Pressable accessibilityRole="link" onPress={() => router.push('/feeding')} style={{ minHeight: 48, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="chart-timeline-variant" size={18} color={colors.sageDark} /><Text style={{ flex: 1, color: colors.sageDark, fontSize: 9, fontWeight: '900' }}>Ver resumen e historial de alimentación</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable> : null}
    {kind === 'diaper' ? <Pressable accessibilityRole="link" onPress={() => router.push('/diapers')} style={{ minHeight: 48, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="chart-timeline-variant" size={18} color={colors.sageDark} /><Text style={{ flex: 1, color: colors.sageDark, fontSize: 9, fontWeight: '900' }}>Ver resumen e historial de pañales</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable> : null}
    {kind === 'symptom' ? <Pressable accessibilityRole="link" onPress={() => router.push('/wellbeing')} style={{ minHeight: 48, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="chart-timeline-variant" size={18} color={colors.sageDark} /><Text style={{ flex: 1, color: colors.sageDark, fontSize: 9, fontWeight: '900' }}>Ver historial de síntomas y bienestar</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable> : null}
    {kind === 'sleep' ? <Pressable accessibilityRole="link" onPress={() => router.push('/sleep')} style={{ minHeight: 48, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="chart-timeline-variant" size={18} color={colors.sageDark} /><Text style={{ flex: 1, color: colors.sageDark, fontSize: 9, fontWeight: '900' }}>Ver motor e historial de sueño</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable> : null}
    {kind === 'comfort' ? <Pressable accessibilityRole="link" onPress={() => router.push('/comfort')} style={{ minHeight: 48, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="chart-timeline-variant" size={18} color={colors.sageDark} /><Text style={{ flex: 1, color: colors.sageDark, fontSize: 9, fontWeight: '900' }}>Ver historial de rutinas y confort</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable> : null}
    <SectionTitle title="Registros recientes" action="Ver calendario" onPress={() => router.push('/calendar')} />
    {relevant.length ? relevant.slice(0, 8).map((event) => <View key={event.id} style={styles.record}><View style={[styles.recordIcon, { backgroundColor: config.color }]}><MaterialCommunityIcons name={config.icon} size={18} color={colors.ink} /></View><View style={{ flex: 1 }}><View style={styles.recordHead}><Text style={styles.recordTitle}>{event.title}</Text><Text style={styles.time}>{new Date(event.occurredAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text></View><Text style={styles.detail}>{event.detail}</Text><SourcePill source={event.source} /><View style={styles.recordActions}>{deleteId === event.id ? <><Text style={styles.confirmText}>¿Eliminar?</Text><Pressable accessibilityRole="button" onPress={() => remove(event.id)}><Text style={styles.deleteConfirm}>Sí, eliminar</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeleteId(undefined)}><Text style={styles.cancelLink}>Cancelar</Text></Pressable></> : <><Pressable accessibilityRole="button" accessibilityLabel={`Editar ${event.title}`} onPress={() => edit(event)} style={styles.smallAction}><MaterialCommunityIcons name="pencil-outline" size={15} color={colors.sageDark} /><Text style={styles.smallActionText}>Editar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${event.title}`} onPress={() => setDeleteId(event.id)} style={styles.smallAction}><MaterialCommunityIcons name="trash-can-outline" size={15} color={colors.muted} /><Text style={styles.smallActionText}>Eliminar</Text></Pressable></>}</View></View></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Aún no hay registros</Text><Text style={styles.emptyBody}>Elige una opción arriba. Siempre podrás corregir la hora o completar los detalles.</Text></View>}

    <EditorModal kind={kind} draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} onSave={save} color={config.color} showDuration={eventKind === 'sleep'} />
  </AppShell>;
}

function EditorModal({ kind, draft, setDraft, onClose, onSave, color, showDuration }: { kind: string; draft: Draft | null; setDraft: Dispatch<SetStateAction<Draft | null>>; onClose: () => void; onSave: () => void; color: string; showDuration: boolean }) {
  const { consentPreferences, setConsentPreference } = useAppStore();
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [voiceConsentVisible, setVoiceConsentVisible] = useState(false);
  const [showMore, setShowMore] = useState(false);
  useEffect(() => () => recognitionRef.current?.stop(), []);
  useEffect(() => setShowMore(false), [draft?.id, draft?.title]);
  if (!draft) return null;
  const speechWindow = Platform.OS === 'web' && typeof window !== 'undefined' ? window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor } : undefined;
  const Recognition = speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition;
  const beginRecognition = () => {
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'es-MX'; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript || ''; setDraft((current) => current ? { ...current, detail: appendVoiceTranscript(current.detail, transcript) } : current); setVoiceMessage('Texto agregado al borrador. Revísalo antes de guardar.'); };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      const messages: Record<string, string> = { 'not-allowed': 'El micrófono no tiene permiso. Actívalo en la configuración del navegador o escribe la nota.', 'audio-capture': 'No encontramos un micrófono disponible. Puedes escribir la nota.', 'no-speech': 'No se detectó voz. Acércate al micrófono e inténtalo otra vez.', network: 'El servicio de dictado no respondió. Puedes intentarlo de nuevo o escribir.' };
      setVoiceMessage(messages[event.error || ''] || 'No pudimos convertir el audio en texto. Puedes intentarlo otra vez o escribir la nota.');
    };
    recognitionRef.current = recognition;
    try { setListening(true); setVoiceMessage('Escuchando… habla con naturalidad.'); recognition.start(); }
    catch { setListening(false); setVoiceMessage('El micrófono ya estaba iniciándose. Espera un momento o escribe la nota.'); }
  };
  const startVoice = () => {
    if (!Recognition) { setShowMore(true); setVoiceMessage('El dictado no está disponible en este navegador. Abrimos la nota adicional para que puedas escribirla.'); return; }
    if (!consentPreferences.voice) { setVoiceConsentVisible(true); return; }
    beginRecognition();
  };
  const fields = recordFieldsFor(kind, draft.title);
  const essentialFields = fields.filter((field) => !field.optional);
  const optionalFields = fields.filter((field) => field.optional);
  const durationValid = !showDuration || (Number(draft.duration) > 0 && Number(draft.duration) <= 960);
  const requiredFieldsValid = essentialFields.every((field) => draft.data[field.key]?.trim());
  const hasContent = Boolean(draft.detail.trim() || summarizeRecordData(draft.data) || (showDuration && durationValid));
  const valid = Boolean(draft.title.trim() && hasContent && draft.date.trim() && draft.time.trim() && durationValid && requiredFieldsValid);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={styles.modalHead}><View style={[styles.modalIcon, { backgroundColor: color }]}><MaterialCommunityIcons name={draft.id ? 'pencil-outline' : 'plus'} size={20} color={colors.ink} /></View><View style={{ flex: 1 }}><Text style={styles.modalTitle}>{draft.id ? 'Editar registro' : 'Completar registro'}</Text><Text style={styles.modalSub}>Puedes corregir estos datos más tarde.</Text></View><Pressable accessibilityLabel="Cerrar" onPress={onClose}><MaterialCommunityIcons name="close" size={22} color={colors.muted} /></Pressable></View>
    <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Detener dictado' : Recognition ? 'Dictar una nota' : 'Dictado no disponible'} onPress={() => listening ? recognitionRef.current?.stop() : startVoice()} style={[styles.voiceButton, listening && styles.voiceListening]}><View style={styles.voiceIcon}><MaterialCommunityIcons name={listening ? 'stop' : Recognition ? 'microphone-outline' : 'keyboard-outline'} size={18} color={listening ? '#FFF' : colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={[styles.voiceTitle, listening && { color: '#FFF' }]}>{listening ? 'Detener dictado' : Recognition ? 'Dictar una nota' : 'Escribir nota'}</Text><Text style={[styles.voiceBody, listening && { color: '#F1E6E4' }]}>{Recognition ? 'Se añadirá como texto editable.' : 'El dictado no está disponible en este navegador.'}</Text></View></Pressable>
    {voiceConsentVisible ? <View style={styles.voiceConsent}><View style={styles.consentTitleRow}><MaterialCommunityIcons name="shield-check-outline" size={19} color={colors.sageDark} /><Text style={styles.consentTitle}>Autorizar dictado</Text></View><Text style={styles.consentBody}>Tu navegador o sistema puede procesar el audio. Emi conservará únicamente el texto que revises y guardes.</Text><View style={styles.consentActions}><Pressable accessibilityRole="button" onPress={() => setVoiceConsentVisible(false)} style={styles.consentCancel}><Text style={styles.consentCancelText}>Ahora no</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setConsentPreference('voice', true); setVoiceConsentVisible(false); beginRecognition(); }} style={styles.consentAllow}><MaterialCommunityIcons name="microphone" size={16} color="#FFF" /><Text style={styles.consentAllowText}>Autorizar y dictar</Text></Pressable></View></View> : null}
    {voiceMessage ? <Text accessibilityLiveRegion="polite" style={styles.voiceMessage}>{voiceMessage}</Text> : null}
    {essentialFields.length ? <View style={styles.structuredFields}>{essentialFields.map((field) => <View key={field.key}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={draft.data[field.key] || ''} onChangeText={(value) => setDraft({ ...draft, data: { ...draft.data, [field.key]: value } })} placeholder={field.placeholder} keyboardType={field.keyboard === 'numeric' ? 'decimal-pad' : 'default'} style={styles.input} /></View>)}</View> : fields.length === 0 && !showDuration ? <><Text style={styles.fieldLabel}>¿Qué ocurrió?</Text><TextInput accessibilityLabel="Detalles del registro" value={draft.detail} onChangeText={(detail) => setDraft({ ...draft, detail })} placeholder="Una frase es suficiente" multiline style={[styles.input, styles.detailInput]} /></> : null}
    {showDuration ? <><Text style={styles.fieldLabel}>Duración total · minutos</Text><TextInput accessibilityLabel="Duración del sueño en minutos" value={draft.duration} onChangeText={(duration) => setDraft({ ...draft, duration })} placeholder="Ej. 45" keyboardType="number-pad" style={styles.input} /></> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showMore }} onPress={() => setShowMore((value) => !value)} style={styles.moreButton}><Text style={styles.moreText}>{showMore ? 'Ocultar detalles' : 'Agregar detalles · opcional'}</Text><MaterialCommunityIcons name={showMore ? 'chevron-up' : 'chevron-down'} size={19} color={colors.sageDark} /></Pressable>
    {showMore ? <View style={styles.advanced}><Text style={styles.fieldLabel}>Tipo de registro</Text><TextInput accessibilityLabel="Tipo de registro" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} style={styles.input} />{optionalFields.map((field) => <View key={field.key}><Text style={styles.fieldLabel}>{field.label} · opcional</Text><TextInput accessibilityLabel={field.label} value={draft.data[field.key] || ''} onChangeText={(value) => setDraft({ ...draft, data: { ...draft.data, [field.key]: value } })} placeholder={field.placeholder} keyboardType={field.keyboard === 'numeric' ? 'decimal-pad' : 'default'} style={styles.input} /></View>)}{fields.length ? <><Text style={styles.fieldLabel}>Nota adicional · opcional</Text><TextInput accessibilityLabel="Nota adicional" value={draft.detail} onChangeText={(detail) => setDraft({ ...draft, detail })} placeholder="Algo que quieras recordar" multiline style={[styles.input, styles.detailInput]} /></> : null}<Text style={styles.fieldLabel}>Fecha</Text><TextInput accessibilityLabel="Fecha del registro" value={draft.date} onChangeText={(date) => setDraft({ ...draft, date })} placeholder="2026-07-15" keyboardType="numbers-and-punctuation" style={styles.input} /><Text style={styles.fieldLabel}>Hora</Text><TextInput accessibilityLabel="Hora del registro" value={draft.time} onChangeText={(time) => setDraft({ ...draft, time })} placeholder="14:30" keyboardType="numbers-and-punctuation" style={styles.input} /></View> : null}
    <Pressable accessibilityRole="button" style={[styles.saveButton, !valid && { opacity: .45 }]} disabled={!valid} onPress={onSave}><Text style={styles.saveText}>Guardar registro</Text><MaterialCommunityIcons name="check" size={18} color="#FFF" /></Pressable>
  </ScrollView></View></View></Modal>;
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginBottom: 14 }, backText: { color: colors.sageDark, fontSize: 10, fontWeight: '700' }, header: { flexDirection: 'row', alignItems: 'center', gap: 15 }, icon: { width: 64, height: 64, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,.76)', alignItems: 'center', justifyContent: 'center', ...shadowLifted, ...Platform.select({ web: { boxShadow: webDepth.raised } as any }) }, title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -.6 }, intro: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4, maxWidth: 500 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, action: { minHeight: 74, width: '31.8%', minWidth: 180, flexGrow: 1, backgroundColor: 'rgba(255,253,252,.92)', borderWidth: 1, borderColor: 'rgba(231,226,218,.88)', borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, ...shadow, ...Platform.select({ web: { boxShadow: webDepth.soft, transitionDuration: '150ms' } as any }) }, actionIcon: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, actionLabel: { color: colors.ink, fontSize: 10, fontWeight: '800', flex: 1 },
  timerCard: { backgroundColor: colors.sageDark, borderRadius: 24, padding: 20, marginTop: 20, ...shadow }, timerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, timerOverline: { color: '#DDEBE7', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, timerLabel: { color: '#FFF', fontSize: 17, fontWeight: '800', marginTop: 5 }, timerValue: { color: '#FFF', fontSize: 31, fontWeight: '300', fontVariant: ['tabular-nums'] }, timerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }, stopButton: { flex: 1, minHeight: 46, borderRadius: 15, backgroundColor: '#284D46', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, stopText: { color: '#FFF', fontSize: 10, fontWeight: '800' }, cancelButton: { padding: 12 }, cancelText: { color: '#E3EFEC', fontSize: 9, fontWeight: '700' },
  toast: { minHeight: 44, borderRadius: 14, marginTop: 12, paddingHorizontal: 12, backgroundColor: '#E8F3ED', flexDirection: 'row', alignItems: 'center', gap: 8 }, toastText: { color: colors.sageDark, fontSize: 9, fontWeight: '700', flex: 1 }, undo: { color: colors.sageDark, fontSize: 8, fontWeight: '900', letterSpacing: .4 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.mint, borderRadius: 16, padding: 13, marginTop: 14 }, noteText: { color: colors.sageDark, fontSize: 9, lineHeight: 14, flex: 1 }, noteUrgent: { backgroundColor: '#FBE8E7' }, noteUrgentText: { color: '#834242' },
  record: { backgroundColor: 'rgba(255,253,252,.92)', borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 11, marginBottom: 9, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, recordIcon: { width: 40, height: 40, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, recordHead: { flexDirection: 'row', justifyContent: 'space-between' }, recordTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, time: { color: colors.muted, fontSize: 9 }, detail: { color: colors.muted, fontSize: 10, marginVertical: 4 }, recordActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }, smallAction: { flexDirection: 'row', alignItems: 'center', gap: 4 }, smallActionText: { color: colors.muted, fontSize: 8, fontWeight: '700' }, confirmText: { color: colors.ink, fontSize: 8, fontWeight: '700' }, deleteConfirm: { color: colors.red, fontSize: 8, fontWeight: '800' }, cancelLink: { color: colors.sageDark, fontSize: 8, fontWeight: '800' }, empty: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 24, alignItems: 'center', ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, emptyTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, emptyBody: { color: colors.muted, fontSize: 9, textAlign: 'center', lineHeight: 14, marginTop: 4, maxWidth: 310 },
  guidanceLink: { color: '#813A3A', fontSize: 9, fontWeight: '900', marginTop: 7, textDecorationLine: 'underline' }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(28,43,40,.42)', justifyContent: 'center', alignItems: 'center', padding: 20 }, modalCard: { width: '100%', maxWidth: 470, maxHeight: '94%', backgroundColor: colors.canvas, borderRadius: 28, padding: 20, ...shadowLifted, ...Platform.select({ web: { boxShadow: webDepth.raised } as any }) }, modalHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }, modalIcon: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, modalTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' }, modalSub: { color: colors.muted, fontSize: 8, marginTop: 2 }, voiceButton: { minHeight: 58, borderRadius: 18, backgroundColor: colors.mint, borderWidth: 1, borderColor: '#CFE0D8', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, voiceListening: { backgroundColor: '#985B57', borderColor: '#985B57' }, voiceIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.72)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, voiceTitle: { color: colors.sageDark, fontSize: 10, fontWeight: '900' }, voiceBody: { color: colors.muted, fontSize: 7, lineHeight: 11, marginTop: 2 }, voiceMessage: { color: colors.sageDark, fontSize: 8, lineHeight: 12, marginTop: 7 }, voiceConsent: { backgroundColor: '#FFFDFC', borderWidth: 1, borderColor: '#D7E3DE', borderRadius: 17, padding: 12, marginTop: 9, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, consentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, consentTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' }, consentBody: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 6 }, consentActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 7, marginTop: 10 }, consentCancel: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 11 }, consentCancelText: { color: colors.muted, fontSize: 8, fontWeight: '800' }, consentAllow: { minHeight: 38, borderRadius: 12, backgroundColor: colors.sageDark, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 }, consentAllowText: { color: '#FFF', fontSize: 8, fontWeight: '900' }, structuredFields: { gap: 1 }, fieldLabel: { color: colors.ink, fontSize: 9, fontWeight: '800', marginTop: 12, marginBottom: 6 }, input: { minHeight: 49, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, color: colors.ink, fontSize: 11, paddingHorizontal: 13, ...Platform.select({ web: { boxShadow: 'inset 0 1px 2px rgba(41,65,60,.035)' } as any }) }, detailInput: { minHeight: 70, paddingTop: 12, textAlignVertical: 'top' }, moreButton: { minHeight: 46, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, moreText: { color: colors.sageDark, fontSize: 9, fontWeight: '900' }, advanced: { paddingTop: 1 }, saveButton: { height: 52, backgroundColor: colors.sageDark, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, ...shadow }, saveText: { color: '#FFF', fontSize: 10, fontWeight: '800' }
});
