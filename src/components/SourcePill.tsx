import { StyleSheet, Text, View } from 'react-native';
import { SourceKind } from '@/types/domain';
import { sourceLabel } from '@/lib/source';
import { colors } from '@/theme';

export function SourcePill({ source }: { source: SourceKind }) {
  const symbol = source === 'ai' ? '✦' : source === 'professional' ? '✓' : '•';
  return <View style={styles.pill}><Text style={styles.text}>{symbol} {sourceLabel[source]}</Text></View>;
}
const styles = StyleSheet.create({ pill: { alignSelf: 'flex-start', backgroundColor: colors.mint, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 }, text: { color: colors.sageDark, fontSize: 9, fontWeight: '800' } });
