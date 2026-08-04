import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { AuthScaffold, authStyles as s } from '@/components/AuthScaffold';
import { useAuth } from '@/context/AuthContext';
import { isAcceptablePassword } from '@/lib/auth';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const valid = isAcceptablePassword(password) && password === confirmation;
  const submit = async () => {
    setBusy(true); setMessage('');
    const result = await updatePassword(password);
    setBusy(false);
    if (result.ok) router.replace('/home');
    else setMessage(result.message || 'No pudimos actualizar la contraseña.');
  };
  return <AuthScaffold title="Protege nuevamente tu cuenta" body="Crea una contraseña nueva. Emi nunca guarda ni puede leer tu contraseña.">
    <Text style={s.label}>Nueva contraseña</Text>
    <TextInput accessibilityLabel="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" style={s.input} placeholder="Mínimo 8 caracteres" placeholderTextColor="#A7B0AD" />
    <Text style={s.label}>Confirmar contraseña</Text>
    <TextInput accessibilityLabel="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" style={s.input} placeholder="Escríbela nuevamente" placeholderTextColor="#A7B0AD" />
    <Text style={s.helper}>Incluye al menos una letra y un número.</Text>
    {confirmation && password !== confirmation ? <Text style={s.error}>Las contraseñas no coinciden.</Text> : null}
    {message ? <Text style={s.error}>{message}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy || !valid} onPress={submit} style={[s.primary, (busy || !valid) && s.primaryDisabled]}><Text style={s.primaryText}>{busy ? 'Guardando…' : 'Guardar nueva contraseña'}</Text></Pressable>
  </AuthScaffold>;
}
