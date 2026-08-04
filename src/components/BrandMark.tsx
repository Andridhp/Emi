import { Image, StyleSheet, View } from 'react-native';

const temporaryLogoB = require('../../assets/brand/emilia-logo-b-v2-girl-alpha.png');

export function BrandMark({ size = 38, light = false }: { size?: number; light?: boolean }) {
  return <View accessibilityLabel="Emi" style={[styles.mark, { width: size, height: size, borderRadius: size * .36 }, light && styles.light]}>
    <Image source={temporaryLogoB} resizeMode="contain" style={{ width: size * 1.18, height: size * 1.18 }} />
  </View>;
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
  light: { backgroundColor: 'rgba(255,255,255,.92)' }
});
