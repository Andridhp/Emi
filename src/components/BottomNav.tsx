import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { mobileNavigation } from '@/data/navigation';
import { colors, shadowLifted, webDepth } from '@/theme';

export function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      {mobileNavigation.map((tab) => {
        const active = path === tab.href;
        return (
          <Pressable key={tab.href} accessibilityRole="button" onPress={() => router.push(tab.href as never)} style={styles.item}>
            <View style={[styles.iconWrap, active && styles.iconActive]}>
              <MaterialCommunityIcons name={tab.icon} size={23} color={active ? colors.sageDark : '#8B9692'} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, bottom: 12, height: 78, borderRadius: 27, backgroundColor: 'rgba(255,253,252,.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,.86)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, ...shadowLifted, ...Platform.select({ web: { boxShadow: webDepth.raised, backdropFilter: 'blur(22px)' } as any }) },
  item: { alignItems: 'center', flex: 1, gap: 3 },
  iconWrap: { width: 42, height: 36, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.mint, borderWidth: 1, borderColor: 'rgba(134,169,157,.18)', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) },
  label: { fontSize: 10, color: '#7B8884', fontWeight: '600' },
  labelActive: { color: colors.sageDark, fontWeight: '800' }
});
