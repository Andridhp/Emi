import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { AuthScaffold, authStyles as s } from '@/components/AuthScaffold';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';
import { isAcceptablePassword, isValidEmail } from '@/lib/auth';

export default function SignUpScreen() {
  const router = useRouter(); const { signUp } = useAuth();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [success, setSuccess] = useState(false);
  const valid = name.trim().length > 1 && isValidEmail(email) && isAcceptablePassword(password);
  const submit = async () => { setBusy(true); setMessage(''); const result = await signUp(name, email, password); setBusy(false); if (!result.ok) return setMessage(result.message ?? 'No fue posible crear la cuenta.'); if (result.needsEmailConfirmation) { setSuccess(true); setMessage('Te enviamos un vínculo de verificación. Confirma tu correo para continuar.'); } else router.replace('/consent'); };
  return <AuthScaffold title="Crea tu espacio familiar" body="Un lugar privado para acompañar cada etapa con calma.">
    <Text style={s.label}>Tu nombre</Text><TextInput accessibilityLabel="Tu nombre" value={name} onChangeText={setName} autoComplete="name" style={s.input} placeholder="¿Cómo te llamamos?" placeholderTextColor="#A7B0AD" />
    <Text style={s.label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={s.input} placeholder="nombre@correo.com" placeholderTextColor="#A7B0AD" />
    <Text style={s.label}>Crea una contraseña</Text><Pressable style={s.passwordWrap}><TextInput accessibilityLabel="Crea una contraseña" value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="new-password" style={s.passwordInput} placeholder="Mínimo 8 caracteres" placeholderTextColor="#A7B0AD" /><Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShow(!show)} style={s.eye}><MaterialCommunityIcons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} /></Pressable></Pressable><Text style={s.helper}>Usa 8 o más caracteres e incluye al menos una letra y un número.</Text>
    {message ? <Text style={success ? s.success : s.error}>{message}</Text> : null}
    {!success ? <Pressable accessibilityRole="button" disabled={busy || !valid} onPress={submit} style={[s.primary, (busy || !valid) && s.primaryDisabled]}><Text style={s.primaryText}>{busy ? 'Creando…' : 'Crear cuenta'}</Text></Pressable> : null}
    <Pressable accessibilityRole="link" onPress={() => router.replace('/auth/sign-in')} style={s.link}><Text style={s.linkText}>Ya tengo una cuenta</Text></Pressable>
  </AuthScaffold>;
}
