import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthScaffold, authStyles as s } from '@/components/AuthScaffold';
import { useAuth } from '@/context/AuthContext';
import { acceptCaregiverInvitation, forgetInvitation, rememberInvitation } from '@/lib/invitations';
import { colors } from '@/theme';

export default function InviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { user, refreshWorkspace } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (token) void rememberInvitation(token); }, [token]);

  const accept = async () => {
    if (!token) return setMessage('Este vínculo no contiene una invitación válida.');
    setBusy(true); setMessage('');
    try {
      await acceptCaregiverInvitation(token);
      await forgetInvitation();
      const refreshed = await refreshWorkspace();
      if (!refreshed.ok) throw new Error(refreshed.message);
      router.replace('/home');
    } catch {
      setMessage('No pudimos aceptar la invitación. Puede haber expirado o pertenecer a otro correo.');
    } finally { setBusy(false); }
  };

  return <AuthScaffold title="Te invitaron a cuidar en Emi" body="El acceso es privado, revocable y se limita a los perfiles que la familia eligió.">
    <View style={styles.notice}><MaterialCommunityIcons name="account-lock-outline" size={24} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>{user ? 'Cuenta verificada' : 'Primero protege tu acceso'}</Text><Text style={styles.noticeBody}>{user ? `Aceptarás con ${user.email ?? 'tu cuenta actual'}.` : 'Inicia sesión o crea una cuenta usando el mismo correo al que enviaron esta invitación.'}</Text></View></View>
    {message ? <Text style={s.error}>{message}</Text> : null}
    {user ? <Pressable accessibilityRole="button" disabled={busy || !token} onPress={accept} style={[s.primary, (busy || !token) && s.primaryDisabled]}><Text style={s.primaryText}>{busy ? 'Comprobando…' : 'Aceptar invitación'}</Text></Pressable> : <>
      <Pressable accessibilityRole="link" onPress={() => router.push('/auth/sign-in')} style={s.primary}><Text style={s.primaryText}>Iniciar sesión</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/auth/sign-up')} style={s.link}><Text style={s.linkText}>Crear una cuenta</Text></Pressable>
    </>}
  </AuthScaffold>;
}

const styles = StyleSheet.create({ notice: { flexDirection: 'row', gap: 11, padding: 14, borderRadius: 18, backgroundColor: colors.mint, marginBottom: 8 }, noticeTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, noticeBody: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 } });
