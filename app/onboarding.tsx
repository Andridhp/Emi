import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { useAuth } from '@/context/AuthContext';

type Journey = 'pregnancy' | 'baby';

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const [step, setStep] = useState(0);
  const [journey, setJourney] = useState<Journey>('baby');
  const [childName, setChildName] = useState('Emilia');
  const [caregiverName, setCaregiverName] = useState('');
  const { demoSession, syncNow } = useAuth();
  const { completeOnboarding, addProfile, profiles } = useAppStore();
  const next = () => setStep((current) => Math.min(3, current + 1));
  const back = () => step === 0 ? router.back() : setStep((current) => current - 1);
  const finish = async () => {
    const defaultId = journey === 'pregnancy' ? 'pregnancy' : 'emilia';
    const profileId = demoSession && profiles.some((profile) => profile.id === defaultId)
      ? defaultId
      : addProfile({ name: childName.trim(), stage: journey === 'pregnancy' ? 'pregnancy' : 'child' });
    completeOnboarding(profileId, childName, caregiverName);
    await syncNow();
    router.replace('/home');
  };
  return <SafeAreaView style={styles.safe}>
    <View style={styles.page}>
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} style={styles.iconButton}><MaterialCommunityIcons name="arrow-left" size={20} color={colors.ink} /></Pressable>
        <View style={styles.miniBrand}><View style={styles.miniLogo}><Text style={styles.miniLogoText}>E</Text></View><Text style={styles.miniBrandText}>Emi</Text></View>
        <View style={styles.skip} />
      </View>
      <View style={styles.progress}>{[0,1,2,3].map((item) => <View key={item} style={[styles.progressItem, item <= step && styles.progressActive]} />)}</View>
      <View style={[styles.content, compact && styles.contentCompact]}>
        {step === 0 ? <JourneyStep journey={journey} setJourney={setJourney} onNext={next} /> : null}
        {step === 1 ? <ProfileStep journey={journey} name={childName} setName={setChildName} onNext={next} /> : null}
        {step === 2 ? <CaregiverStep name={caregiverName} setName={setCaregiverName} onNext={next} /> : null}
        {step === 3 ? <GuideStep childName={childName || 'tu familia'} onFinish={finish} /> : null}
      </View>
      <Text style={styles.stepText}>Paso {step + 1} de 4</Text>
    </View>
  </SafeAreaView>;
}

function Intro({ overline, title, body }: { overline: string; title: string; body: string }) { return <View><Text style={styles.overline}>{overline}</Text><Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View>; }

function JourneyStep({ journey, setJourney, onNext }: { journey: Journey; setJourney: (value: Journey) => void; onNext: () => void }) {
  return <View><Intro overline="EMPECEMOS POR TI" title="¿En qué momento estás?" body="No necesitas tener todo resuelto. Solo cuéntanos dónde comienza hoy tu historia." />
    <View style={styles.choiceRow}><Choice active={journey === 'pregnancy'} icon="human-pregnant" title="Estoy esperando un bebé" detail="Planeación y embarazo" onPress={() => setJourney('pregnancy')} /><Choice active={journey === 'baby'} icon="baby-face-outline" title="Mi bebé ya nació" detail="Nacimiento y desarrollo" onPress={() => setJourney('baby')} /></View>
    <Primary label="Continuar" onPress={onNext} />
  </View>;
}

function ProfileStep({ journey, name, setName, onNext }: { journey: Journey; name: string; setName: (value: string) => void; onNext: () => void }) {
  return <View><Intro overline="UNA HISTORIA PROPIA" title={journey === 'pregnancy' ? '¿Cómo llamamos a esta etapa?' : '¿Cómo se llama tu bebé?'} body="Usaremos este nombre para que cada registro y recuerdo permanezca en el perfil correcto." />
    <Text style={styles.label}>{journey === 'pregnancy' ? 'Nombre del perfil' : 'Nombre o apodo'}</Text><TextInput accessibilityLabel="Nombre del perfil" value={name} onChangeText={setName} placeholder={journey === 'pregnancy' ? 'Mi embarazo' : 'Nombre del bebé'} placeholderTextColor="#A7B0AD" style={styles.input} />
    <View style={styles.kindCard}><View style={styles.kindIcon}><MaterialCommunityIcons name={journey === 'pregnancy' ? 'heart-pulse' : 'baby-face-outline'} size={23} color={colors.sageDark} /></View><View><Text style={styles.kindTitle}>{journey === 'pregnancy' ? 'Seguimiento prenatal' : 'Perfil infantil'}</Text><Text style={styles.kindBody}>{journey === 'pregnancy' ? 'Semanas, consultas, estudios y bienestar.' : 'Sueño, alimentación, salud y crecimiento.'}</Text></View></View>
    <Primary label="Crear este perfil" onPress={onNext} disabled={!name.trim()} />
  </View>;
}

function CaregiverStep({ name, setName, onNext }: { name: string; setName: (value: string) => void; onNext: () => void }) {
  return <View><Intro overline="CUIDAR TAMBIÉN ES COMPARTIR" title="¿Quién acompaña contigo?" body="Puedes agregar a otra persona ahora o hacerlo después. Tú decides qué información puede ver y registrar." />
    <Text style={styles.label}>Nombre del cuidador · opcional</Text><TextInput accessibilityLabel="Nombre del cuidador" value={name} onChangeText={setName} placeholder="Pareja, familiar o persona de confianza" placeholderTextColor="#A7B0AD" style={styles.input} />
    <View style={styles.permissionCard}><MaterialCommunityIcons name="account-lock-outline" size={22} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.permissionTitle}>Acceso bajo tu control</Text><Text style={styles.permissionBody}>Las invitaciones serán privadas, revocables y con permisos por perfil.</Text></View></View>
    <Primary label={name.trim() ? 'Agregar y continuar' : 'Continuar sin agregar'} onPress={onNext} />
  </View>;
}

function GuideStep({ childName, onFinish }: { childName: string; onFinish: () => void }) {
  return <View><Intro overline="TODO EN SU LUGAR" title={`Así acompañaremos a ${childName}`} body="El inicio diario está organizado en tres movimientos sencillos. No necesitas aprender la aplicación de memoria." />
    <View style={styles.guideList}><Guide number="1" icon="plus-circle-outline" title="Registrar" body="Guarda rápidamente lo que ocurre: una toma, una siesta, un síntoma o una consulta." /><Guide number="2" icon="lightbulb-on-outline" title="Comprender" body="Emi ordena los datos y muestra cambios como estimaciones, siempre con su procedencia." /><Guide number="3" icon="file-document-outline" title="Compartir" body="Prepara un resumen claro cuando necesites conversar con un profesional." /></View>
    <Primary label="Entrar a Emi" onPress={onFinish} />
  </View>;
}

function Choice({ active, icon, title, detail, onPress }: { active: boolean; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; detail: string; onPress: () => void }) { return <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><View style={[styles.choiceIcon, active && styles.choiceIconActive]}><MaterialCommunityIcons name={icon} size={27} color={active ? colors.sageDark : colors.muted} /></View><Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceDetail}>{detail}</Text><View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View></Pressable>; }
function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.primary, disabled && styles.primaryDisabled]}><Text style={styles.primaryText}>{label}</Text><MaterialCommunityIcons name="arrow-right" size={19} color="#FFF" /></Pressable>; }
function Guide({ number, icon, title, body }: { number: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string }) { return <View style={styles.guide}><Text style={styles.guideNumber}>{number}</Text><View style={styles.guideIcon}><MaterialCommunityIcons name={icon} size={21} color={colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={styles.guideTitle}>{title}</Text><Text style={styles.guideBody}>{body}</Text></View></View>; }

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F4EE' }, page: { flex: 1, backgroundColor: '#F8F4EE' }, topbar: { height: 70, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 980, width: '100%', alignSelf: 'center' }, iconButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, miniBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, miniLogo: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.sageDark, alignItems: 'center', justifyContent: 'center' }, miniLogoText: { color: '#FFF', fontFamily: serif, fontSize: 17, fontWeight: '700' }, miniBrandText: { color: colors.ink, fontFamily: serif, fontSize: 17, fontWeight: '700' }, skip: { padding: 10 }, skipText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, progress: { height: 4, flexDirection: 'row', gap: 5, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 24 }, progressItem: { flex: 1, height: 4, borderRadius: 3, backgroundColor: '#DDDCD6' }, progressActive: { backgroundColor: colors.sageDark },
  content: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 30 }, contentCompact: { justifyContent: 'flex-start', paddingTop: 35 }, overline: { color: colors.sageDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' }, title: { color: colors.ink, fontFamily: serif, fontSize: 36, lineHeight: 43, letterSpacing: -1, textAlign: 'center', marginTop: 9 }, body: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', maxWidth: 480, alignSelf: 'center', marginTop: 10 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 26 }, choice: { flex: 1, minWidth: 220, minHeight: 151, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 23, padding: 17, alignItems: 'center' }, choiceActive: { borderColor: colors.sage, backgroundColor: '#F2F8F4' }, choiceIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#F1F0EC', alignItems: 'center', justifyContent: 'center' }, choiceIconActive: { backgroundColor: colors.mint }, choiceTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 12, textAlign: 'center' }, choiceDetail: { color: colors.muted, fontSize: 9, marginTop: 3 }, radio: { position: 'absolute', right: 12, top: 12, width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#B9C2BF', alignItems: 'center', justifyContent: 'center' }, radioActive: { borderColor: colors.sageDark }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sageDark },
  label: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 28, marginBottom: 7 }, input: { height: 55, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 17, paddingHorizontal: 16, color: colors.ink, fontSize: 13 }, kindCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.mint, borderRadius: 17, padding: 13, marginTop: 10 }, kindIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, kindTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' }, kindBody: { color: colors.muted, fontSize: 9, marginTop: 2 }, permissionCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.mint, borderRadius: 17, padding: 14, marginTop: 11 }, permissionTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' }, permissionBody: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  guideList: { gap: 8, marginTop: 24 }, guide: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 11 }, guideNumber: { color: '#A4AEAA', fontFamily: serif, fontSize: 16, width: 17, textAlign: 'center' }, guideIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, guideTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' }, guideBody: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 2 },
  primary: { height: 54, backgroundColor: colors.sageDark, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }, primaryDisabled: { opacity: .45 }, primaryText: { color: '#FFF', fontSize: 11, fontWeight: '800' }, stepText: { color: colors.muted, fontSize: 8, textAlign: 'center', paddingBottom: 16 }
});
