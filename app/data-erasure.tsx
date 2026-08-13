import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { ProfileHeader } from '@/components/ProfileHeader';
import { useAuth } from '@/context/AuthContext';
import { canCancelErasure, cancelDataErasureRequest, confirmationPhraseFor, DataErasureRequest, listDataErasureRequests, reauthenticateAndRequestAccountErasure } from '@/lib/dataErasure';
import { colors, shadow } from '@/theme';
import { useAppStore } from '@/store/useAppStore';

const phrase = confirmationPhraseFor('account');

export default function DataErasureScreen() {
  const router = useRouter();
  const { demoSession, familyId, user, signOut } = useAuth();
  const clearLocalWorkspace = useAppStore((state) => state.clearLocalWorkspace);
  const [requests, setRequests] = useState<DataErasureRequest[]>([]);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const activeRequest = useMemo(() => requests.find((request) => request.status === 'pending' || request.status === 'processing'), [requests]);

  useEffect(() => {
    if (demoSession || !familyId) return;
    let active = true;
    listDataErasureRequests(familyId).then((rows) => { if (active) setRequests(rows); }).catch(() => { if (active) setError('No pudimos consultar solicitudes anteriores.'); });
    return () => { active = false; };
  }, [demoSession, familyId]);

  const submit = async () => {
    setMessage(''); setError('');
    if (confirmation !== phrase) return setError(`Escribe exactamente “${phrase}”.`);
    setBusy(true);
    try {
      if (demoSession) {
        clearLocalWorkspace(); await signOut(); router.replace('/'); return;
      }
      const request = familyId && user?.email ? await reauthenticateAndRequestAccountErasure({ familyId, email: user.email, password, confirmationPhrase: confirmation }) : undefined;
      if (!request) throw new Error('session_unavailable');
      setRequests((current) => [request, ...current]); setPassword(''); setConfirmation('');
      setMessage('Solicitud registrada. Puedes cancelarla hasta que comience el procesamiento.');
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      setError(code === 'reauthentication_failed' ? 'La contraseña no coincide. No se creó ninguna solicitud.' : 'No pudimos crear la solicitud. Tu cuenta y tus datos permanecen sin cambios.');
    } finally { setBusy(false); }
  };

  const cancel = async (request: DataErasureRequest) => {
    setMessage(''); setError(''); setBusy(true);
    try {
      if (!demoSession) await cancelDataErasureRequest(request.requestId);
      setRequests((current) => current.map((item) => item.requestId === request.requestId ? { ...item, status: 'cancelled', cancelledAt: new Date().toISOString() } : item));
      setMessage(demoSession ? 'Simulación cancelada.' : 'Solicitud cancelada. La eliminación ya no se ejecutará.');
    } catch { setError('No pudimos cancelar la solicitud. Revisa la conexión y su estado antes de intentarlo nuevamente.'); }
    finally { setBusy(false); }
  };

  return <AppShell><ProfileHeader eyebrow="PRIVACIDAD Y DATOS" />
    <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={17} color={colors.sageDark} /><Text style={styles.backText}>Volver a Privacidad</Text></Pressable>
    <View style={styles.hero}><View style={styles.heroIcon}><MaterialCommunityIcons name="shield-remove-outline" size={29} color="#8D4747" /></View><View style={{ flex: 1 }}><Text style={styles.title}>{demoSession ? 'Eliminar datos de este dispositivo' : 'Eliminar cuenta y espacio familiar'}</Text><Text style={styles.subtitle}>{demoSession ? 'La eliminación local es inmediata y no puede deshacerse. Crea un respaldo antes si deseas conservar algo.' : 'Este recorrido está diseñado para evitar borrados accidentales y darte tiempo para cambiar de decisión.'}</Text></View></View>

    {demoSession ? <View style={styles.demo}><MaterialCommunityIcons name="phone-alert" size={20} color="#806225" /><Text style={styles.demoText}>No existe una copia en nube. Al confirmar se borrarán realmente los perfiles, registros y metadatos locales de Emi.</Text></View> : null}

    <Text style={styles.section}>QUÉ SUCEDERÁ</Text>
    <View style={styles.card}>
      <Step icon="download-outline" number="1" title="Conserva una copia" body="Antes de solicitarlo, vuelve a Privacidad y exporta los datos que quieras guardar." />
      {demoSession ? <Step icon="cellphone-remove" number="2" title="Se borrará inmediatamente" body="Incluye perfiles, registros, preguntas, permisos y referencias de documentos guardadas por Emi en este dispositivo." last /> : <><Step icon="calendar-clock-outline" number="2" title="Tendrás siete días" body="Durante el periodo de recuperación puedes cancelar desde esta misma pantalla." /><Step icon="folder-remove-outline" number="3" title="Se elimina el espacio familiar" body="Incluye perfiles, registros, documentos, reportes, permisos y vínculos compartidos." /><Step icon="account-remove-outline" number="4" title="Después se elimina la cuenta" body="Un trabajador privado borra los archivos primero y reintenta la eliminación de identidad si el proveedor está temporalmente indisponible." last /></>}
    </View>
    <View style={styles.warning}><MaterialCommunityIcons name={demoSession ? 'backup-restore' : 'account-group-outline'} size={20} color="#8D4747" /><Text style={styles.warningText}>{demoSession ? 'El respaldo JSON es la única forma de recuperar posteriormente los registros estructurados. No incluye los PDFs o imágenes originales.' : 'En esta versión, la cuenta administradora es propietaria del espacio. Eliminarla también elimina los datos compartidos con los demás cuidadores. Avísales y exporta una copia antes de continuar.'}</Text></View>

    {activeRequest ? <>
      <Text style={styles.section}>SOLICITUD ACTIVA</Text>
      <View style={styles.pending}><View style={styles.pendingTop}><View style={styles.pendingIcon}><MaterialCommunityIcons name={activeRequest.status === 'processing' ? 'progress-clock' : 'calendar-alert'} size={22} color="#8D4747" /></View><View style={{ flex: 1 }}><Text style={styles.pendingTitle}>{activeRequest.status === 'processing' ? 'Eliminación en procesamiento' : 'Eliminación programada'}</Text><Text style={styles.pendingDate}>{activeRequest.status === 'processing' ? 'Ya comenzó la limpieza protegida.' : `Programada para ${new Date(activeRequest.executeAfter).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}`}</Text></View></View>
        {canCancelErasure(activeRequest) ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void cancel(activeRequest)} style={styles.cancel}><Text style={styles.cancelText}>{busy ? 'Cancelando…' : 'Cancelar solicitud'}</Text></Pressable> : <Text style={styles.processing}>Cuando el procesamiento comienza ya no es seguro interrumpirlo.</Text>}
      </View>
    </> : <>
      <Text style={styles.section}>CONFIRMACIÓN</Text>
      <View style={styles.form}>
        {!demoSession ? <><Text style={styles.label}>Contraseña actual</Text><TextInput accessibilityLabel="Contraseña actual" secureTextEntry value={password} onChangeText={setPassword} autoComplete="current-password" placeholder="Vuelve a autenticarte" placeholderTextColor="#A7B0AD" style={styles.input} /><Text style={styles.help}>La contraseña se envía directamente a Supabase Auth y Emi no la almacena.</Text></> : null}
        <Text style={styles.label}>Escribe la frase de confirmación</Text><View style={styles.phrase}><Text style={styles.phraseText}>{phrase}</Text></View><TextInput accessibilityLabel="Frase de confirmación" autoCapitalize="characters" value={confirmation} onChangeText={setConfirmation} placeholder={phrase} placeholderTextColor="#A7B0AD" style={styles.input} />
        <Pressable accessibilityRole="button" disabled={busy || confirmation !== phrase || (!demoSession && !password)} onPress={() => void submit()} style={[styles.submit, (busy || confirmation !== phrase || (!demoSession && !password)) && styles.disabled]}>{busy ? <ActivityIndicator color="#FFF" /> : <MaterialCommunityIcons name={demoSession ? 'delete-forever-outline' : 'calendar-remove-outline'} size={19} color="#FFF" />}<Text style={styles.submitText}>{busy ? 'Procesando…' : demoSession ? 'Eliminar datos locales' : 'Programar eliminación'}</Text></Pressable>
      </View>
    </>}
    {message ? <View style={styles.success}><MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.sageDark} /><Text style={styles.successText}>{message}</Text></View> : null}
    {error ? <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={18} color="#8D4747" /><Text style={styles.errorText}>{error}</Text></View> : null}
    <Text style={styles.foot}>La bitácora final conserva únicamente huellas irreversibles para demostrar que el proceso terminó; no conserva nombres, correos ni contenido clínico.</Text>
  </AppShell>;
}

function Step({ icon, number, title, body, last }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; number: string; title: string; body: string; last?: boolean }) {
  return <View style={[styles.step, last && { borderBottomWidth: 0 }]}><View style={styles.stepIcon}><MaterialCommunityIcons name={icon} size={19} color={colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={styles.stepEyebrow}>PASO {number}</Text><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View></View>;
}

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 16 }, backText: { color: colors.sageDark, fontSize: 9, fontWeight: '900' },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' }, heroIcon: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#FBEAEA', alignItems: 'center', justifyContent: 'center', ...shadow }, title: { color: colors.ink, fontFamily: serif, fontSize: 28, lineHeight: 34, fontWeight: '700' }, subtitle: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5, maxWidth: 610 },
  demo: { flexDirection: 'row', gap: 9, backgroundColor: '#FFF4DD', borderRadius: 17, padding: 13, marginTop: 17 }, demoText: { flex: 1, color: '#806225', fontSize: 9, lineHeight: 14 }, section: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 22, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 16, ...shadow }, step: { minHeight: 85, flexDirection: 'row', gap: 11, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 12 }, stepIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, stepEyebrow: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: .7 }, stepTitle: { color: colors.ink, fontSize: 10, fontWeight: '900', marginTop: 2 }, stepBody: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 3 },
  warning: { flexDirection: 'row', gap: 9, backgroundColor: '#FBEAEA', borderWidth: 1, borderColor: '#EFCFCF', borderRadius: 17, padding: 13, marginTop: 12 }, warningText: { flex: 1, color: '#794343', fontSize: 9, lineHeight: 14 },
  form: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 22, padding: 17, ...shadow }, label: { color: colors.ink, fontSize: 9, fontWeight: '900', marginTop: 8, marginBottom: 6 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: '#FCFAF6', paddingHorizontal: 13, color: colors.ink, fontSize: 10 }, help: { color: colors.muted, fontSize: 7, lineHeight: 12, marginTop: 5, marginBottom: 11 }, phrase: { alignSelf: 'flex-start', borderRadius: 10, backgroundColor: '#FBEAEA', paddingHorizontal: 10, paddingVertical: 7, marginBottom: 7 }, phraseText: { color: '#8D4747', fontSize: 9, fontWeight: '900', letterSpacing: .5 }, submit: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 17, backgroundColor: '#8D4747', marginTop: 15 }, submitText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, disabled: { opacity: .4 },
  pending: { borderWidth: 1, borderColor: '#EFCFCF', backgroundColor: '#FFF8F6', borderRadius: 22, padding: 16, ...shadow }, pendingTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, pendingIcon: { width: 43, height: 43, borderRadius: 16, backgroundColor: '#FBEAEA', alignItems: 'center', justifyContent: 'center' }, pendingTitle: { color: '#7E4141', fontSize: 12, fontWeight: '900' }, pendingDate: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 3 }, cancel: { minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: '#D9AFAF', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, cancelText: { color: '#8D4747', fontSize: 9, fontWeight: '900' }, processing: { color: '#8D4747', fontSize: 8, lineHeight: 13, marginTop: 12 },
  success: { flexDirection: 'row', gap: 8, backgroundColor: colors.mint, borderRadius: 15, padding: 12, marginTop: 12 }, successText: { flex: 1, color: colors.sageDark, fontSize: 9, lineHeight: 14 }, error: { flexDirection: 'row', gap: 8, backgroundColor: '#FBEAEA', borderRadius: 15, padding: 12, marginTop: 12 }, errorText: { flex: 1, color: '#8D4747', fontSize: 9, lineHeight: 14 }, foot: { color: colors.muted, fontSize: 7, lineHeight: 12, textAlign: 'center', marginTop: 16 }
});
