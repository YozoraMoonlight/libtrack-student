import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme, radius, space } from '../theme';

type FieldProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({ label, error, hint, leading, trailing, containerStyle, style, ...props }: FieldProps) {
  const { c } = useTheme();

  return (
    <View style={[{ gap: space.xs }, containerStyle]}>
      {label ? <Text style={[styles.label, { color: c.inkSoft }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: c.surface, borderColor: error ? c.danger : c.line },
        ]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          placeholderTextColor={c.inkFaint}
          {...props}
          style={[
            styles.input,
            { color: c.ink },
            leading ? { paddingLeft: 0 } : null,
            style,
          ]}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? <Text style={[styles.hint, { color: c.danger }]}>{error}</Text> : null}
      {!error && hint ? <Text style={[styles.hint, { color: c.inkFaint }]}>{hint}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress(): void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'quiet';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, busy, disabled, variant = 'primary', icon, style }: ButtonProps) {
  const { c } = useTheme();
  const off = disabled || busy;

  const background =
    variant === 'primary' ? (off ? c.inkFaint : c.ink) : variant === 'ghost' ? 'transparent' : c.cream;
  const foreground = variant === 'primary' ? c.paper : c.ink;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: pressed ? 0.82 : 1 },
        variant === 'ghost' ? { borderWidth: 1, borderColor: c.line } : null,
        style,
      ]}>
      {busy ? <ActivityIndicator size="small" color={foreground} /> : icon}
      <Text style={[styles.buttonLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function FormMessage({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: React.ReactNode }) {
  const { c } = useTheme();
  const color = tone === 'error' ? c.danger : tone === 'success' ? c.success : c.inkSoft;

  return (
    <View style={[styles.message, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <Text style={[styles.messageText, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, marginLeft: 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    minHeight: 52,
    gap: space.sm,
  },
  leading: { marginRight: 2 },
  trailing: { marginLeft: 2 },
  input: { flex: 1, fontSize: 15, paddingVertical: space.md },
  hint: { fontSize: 12, marginLeft: 2 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: space.lg,
  },
  buttonLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  message: { borderRadius: radius.md, borderWidth: 1, padding: space.md },
  messageText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
