import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { AuthScaffold, authStyles as s } from '@/components/AuthScaffold';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export default function SignInScreen() {
  const router = useRouter(); const { signIn } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const submit = async () => { setBusy(true); setMessage(''); const result = await signIn(email, password); setBusy(false); if (result.ok) router.replace(result.nextPath ?? '/home'); else setMessage(result.message ?? 'No fue posible iniciar sesión.'); };
  return <AuthScaffold title="Qué gusto tenerte aquí" body="Entra a tu espacio familiar protegido.">
    <Text style={s.label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={s.input} placeholder="nombre@correo.com" placeholderTextColor="#A7B0AD" />
    <Text style={s.label}>Contraseña</Text><Pressable style={s.passwordWrap}><TextInput accessibilityLabel="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="current-password" style={s.passwordInput} placeholder="Tu contraseña" placeholderTextColor="#A7B0AD" /><Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShow(!show)} style={s.eye}><MaterialCommunityIcons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} /></Pressable></Pressable>
    {message ? <Text style={s.error}>{message}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy || !email.trim() || !password} onPress={submit} style={[s.primary, (busy || !email.trim() || !password) && s.primaryDisabled]}><Text style={s.primaryText}>{busy ? 'Entrando…' : 'Iniciar sesión'}</Text></Pressable>
    <Pressable accessibilityRole="link" onPress={() => router.push('/auth/forgot-password')} style={s.link}><Text style={s.linkText}>¿Olvidaste tu contraseña?</Text></Pressable>
    <Pressable accessibilityRole="link" onPress={() => router.push('/auth/sign-up')} style={s.link}><Text style={s.linkText}>¿Aún no tienes cuenta? Crear una</Text></Pressable>
  </AuthScaffold>;
}
