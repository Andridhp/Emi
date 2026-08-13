import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { guidanceRules, ObservableFlag, evaluateObservableFlags } from '@/lib/guidanceEngine';
import { colors, shadow } from '@/theme';

const levels = [
  { label: 'Esperado', color: '#DCECE6' }, { label: 'Observar', color: '#FFF0C9' },
  { label: 'Consultar', color: '#F7D9BE' }, { label: 'Atención inmediata', color: '#F2C9C9' }
];

export default function GuidanceScreen() {
  const router = useRouter();
  const [flags, setFlags] = useState<ObservableFlag[]>([]);
  const result = useMemo(() => evaluateObservableFlags(flags), [flags]);
  const toggle = (flag: ObservableFlag) => setFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  return <AppShell>
    <Pressable accessibilityRole="button" style={styles.back} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={17} color={colors.sageDark} /><Text style={styles.backText}>Volver</Text></Pressable>
    <Text style={styles.eyebrow}>ORIENTACIÓN SEGURA · PILOTO</Text>
    <Text style={styles.title}>Primero, lo que necesita atención ahora</Text>
    <Text style={styles.subtitle}>Marca solamente lo que puedes observar en este momento. Esta herramienta no interpreta notas, no diagnostica y no sustituye una valoración profesional.</Text>

    <View style={styles.levels}>{levels.map((level) => <View key={level.label} style={[styles.level, { backgroundColor: level.color }]}><Text style={styles.levelText}>{level.label}</Text></View>)}</View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>¿Está ocurriendo alguna de estas señales?</Text>
      <Text style={styles.cardHelp}>La selección es manual. La IA no decide esta clasificación.</Text>
      {guidanceRules.map((rule) => { const active = flags.includes(rule.flag); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: active }} key={rule.id} onPress={() => toggle(rule.flag)} style={[styles.option, active && styles.optionActive]}><View style={[styles.check, active && styles.checkActive]}>{active ? <MaterialCommunityIcons name="check" size={15} color="#FFF" /> : null}</View><Text style={styles.optionText}>{rule.label}</Text></Pressable>; })}
    </View>

    <View accessibilityLiveRegion="polite" style={[styles.result, result.level === 'urgent' ? styles.resultUrgent : styles.resultNeutral]}>
      <View style={styles.resultHead}><MaterialCommunityIcons name={result.level === 'urgent' ? 'alert-octagon' : 'information-outline'} size={25} color={result.level === 'urgent' ? '#8D3535' : colors.sageDark} /><Text style={[styles.resultTitle, result.level === 'urgent' && styles.urgentText]}>{result.title}</Text></View>
      <Text style={styles.resultBody}>{result.message}</Text>
      {result.action ? <Text style={styles.action}>{result.action}</Text> : null}
    </View>

    {result.matchedRules.length ? <View style={styles.evidence}><Text style={styles.section}>POR QUÉ APARECIÓ</Text>{result.matchedRules.map((rule) => <View key={rule.id} style={styles.evidenceRow}><MaterialCommunityIcons name="book-open-page-variant-outline" size={17} color={colors.sageDark} /><View style={{ flex: 1 }}><Text style={styles.evidenceLabel}>{rule.label}</Text><Pressable accessibilityRole="link" onPress={() => Linking.openURL(rule.sourceUrl)}><Text style={styles.source}>{rule.sourceName} · Abrir fuente</Text></Pressable></View></View>)}</View> : null}

    <View style={styles.pilot}><MaterialCommunityIcons name="shield-alert-outline" size={20} color="#795F2E" /><Text style={styles.pilotText}>Versión {result.rulesetVersion}. Criterios de emergencia respaldados por fuentes oficiales, todavía pendientes de validación clínica y jurisdiccional para lanzamiento. Las demás categorías aún no emiten recomendaciones automáticas.</Text></View>
  </AppShell>;
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 18 }, backText: { color: colors.sageDark, fontSize: 10, fontWeight: '800' }, eyebrow: { color: colors.sageDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 7, maxWidth: 610 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, maxWidth: 640, marginTop: 7 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 20 }, level: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, levelText: { color: colors.ink, fontSize: 8, fontWeight: '800' },
  card: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 18, ...shadow }, cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' }, cardHelp: { color: colors.muted, fontSize: 9, marginTop: 4, marginBottom: 10 }, option: { minHeight: 52, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 11 }, optionActive: { backgroundColor: '#FFF7F5' }, check: { width: 23, height: 23, borderRadius: 8, borderWidth: 1, borderColor: '#B6C1BD', alignItems: 'center', justifyContent: 'center' }, checkActive: { backgroundColor: colors.red, borderColor: colors.red }, optionText: { color: colors.ink, fontSize: 10, fontWeight: '700', flex: 1 },
  result: { borderRadius: 20, padding: 17, marginTop: 15, borderWidth: 1 }, resultNeutral: { backgroundColor: colors.mint, borderColor: '#CFE0D8' }, resultUrgent: { backgroundColor: '#FFF0F0', borderColor: '#E6BABA' }, resultHead: { flexDirection: 'row', alignItems: 'center', gap: 9 }, resultTitle: { color: colors.sageDark, fontSize: 16, fontWeight: '900' }, urgentText: { color: '#8D3535' }, resultBody: { color: colors.ink, fontSize: 10, lineHeight: 16, marginTop: 9 }, action: { color: '#7A3030', fontSize: 11, lineHeight: 17, fontWeight: '900', marginTop: 10 },
  evidence: { marginTop: 20 }, section: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }, evidenceRow: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 12, flexDirection: 'row', gap: 10, marginBottom: 7 }, evidenceLabel: { color: colors.ink, fontSize: 10, fontWeight: '800' }, source: { color: colors.sageDark, fontSize: 8, fontWeight: '700', textDecorationLine: 'underline', marginTop: 4 }, pilot: { flexDirection: 'row', gap: 9, backgroundColor: '#FFF4DD', borderRadius: 16, padding: 13, marginTop: 18 }, pilotText: { color: '#795F2E', fontSize: 9, lineHeight: 14, flex: 1 }
});
