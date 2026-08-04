import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { BrandMark } from './BrandMark';

export function AuthScaffold({ title, body, children, back = true }: PropsWithChildren<{ title: string; body: string; back?: boolean }>) {
  const router = useRouter();
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <View style={styles.card}>
      <View style={styles.top}>{back ? <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={19} color={colors.ink} /></Pressable> : <View style={styles.back} />}<View style={styles.brand}><BrandMark size={32} /><Text style={styles.brandText}>Emi</Text></View><View style={styles.back} /></View>
      <Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text>{children}
      <View style={styles.security}><MaterialCommunityIcons name="shield-lock-outline" size={17} color={colors.sageDark} /><Text style={styles.securityText}>Tu contraseña es administrada por el servicio de autenticación y nunca se guarda en los registros familiares.</Text></View>
    </View>
  </ScrollView></SafeAreaView>;
}

export const authStyles = StyleSheet.create({
  label: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 15, marginBottom: 7 }, input: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF', color: colors.ink, paddingHorizontal: 15, fontSize: 12 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF' }, passwordInput: { flex: 1, height: 50, color: colors.ink, paddingHorizontal: 15, fontSize: 12, outlineStyle: 'none' } as any, eye: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  primary: { height: 52, marginTop: 20, borderRadius: 17, backgroundColor: colors.sageDark, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, primaryDisabled: { opacity: .5 }, primaryText: { color: '#FFF', fontSize: 11, fontWeight: '900' }, link: { paddingVertical: 12, alignItems: 'center' }, linkText: { color: colors.sageDark, fontSize: 10, fontWeight: '800' }, error: { marginTop: 12, padding: 11, borderRadius: 13, backgroundColor: '#FBEAEA', color: '#8D4747', fontSize: 9, lineHeight: 14 }, success: { marginTop: 12, padding: 11, borderRadius: 13, backgroundColor: colors.mint, color: colors.sageDark, fontSize: 9, lineHeight: 14 }, helper: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 6 }
});

const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, page: { flexGrow: 1, minHeight: '100%', justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.canvas }, card: { width: '100%', maxWidth: 460, borderRadius: 30, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 27, ...Platform.select({ web: { boxShadow: '0 28px 80px rgba(39,67,61,.13)' } as any, default: {} }) }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandText: { color: colors.ink, fontFamily: serif, fontWeight: '700', fontSize: 18 }, title: { color: colors.ink, fontFamily: serif, fontSize: 31, lineHeight: 37, textAlign: 'center', marginTop: 25, fontWeight: '700' }, body: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8, marginBottom: 9 }, security: { marginTop: 17, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', gap: 8, alignItems: 'center' }, securityText: { flex: 1, color: colors.muted, fontSize: 7, lineHeight: 11 } });
