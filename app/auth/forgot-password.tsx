import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { AuthScaffold, authStyles as s } from '@/components/AuthScaffold';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth(); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [success, setSuccess] = useState(false);
  const submit = async () => { setBusy(true); const result = await sendPasswordReset(email); setBusy(false); setSuccess(result.ok); setMessage(result.ok ? 'Si existe una cuenta con ese correo, recibirás instrucciones para restablecerla.' : result.message ?? 'No fue posible enviar las instrucciones.'); };
  return <AuthScaffold title="Recupera tu acceso" body="Te enviaremos instrucciones seguras a tu correo."><Text style={s.label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={s.input} placeholder="nombre@correo.com" placeholderTextColor="#A7B0AD" />{message ? <Text style={success ? s.success : s.error}>{message}</Text> : null}<Pressable accessibilityRole="button" disabled={busy || !email.includes('@')} onPress={submit} style={[s.primary, (busy || !email.includes('@')) && s.primaryDisabled]}><Text style={s.primaryText}>{busy ? 'Enviando…' : 'Enviar instrucciones'}</Text></Pressable></AuthScaffold>;
}
