import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, radius, space } from '../theme';

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { c } = useTheme();

  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.headerTitle, { color: c.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: c.inkSoft }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { c } = useTheme();
  const key = status.toLowerCase();
  const tone =
    key.includes('overdue') || key.includes('unpaid') || key.includes('lost')
      ? c.danger
      : key.includes('return')
        ? c.amberDark
        : key.includes('borrow') || key.includes('active')
          ? c.ember
          : c.success;

  return (
    <View style={[styles.badge, { backgroundColor: `${tone}1F` }]}>
      <Text style={[styles.badgeText, { color: tone }]}>{status}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>
  );
}

export function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[styles.statValue, { color: tone ?? c.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.inkSoft }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[styles.emptyTitle, { color: c.ink }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: c.inkSoft }]}>{message}</Text>
    </View>
  );
}

export function QrTile({ value, size = 120 }: { value: string; size?: number }) {
  const { c } = useTheme();
  const isImage = value.startsWith('data:') || value.startsWith('http');

  return (
    <View style={[styles.qrTile, { backgroundColor: '#ffffff', borderColor: c.line }, { width: size + 20, height: size + 20 }]}>
      {isImage ? (
        <Image source={{ uri: value }} style={{ width: size, height: size }} resizeMode="contain" />
      ) : (
        <ValueQr value={value} size={size} />
      )}
    </View>
  );
}

/** SVG QR renderer; falls back to plain text if the module is unavailable. */
type QrProps = { value: string; size: number; color: string; backgroundColor: string };

function ValueQr({ value, size }: { value: string; size: number }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Qr = require('react-native-qrcode-svg').default as React.ComponentType<QrProps>;
    return <Qr value={value} size={size} color="#121212" backgroundColor="#ffffff" />;
  } catch {
    return <Text style={{ color: '#121212', fontSize: 11, textAlign: 'center' }}>{value}</Text>;
  }
}

export function PressableCard({ children, onPress }: { children: React.ReactNode; onPress(): void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  headerSubtitle: { fontSize: 14 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  stat: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  empty: { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyMessage: { fontSize: 13, textAlign: 'center' },
  qrTile: { borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
