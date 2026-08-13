import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { navGroups } from '@/data/navigation';
import { colors, webDepth } from '@/theme';

export default function ExploreScreen() {
  const path = usePathname();
  const router = useRouter();
  return <AppShell>
    <Text style={styles.eyebrow}>MAPA DE LA APLICACIÓN</Text>
    <Text style={styles.title}>Encuentra todo sin perderte</Text>
    <Text style={styles.subtitle}>La información está ordenada por propósito. Elige un área y siempre podrás volver aquí.</Text>
    <View style={styles.route}><View style={styles.routeStep}><Text style={styles.stepNumber}>1</Text><Text style={styles.stepText}>Elige una etapa</Text></View><View style={styles.routeLine} /><View style={styles.routeStep}><Text style={styles.stepNumber}>2</Text><Text style={styles.stepText}>Abre un tema</Text></View><View style={styles.routeLine} /><View style={styles.routeStep}><Text style={styles.stepNumber}>3</Text><Text style={styles.stepText}>Consulta o registra</Text></View></View>
    {navGroups.map((group) => <View key={group.label} style={styles.group}>
      <Text style={styles.groupLabel}>{group.label}</Text>
      <View style={styles.items}>{group.items.map((item) => { const active = path === item.href; return <Pressable accessibilityRole="link" key={item.href} onPress={() => router.push(item.href as never)} style={[styles.item, active && styles.itemActive]}><View style={styles.icon}><MaterialCommunityIcons name={item.icon} size={21} color={colors.sageDark} /></View><Text style={styles.itemText}>{item.label}</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>; })}</View>
    </View>)}
    <View style={styles.safety}><MaterialCommunityIcons name="shield-check-outline" size={19} color={colors.sageDark} /><Text style={styles.safetyText}>Puedes explorar sin registrar nada. Cada dato guardado indica de dónde proviene y puede revisarse antes de compartirlo.</Text></View>
  </AppShell>;
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.sageDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, maxWidth: 560, marginTop: 6 },
  route: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(229,240,235,.88)', borderWidth: 1, borderColor: 'rgba(134,169,157,.16)', borderRadius: 21, padding: 15, marginTop: 20, marginBottom: 26, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, routeStep: { flex: 1, alignItems: 'center', gap: 5 }, stepNumber: { width: 27, height: 27, borderRadius: 11, backgroundColor: colors.sageDark, color: '#FFF', textAlign: 'center', paddingTop: 6, fontSize: 9, fontWeight: '900', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, stepText: { color: colors.sageDark, fontSize: 8, textAlign: 'center', fontWeight: '700' }, routeLine: { width: 20, height: 2, borderRadius: 1, backgroundColor: colors.sage },
  group: { marginBottom: 23 }, groupLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }, items: { gap: 9 }, item: { minHeight: 58, backgroundColor: 'rgba(255,253,252,.92)', borderWidth: 1, borderColor: 'rgba(231,226,218,.88)', borderRadius: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, ...Platform.select({ web: { boxShadow: webDepth.soft, transitionDuration: '150ms' } as any }) }, itemActive: { backgroundColor: colors.mint }, icon: { width: 39, height: 39, borderRadius: 14, backgroundColor: '#EEF3F0', borderWidth: 1, borderColor: 'rgba(255,255,255,.74)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, itemText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '800' }, safety: { backgroundColor: colors.mint, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 9, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, safetyText: { flex: 1, color: colors.sageDark, fontSize: 9, lineHeight: 14 }
});
