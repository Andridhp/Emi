import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, webDepth } from '@/theme';

export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.row}><Text style={styles.title}>{title}</Text>{action ? onPress ? <Pressable accessibilityRole="link" onPress={onPress}><Text style={styles.action}>{action}</Text></Pressable> : <Text style={styles.meta}>{action}</Text> : null}</View>;
}
const serif = Platform.select({ web: 'Georgia, Times New Roman, serif', ios: 'Georgia', android: 'serif' });
const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 29, marginBottom: 13 }, title: { fontFamily: serif, fontSize: 18, fontWeight: '700', color: colors.ink, letterSpacing: -.25 }, action: { fontSize: 9, fontWeight: '900', color: colors.sageDark, backgroundColor: 'rgba(255,255,255,.72)', borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, meta: { fontSize: 8, fontWeight: '900', color: colors.sageDark, backgroundColor: colors.mint, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6 } });
