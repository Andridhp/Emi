import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import { ProfileHeader } from '@/components/ProfileHeader';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { ConsentPurpose } from '@/types/domain';
import { createPortableFamilyExport, downloadPortableFamilyExport, parsePortableFamilyExport, PortableFamilyExport, serializePortableFamilyExport } from '@/lib/dataExport';
import { useAuth } from '@/context/AuthContext';
import { DOCUMENT_ANALYSIS_POLICY_VERSION, grantDocumentAnalysisConsent, revokeDocumentAnalysisConsent } from '@/lib/cloudDocuments';
import { FAMILY_INSIGHTS_POLICY_VERSION, grantAiAssistantConsent, revokeAiAssistantConsent } from '@/lib/aiAssistant';

const purposes: { id: ConsentPurpose; title: string; body: string; required?: boolean }[] = [
  { id: 'localStorage', title: 'Guardar datos en este dispositivo', body: 'Necesario para conservar perfiles y registros en el prototipo local.', required: true },
  { id: 'documentAnalysis', title: 'Análisis de documentos', body: 'Autoriza una solicitud protegida de comprobación, OCR y extracción. Siempre revisarás las propuestas antes de incorporarlas.' },
  { id: 'aiAssistant', title: 'Asistente Emi', body: 'Autoriza resúmenes bajo petición con registros recientes y datos documentales ya confirmados. No se envían archivos originales ni se decide atención médica.' },
  { id: 'voice', title: 'Registro por voz', body: 'Autoriza el dictado del sistema o navegador. El proveedor del dispositivo puede procesar audio; Emi conserva únicamente el texto que confirmes.' },
  { id: 'productAnalytics', title: 'Ayudar a mejorar Emi', body: 'Métricas de uso sin nombres, texto clínico, documentos ni identificadores directos.' }
];

export default function PrivacyScreen() {
  const router = useRouter();
  const [pendingBackup, setPendingBackup] = useState<PortableFamilyExport>();
  const { signOut, demoSession, user, familyId, syncStatus, pendingChanges, conflictCount, syncNow } = useAuth();
  const { consentPreferences, setConsentPreference, profiles, caregivers, prenatalRecords, birthRecords, postpartumRecords, events, documents, consultationQuestions, activeProfileId, lastConsultationDates, restoreLocalBackup } = useAppStore();
  const exportData = async () => {
    const data = createPortableFamilyExport({ profiles, caregivers, prenatalRecords, birthRecords, postpartumRecords, events, documents, consultationQuestions, activeProfileId, lastConsultationDates, consentPreferences });
    if (downloadPortableFamilyExport(data)) Alert.alert('Copia descargada', 'El archivo JSON contiene información sensible. Guárdalo en un lugar protegido y elimínalo cuando ya no lo necesites.');
    else try {
      const file = new ExpoFile(Paths.cache, `emi-respaldo-${data.exportedAt.slice(0, 10)}.json`);
      file.write(serializePortableFamilyExport(data));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Guardar respaldo de Emi' });
      else Alert.alert('Respaldo preparado', 'Este dispositivo no ofrece una aplicación para guardarlo o compartirlo.');
    } catch { Alert.alert('No se pudo crear el respaldo', 'Tus datos no se modificaron. Inténtalo nuevamente.'); }
  };
  const chooseBackup = async () => {
    if (!demoSession) { Alert.alert('Restauración local', 'Para proteger la información sincronizada, la restauración completa está disponible únicamente en el modo local gratuito.'); return; }
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json', 'text/plain'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 10_000_000) { Alert.alert('Archivo demasiado grande', 'El respaldo debe pesar menos de 10 MB. Los PDFs originales no forman parte de la copia.'); return; }
    try {
      const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new ExpoFile(asset.uri).text();
      setPendingBackup(parsePortableFamilyExport(text));
    } catch (error) { Alert.alert('No se puede restaurar', error instanceof Error ? error.message : 'El archivo no es un respaldo compatible de Emi.'); }
  };
  const restoreBackup = () => {
    if (!pendingBackup || !demoSession) return;
    restoreLocalBackup(pendingBackup); setPendingBackup(undefined);
    Alert.alert('Respaldo restaurado', 'Los perfiles y registros locales fueron reemplazados por la copia elegida. Los permisos opcionales quedaron desactivados.');
  };
  const changeConsent = async (purpose: ConsentPurpose, value: boolean) => {
    if (!['documentAnalysis', 'aiAssistant'].includes(purpose) || demoSession || !familyId || !user) { setConsentPreference(purpose, value); return; }
    try {
      if (purpose === 'documentAnalysis') {
        if (value) await grantDocumentAnalysisConsent(familyId, user.id, DOCUMENT_ANALYSIS_POLICY_VERSION);
        else await revokeDocumentAnalysisConsent(familyId, user.id);
      } else {
        if (value) await grantAiAssistantConsent(familyId, user.id, FAMILY_INSIGHTS_POLICY_VERSION);
        else await revokeAiAssistantConsent(familyId, user.id);
      }
      setConsentPreference(purpose, value);
    } catch { Alert.alert('No se cambió el consentimiento', 'La preferencia anterior permanece activa. Revisa la conexión e inténtalo nuevamente.'); }
  };
  return <AppShell><ProfileHeader eyebrow="SEGURIDAD" />
    <Text style={styles.title}>Privacidad y control de datos</Text><Text style={styles.subtitle}>La familia decide qué funciones utilizar. Un consentimiento puede retirarse sin borrar el historial ya confirmado.</Text>
    <View style={[styles.mode, demoSession ? styles.modeDemo : styles.modeCloud]}><MaterialCommunityIcons name={demoSession ? 'cellphone-lock' : syncStatus === 'error' || syncStatus === 'conflict' ? 'cloud-alert-outline' : 'cloud-lock-outline'} size={23} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.modeTitle}>{demoSession ? 'Modo local gratuito' : syncStatus === 'conflict' ? `${conflictCount} ${conflictCount === 1 ? 'cambio necesita' : 'cambios necesitan'} revisión` : syncStatus === 'loading' ? `Protegiendo${pendingChanges ? ` ${pendingChanges}` : ''} ${pendingChanges === 1 ? 'cambio' : 'cambios'}…` : syncStatus === 'error' ? `${pendingChanges || ''} ${pendingChanges === 1 ? 'cambio pendiente' : 'cambios pendientes'}`.trim() : 'Cuenta protegida conectada'}</Text><Text style={styles.modeBody}>{demoSession ? 'Los datos permanecen en este dispositivo y no generan consumo de nube. Crea respaldos manuales para poder recuperarlos.' : syncStatus === 'conflict' ? 'Otro cuidador modificó la misma información. Emi no sobrescribirá ninguna versión sin tu elección.' : syncStatus === 'error' ? 'Tus cambios permanecen en este dispositivo. Emi reintentará al recuperar conexión o al volver a abrir la app.' : pendingChanges ? 'La bandeja de salida conserva cada cambio hasta que la nube confirme la sincronización.' : 'La sesión es persistente y el backend limita el acceso por familia y perfil.'}</Text></View></View>
    <Text style={styles.section}>CONSENTIMIENTOS</Text><View style={styles.card}>{purposes.map((purpose) => { const unavailableLocally = demoSession && ['documentAnalysis', 'aiAssistant', 'productAnalytics'].includes(purpose.id); return <View key={purpose.id} style={styles.row}><View style={styles.rowText}><Text style={styles.rowTitle}>{purpose.title}</Text><Text style={styles.rowBody}>{unavailableLocally ? 'No se utiliza en modo local gratuito.' : purpose.body}</Text>{purpose.required ? <Text style={styles.required}>Necesario en modo local</Text> : unavailableLocally ? <Text style={styles.required}>Requiere una cuenta conectada</Text> : null}</View><Switch accessibilityLabel={purpose.title} value={unavailableLocally ? false : consentPreferences[purpose.id]} disabled={purpose.required || unavailableLocally} onValueChange={(value) => void changeConsent(purpose.id, value)} trackColor={{ false: '#D8DDD9', true: colors.sage }} thumbColor="#FFF" /></View>; })}</View>
    <Text style={styles.section}>RESUMEN LOCAL</Text><View style={styles.stats}><Stat value={profiles.length} label="Perfiles" /><Stat value={caregivers.length} label="Cuidadores" /><Stat value={events.length} label="Registros" /><Stat value={documents.length} label="Documentos" /></View>
    <Text style={styles.section}>{demoSession ? 'ESPACIO LOCAL' : 'CUENTA'}</Text><View style={styles.card}><View style={styles.row}><View style={styles.rowText}><Text style={styles.rowTitle}>{demoSession ? 'Sin cuenta y sin nube' : user?.email ?? 'Cuenta familiar'}</Text><Text style={styles.rowBody}>{demoSession ? 'Los cambios permanecen únicamente en este dispositivo.' : 'Sesión protegida y persistente.'}</Text></View></View>{conflictCount ? <Action icon="compare-horizontal" title="Revisar cambios simultáneos" body="Elige qué versión conservar antes de continuar la sincronización." onPress={() => router.push('/sync-conflicts')} /> : null}{!demoSession ? <Action icon="cloud-sync-outline" title="Sincronizar ahora" body="Guarda en el espacio familiar los cambios pendientes de este dispositivo." onPress={async () => { const result = await syncNow(); Alert.alert(result.ok ? 'Sincronización completa' : 'No fue posible sincronizar', result.message ?? 'Los cambios están protegidos en tu cuenta.'); }} /> : null}<Action icon="logout" title={demoSession ? 'Salir del espacio local' : 'Cerrar sesión'} body={demoSession ? 'Volverás a la bienvenida. Los datos locales permanecerán en este dispositivo.' : 'Volverás a la bienvenida. Los datos de la cuenta permanecerán protegidos.'} onPress={async () => { await signOut(); router.replace('/'); }} /></View>
    <Text style={styles.section}>RESPALDO Y RECUPERACIÓN</Text><View style={styles.card}><Action icon="download-outline" title="Crear respaldo" body="Guarda perfiles, registros y datos documentales; no incluye los PDFs o imágenes originales." onPress={() => void exportData()} /><Action icon="backup-restore" title="Restaurar respaldo" body={demoSession ? 'Revisa una copia de Emi antes de reemplazar los datos locales.' : 'Disponible en modo local; no sobrescribe una cuenta conectada.'} onPress={() => void chooseBackup()} /></View>
    {pendingBackup ? <View style={styles.restoreCard}><View style={styles.restoreHead}><MaterialCommunityIcons name="file-check-outline" size={22} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.restoreTitle}>Respaldo listo para revisar</Text><Text style={styles.restoreMeta}>Creado el {new Date(pendingBackup.exportedAt).toLocaleString('es-MX')}</Text></View></View><View style={styles.restoreStats}><Text style={styles.restoreStat}>{pendingBackup.profiles.length} perfiles</Text><Text style={styles.restoreStat}>{pendingBackup.events.length} registros</Text><Text style={styles.restoreStat}>{pendingBackup.documents.length} documentos</Text></View><Text style={styles.restoreWarning}>Al restaurar se reemplazarán los datos de este modo local. Los archivos PDF originales no se recuperan y los permisos de IA permanecerán apagados.</Text><View style={styles.restoreActions}><Pressable onPress={() => setPendingBackup(undefined)} style={styles.restoreCancel}><Text style={styles.restoreCancelText}>Cancelar</Text></Pressable><Pressable onPress={restoreBackup} style={styles.restoreConfirm}><Text style={styles.restoreConfirmText}>Restaurar copia</Text></Pressable></View></View> : null}
    <Text style={styles.section}>TUS DERECHOS Y CONTROLES</Text><View style={styles.card}><Action icon="account-key-outline" title="Revisar accesos" body="Consulta y ajusta permisos por embarazo o hijo." onPress={() => router.push('/profiles')} /><Action icon="trash-can-outline" title="Solicitar eliminación" body="Reautenticación, siete días para cancelar y limpieza protegida de datos y archivos." danger onPress={() => router.push('/data-erasure')} /></View>
    <View style={styles.notice}><MaterialCommunityIcons name="shield-check-outline" size={19} color={colors.sageDark} /><Text style={styles.noticeText}>Emi no vende información de salud. La analítica del producto no debe contener nombres, registros médicos, texto libre ni archivos.</Text></View>
  </AppShell>;
}

function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Action({ icon, title, body, onPress, danger }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string; onPress: () => void; danger?: boolean }) { return <Pressable onPress={onPress} style={styles.action}><View style={[styles.actionIcon, danger && styles.actionDanger]}><MaterialCommunityIcons name={icon} size={19} color={danger ? '#9B4B4B' : colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={[styles.rowTitle, danger && { color: '#8D4747' }]}>{title}</Text><Text style={styles.rowBody}>{body}</Text></View><MaterialCommunityIcons name="chevron-right" size={19} color={colors.muted} /></Pressable>; }
const styles = StyleSheet.create({ restoreCard: { marginTop: 10, borderRadius: 20, borderWidth: 1, borderColor: '#CDE0D9', backgroundColor: colors.mint, padding: 14 }, restoreHead: { flexDirection: 'row', alignItems: 'center', gap: 9 }, restoreTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, restoreMeta: { color: colors.muted, fontSize: 8, marginTop: 2 }, restoreStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }, restoreStat: { color: colors.sageDark, fontSize: 8, fontWeight: '800', backgroundColor: colors.white, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 }, restoreWarning: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 10 }, restoreActions: { flexDirection: 'row', gap: 8, marginTop: 12 }, restoreCancel: { flex: 1, height: 42, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, restoreCancelText: { color: colors.sageDark, fontSize: 9, fontWeight: '900' }, restoreConfirm: { flex: 1.4, height: 42, borderRadius: 13, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center' }, restoreConfirmText: { color: colors.white, fontSize: 9, fontWeight: '900' }, title: { color: colors.ink, fontSize: 27, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 }, mode: { flexDirection: 'row', gap: 11, borderRadius: 19, padding: 15, marginTop: 19, borderWidth: 1 }, modeDemo: { backgroundColor: '#FFF5E5', borderColor: '#EAD8B7' }, modeCloud: { backgroundColor: colors.mint, borderColor: '#CDE0D9' }, modeTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, modeBody: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 4 }, section: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 22, marginBottom: 8 }, card: { borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14 }, row: { minHeight: 83, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, rowText: { flex: 1, paddingVertical: 12 }, rowTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' }, rowBody: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 3 }, required: { color: colors.sageDark, fontSize: 7, fontWeight: '800', marginTop: 5 }, stats: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, stat: { flex: 1, minWidth: 85, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 13 }, statValue: { color: colors.ink, fontSize: 21, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 8, marginTop: 3 }, action: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, actionIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, actionDanger: { backgroundColor: '#FBEAEA' }, notice: { flexDirection: 'row', gap: 9, borderRadius: 16, padding: 13, marginTop: 12, backgroundColor: colors.mint }, noticeText: { flex: 1, color: colors.sageDark, fontSize: 8, lineHeight: 13 } });
