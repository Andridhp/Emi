import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { profileAgeLabel } from '@/lib/profiles';
import { accessLabel, ProfileAccess } from '@/lib/access';
import { useAppStore } from '@/store/useAppStore';
import { colors, shadowLifted, webDepth } from '@/theme';
import { ProfileStage } from '@/types/domain';
import { useAuth } from '@/context/AuthContext';
import { createCaregiverInvitation, invitationUrl, removeCloudCaregiver, setCloudCaregiverAccess } from '@/lib/invitations';

export default function ProfilesScreen() {
  const router = useRouter();
  const { demoSession, familyId } = useAuth();
  const { profiles, caregivers, activeProfileId, setActiveProfile, addProfile, addCaregiver, setCaregiverProfileAccess, removeCaregiver } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [caregiverOpen, setCaregiverOpen] = useState(false);
  const [stage, setStage] = useState<ProfileStage>('child');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [caregiverAccess, setCaregiverAccess] = useState<'viewer' | 'editor'>('editor');
  const [editingCaregiverId, setEditingCaregiverId] = useState<string>();
  const [error, setError] = useState('');
  const select = (id: string) => { setActiveProfile(id); router.push('/home'); };
  const changeCaregiverAccess = async (caregiverId: string, profileId: string, access?: ProfileAccess) => {
    const previous = caregivers.find((item) => item.id === caregiverId)?.profileAccess?.[profileId] as ProfileAccess | undefined;
    setCaregiverProfileAccess(caregiverId, profileId, access);
    if (demoSession || !familyId) return;
    try { await setCloudCaregiverAccess(familyId, caregiverId, profileId, access); }
    catch { setCaregiverProfileAccess(caregiverId, profileId, previous); Alert.alert('No se guardó el permiso', 'Revisa la conexión e inténtalo nuevamente.'); }
  };
  const deleteCaregiver = async (id: string) => {
    if (!demoSession && familyId) {
      try { await removeCloudCaregiver(familyId, id); }
      catch { return Alert.alert('No se quitó el acceso', 'Revisa la conexión e inténtalo nuevamente.'); }
    }
    removeCaregiver(id); setEditingCaregiverId(undefined);
  };
  const saveProfile = () => {
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Escribe un nombre y una fecha con formato AAAA-MM-DD.'); return; }
    addProfile({ name: name.trim(), stage, ...(stage === 'child' ? { birthDate: date } : { dueDate: date }) });
    setProfileOpen(false); setName(''); setDate(''); setError(''); router.push('/home');
  };
  const saveCaregiver = async () => {
    if (!name.trim()) { setError('Escribe el nombre del cuidador.'); return; }
    if (!demoSession && (!familyId || !/^\S+@\S+\.\S+$/.test(email.trim()))) { setError('Escribe el correo de la cuenta que recibirá la invitación.'); return; }
    if (demoSession) { addCaregiver(name, relationship, caregiverAccess); setCaregiverOpen(false); setName(''); setRelationship(''); setEmail(''); setError(''); return; }
    setBusy(true); setError('');
    try {
      const result = await createCaregiverInvitation({ familyId: familyId!, email, name, relationship, profileAccess: { [activeProfileId]: caregiverAccess } });
      const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
      setInvitationLink(invitationUrl(result.token, origin));
    } catch { setError('No pudimos crear la invitación. Revisa la conexión e inténtalo nuevamente.'); }
    finally { setBusy(false); }
  };
  return <AppShell>
    <Text style={styles.eyebrow}>TU FAMILIA</Text><Text style={styles.title}>Cada historia, en su lugar</Text><Text style={styles.subtitle}>Cambia de perfil sin mezclar registros. Tú controlas quién puede acompañar cada etapa.</Text>
    <View style={styles.overview}><View style={styles.overviewIcon}><MaterialCommunityIcons name="home-heart" size={25} color={colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={styles.overviewTitle}>Tu espacio familiar</Text><Text style={styles.overviewBody}>{profiles.length} {profiles.length === 1 ? 'perfil' : 'perfiles'} · {caregivers.length} {caregivers.length === 1 ? 'cuidador' : 'cuidadores'}</Text></View><MaterialCommunityIcons name="shield-check-outline" size={21} color={colors.sageDark} /></View>
    <View style={styles.howCard}>
      <View style={styles.howTop}><MaterialCommunityIcons name="account-group-outline" size={18} color={colors.sageDark} /><Text style={styles.howTitle}>Compartir es sencillo</Text></View>
      <View style={styles.howList}>
        <View style={styles.howRow}><Text style={styles.howNumber}>1</Text><Text style={styles.howText}>Agrega un perfil para cada embarazo o hijo.</Text></View>
        <View style={styles.howRow}><Text style={styles.howNumber}>2</Text><Text style={styles.howText}>Invita a cuidadores y define si pueden ver o registrar.</Text></View>
        <View style={styles.howRow}><Text style={styles.howNumber}>3</Text><Text style={styles.howText}>Emi sincroniza cambios y marca lo que necesite revisión.</Text></View>
      </View>
    </View>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>¿A quién acompañas?</Text><Text style={styles.sectionMeta}>Perfil activo</Text></View>
    <View style={styles.list}>{profiles.map((profile) => { const active = activeProfileId === profile.id; return <Pressable accessibilityRole="button" key={profile.id} onPress={() => select(profile.id)} style={[styles.profile, active && styles.profileActive]}><View style={[styles.avatar, profile.stage === 'pregnancy' && styles.avatarPregnancy]}><Text style={styles.avatarText}>{profile.avatar}</Text></View><View style={{ flex: 1 }}><Text style={styles.stageLabel}>{profile.stage === 'pregnancy' ? 'EMBARAZO' : 'DESARROLLO INFANTIL'}</Text><Text style={styles.name}>{profile.name}</Text><Text style={styles.meta}>{profileAgeLabel(profile)}</Text></View>{active ? <View style={styles.active}><MaterialCommunityIcons name="check" size={12} color={colors.sageDark} /><Text style={styles.activeText}>Actual</Text></View> : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />}</Pressable>; })}</View>
    <Pressable accessibilityRole="button" onPress={() => { setName(''); setError(''); setProfileOpen(true); }} style={styles.add}><MaterialCommunityIcons name="plus-circle-outline" size={21} color={colors.sageDark} /><Text style={styles.addText}>Agregar embarazo o hijo</Text></Pressable>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Quiénes cuidan contigo</Text><Text style={styles.sectionMeta}>Acceso por perfil</Text></View>
    <View style={styles.list}>{caregivers.map((person) => { const level = person.profileAccess?.[activeProfileId]; return <Pressable accessibilityRole="button" onPress={() => setEditingCaregiverId(person.id)} key={person.id} style={styles.caregiver}><View style={styles.initials}><Text style={styles.initialsText}>{person.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{person.name}</Text><Text style={styles.meta}>{person.relationship} · {person.access === 'admin' ? 'Administra la familia' : level ? accessLabel[level as ProfileAccess] : 'Sin acceso a este perfil'}</Text></View><View style={styles.permission}><Text style={styles.permissionText}>{person.access === 'admin' ? 'Total' : level === 'manager' ? 'Administrar' : level === 'editor' ? 'Registrar' : level === 'viewer' ? 'Ver' : 'Sin acceso'}</Text></View><MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} /></Pressable>; })}</View>
    <Pressable accessibilityRole="button" onPress={() => { setName(''); setEmail(''); setInvitationLink(''); setError(''); setCaregiverOpen(true); }} style={styles.secondary}><MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.sageDark} /><Text style={styles.secondaryText}>Invitar cuidador</Text></Pressable>
    <EditorModal visible={profileOpen} title="Nuevo perfil" onClose={() => setProfileOpen(false)}>
      <Text style={styles.label}>¿Qué quieres acompañar?</Text><View style={styles.segment}><Choice label="Un hijo" active={stage === 'child'} onPress={() => setStage('child')} /><Choice label="Un embarazo" active={stage === 'pregnancy'} onPress={() => setStage('pregnancy')} /></View>
      <Text style={styles.label}>{stage === 'child' ? 'Nombre' : 'Nombre para este embarazo'}</Text><TextInput accessibilityLabel="Nombre del perfil" value={name} onChangeText={setName} placeholder={stage === 'child' ? 'Ej. Emilia' : 'Ej. Bebé noviembre'} style={styles.input} />
      <Text style={styles.label}>{stage === 'child' ? 'Fecha de nacimiento' : 'Fecha probable de parto'}</Text><TextInput accessibilityLabel="Fecha" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" style={styles.input} />
      {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={saveProfile} style={styles.save}><Text style={styles.saveText}>Crear perfil</Text></Pressable>
    </EditorModal>
    <EditorModal visible={caregiverOpen} title="Agregar cuidador" onClose={() => setCaregiverOpen(false)}>
      <Text style={styles.label}>Nombre</Text><TextInput accessibilityLabel="Nombre del cuidador" value={name} onChangeText={setName} placeholder="Nombre completo" style={styles.input} />
      <Text style={styles.label}>Relación</Text><TextInput accessibilityLabel="Relación familiar" value={relationship} onChangeText={setRelationship} placeholder="Ej. Mamá, papá, abuela" style={styles.input} />
      {!demoSession ? <><Text style={styles.label}>Correo de su cuenta</Text><TextInput accessibilityLabel="Correo del cuidador" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="nombre@correo.com" style={styles.input} /></> : null}
      <Text style={styles.label}>Permiso para el perfil activo</Text><View style={styles.segment}><Choice label="Puede registrar" active={caregiverAccess === 'editor'} onPress={() => setCaregiverAccess('editor')} /><Choice label="Solo puede ver" active={caregiverAccess === 'viewer'} onPress={() => setCaregiverAccess('viewer')} /></View>
      <Text style={styles.helper}>{demoSession ? 'En modo local el cuidador se registra sólo en este dispositivo; no recibe una invitación.' : 'El vínculo caduca en 72 horas y sólo funciona con el correo indicado. La persona debe abrirlo con esa misma cuenta.'}</Text>
      {invitationLink ? <View style={styles.inviteReady}><MaterialCommunityIcons name="check-decagram-outline" size={21} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.inviteTitle}>Invitación protegida lista</Text><Text selectable numberOfLines={2} style={styles.inviteLink}>{invitationLink}</Text></View></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}{invitationLink ? <Pressable onPress={() => Share.share({ title: 'Invitación a Emi', message: `Te invito a acompañar a nuestra familia en Emi: ${invitationLink}` })} style={styles.save}><Text style={styles.saveText}>Compartir invitación</Text></Pressable> : <Pressable disabled={busy} onPress={saveCaregiver} style={[styles.save, busy && { opacity: .55 }]}><Text style={styles.saveText}>{busy ? 'Creando…' : demoSession ? 'Guardar cuidador' : 'Crear invitación'}</Text></Pressable>}
    </EditorModal>
    <CaregiverAccessModal caregiver={caregivers.find((person) => person.id === editingCaregiverId)} profiles={profiles} cloudConnected={!demoSession} onClose={() => setEditingCaregiverId(undefined)} onChange={changeCaregiverAccess} onRemove={deleteCaregiver} />
  </AppShell>;
}

function CaregiverAccessModal({ caregiver, profiles, cloudConnected, onClose, onChange, onRemove }: { caregiver?: ReturnType<typeof useAppStore.getState>['caregivers'][number]; profiles: ReturnType<typeof useAppStore.getState>['profiles']; cloudConnected: boolean; onClose: () => void; onChange: (caregiverId: string, profileId: string, access?: ProfileAccess) => void; onRemove: (id: string) => void }) {
  if (!caregiver) return null;
  const admin = caregiver.access === 'admin';
  return <EditorModal visible title="Acceso del cuidador" onClose={onClose}><View style={styles.personHead}><View style={styles.initials}><Text style={styles.initialsText}>{caregiver.name.slice(0, 2).toUpperCase()}</Text></View><View><Text style={styles.name}>{caregiver.name}</Text><Text style={styles.meta}>{caregiver.relationship}</Text></View></View>{admin ? <View style={styles.adminNotice}><MaterialCommunityIcons name="shield-account-outline" size={19} color={colors.sageDark} /><Text style={styles.adminText}>Este es el administrador de la familia. Su acceso no puede reducirse desde esta pantalla.</Text></View> : profiles.map((profile) => { const current = caregiver.profileAccess?.[profile.id] as ProfileAccess | undefined; return <View key={profile.id} style={styles.accessBlock}><Text style={styles.accessProfile}>{profile.name}</Text><View style={styles.accessChoices}><AccessChoice label="Sin acceso" active={!current} onPress={() => onChange(caregiver.id, profile.id, undefined)} /><AccessChoice label="Ver" active={current === 'viewer'} onPress={() => onChange(caregiver.id, profile.id, 'viewer')} /><AccessChoice label="Registrar" active={current === 'editor'} onPress={() => onChange(caregiver.id, profile.id, 'editor')} /></View><Text style={styles.helper}>{!current ? 'No verá registros ni documentos de este perfil.' : current === 'viewer' ? 'Puede consultar, pero no crear ni modificar información.' : 'Puede consultar y registrar; no administra otros accesos.'}</Text></View>; })}{!admin ? <Pressable accessibilityRole="button" onPress={() => onRemove(caregiver.id)} style={styles.remove}><MaterialCommunityIcons name="account-remove-outline" size={18} color="#984A4A" /><Text style={styles.removeText}>Quitar cuidador de esta familia</Text></Pressable> : null}<Text style={styles.helper}>{cloudConnected ? 'Los cambios se aplican en el servidor y quedan registrados en la bitácora familiar.' : 'Los cambios permanecen sólo en este dispositivo.'}</Text></EditorModal>;
}

function AccessChoice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={onPress} style={[styles.accessChoice, active && styles.accessChoiceActive]}><Text style={[styles.accessChoiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function EditorModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}><ScrollView contentContainerStyle={styles.modalWrap}><View style={styles.modal}><View style={styles.modalTop}><Text style={styles.modalTitle}>{title}</Text><Pressable accessibilityLabel="Cerrar" onPress={onClose}><MaterialCommunityIcons name="close" size={22} color={colors.ink} /></Pressable></View>{children}</View></ScrollView></View></Modal>; }

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  inviteReady: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.mint, borderRadius: 15, padding: 12, marginTop: 12 },
  inviteTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  inviteLink: { color: colors.sageDark, fontSize: 8, lineHeight: 12, marginTop: 3 },
  eyebrow: { color: colors.sageDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.ink, fontFamily: serif, fontSize: 31, lineHeight: 38, fontWeight: '700', letterSpacing: -.6, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5, maxWidth: 570 },
  overview: { minHeight: 78, borderRadius: 23, padding: 15, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(229,240,235,.9)', borderWidth: 1, borderColor: 'rgba(134,169,157,.16)', ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) },
  overviewIcon: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  overviewTitle: { color: colors.ink, fontFamily: serif, fontSize: 14, fontWeight: '700' },
  overviewBody: { color: colors.muted, fontSize: 8, marginTop: 3 },
  howCard: { borderRadius: 20, backgroundColor: 'rgba(255,253,252,.92)', borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 12, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) },
  howTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  howTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  howList: { marginTop: 9, gap: 8 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  howNumber: { width: 18, height: 18, borderRadius: 7, backgroundColor: colors.mint, color: colors.sageDark, fontSize: 8, fontWeight: '900', textAlign: 'center', lineHeight: 18 },
  howText: { flex: 1, color: colors.muted, fontSize: 8, lineHeight: 13 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontFamily: serif, fontSize: 17, fontWeight: '700' },
  sectionMeta: { color: colors.sageDark, fontSize: 8, fontWeight: '900' },
  list: { gap: 9 },
  profile: { minHeight: 84, backgroundColor: 'rgba(255,253,252,.92)', borderWidth: 1, borderColor: colors.line, borderRadius: 23, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) },
  profileActive: { borderColor: colors.sage, backgroundColor: '#F4F9F6' },
  avatar: { width: 50, height: 50, borderRadius: 19, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  avatarPregnancy: { backgroundColor: colors.lilac },
  avatarText: { color: colors.ink, fontFamily: serif, fontWeight: '700', fontSize: 19 },
  stageLabel: { color: colors.sageDark, fontSize: 7, fontWeight: '900', letterSpacing: .7 },
  name: { color: colors.ink, fontSize: 11, fontWeight: '900', marginTop: 2 },
  meta: { color: colors.muted, fontSize: 8, marginTop: 3 },
  active: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.mint, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  activeText: { color: colors.sageDark, fontSize: 7, fontWeight: '900' },
  add: { height: 49, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sage, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
  addText: { color: colors.sageDark, fontSize: 9, fontWeight: '900' },
  caregiver: { minHeight: 68, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  initials: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: colors.sageDark, fontFamily: serif, fontSize: 12, fontWeight: '700' },
  permission: { backgroundColor: colors.canvas, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 },
  permissionText: { color: colors.muted, fontSize: 7, fontWeight: '800' },
  secondary: { height: 49, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
  secondaryText: { color: colors.sageDark, fontSize: 9, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(25,43,39,.45)' },
  modalWrap: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.card, borderRadius: 30, padding: 22, ...shadowLifted, ...Platform.select({ web: { boxShadow: webDepth.raised } as any }) },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { color: colors.ink, fontFamily: serif, fontSize: 23, fontWeight: '700' },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  adminNotice: { flexDirection: 'row', gap: 9, backgroundColor: colors.mint, borderRadius: 15, padding: 12, marginTop: 12 },
  adminText: { color: colors.sageDark, fontSize: 9, lineHeight: 14, flex: 1 },
  accessBlock: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, marginTop: 12 },
  accessProfile: { color: colors.ink, fontSize: 11, fontWeight: '900', marginBottom: 7 },
  accessChoices: { flexDirection: 'row', gap: 6 },
  accessChoice: { flex: 1, minHeight: 38, borderWidth: 1, borderColor: colors.line, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  accessChoiceActive: { backgroundColor: colors.mint, borderColor: colors.sage },
  accessChoiceText: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  remove: { minHeight: 44, borderRadius: 14, backgroundColor: '#FBEAEA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  removeText: { color: '#984A4A', fontSize: 9, fontWeight: '900' },
  label: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 13, color: colors.ink, backgroundColor: '#FFF' },
  segment: { flexDirection: 'row', gap: 7 },
  choice: { flex: 1, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.line },
  choiceActive: { backgroundColor: colors.mint, borderColor: colors.sage },
  choiceText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  choiceTextActive: { color: colors.sageDark },
  helper: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 10 },
  error: { color: '#A34B4B', fontSize: 9, marginTop: 10 },
  save: { height: 50, borderRadius: 16, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveText: { color: colors.white, fontSize: 10, fontWeight: '900' }
});
