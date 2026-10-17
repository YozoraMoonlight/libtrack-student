import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BookOpen, Eye, EyeOff, Hash, Lock, Moon, Sun } from 'lucide-react-native';
import { useAuth } from '../auth/AuthContext';
import { Button, FormMessage, TextField } from '../components/ui';
import { radius, space, useTheme } from '../theme';

export function LoginScreen({ navigation }: { navigation: any }) {
  const { c, isDark, toggleTheme } = useTheme();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = identifier.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    const message = await login(identifier.trim(), password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: c.paper }]}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={toggleTheme}
            style={[styles.iconButton, { backgroundColor: c.surface, borderColor: c.line }]}>
            {isDark ? <Sun size={18} color={c.inkSoft} /> : <Moon size={18} color={c.inkSoft} />}
          </Pressable>
        </View>

        <View style={styles.brand}>
          <View style={[styles.tile, { backgroundColor: c.ink }]}>
            <BookOpen size={30} color={c.amber} strokeWidth={2} />
          </View>
          <Text style={[styles.wordmark, { color: c.ink }]}>LIBTRACK</Text>
          <Text style={[styles.kicker, { color: c.ember }]}>STUDENT LIBRARY</Text>
          <Text style={[styles.lede, { color: c.inkSoft }]}>
            Sign in with the email or LRN on your school record.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={styles.form}>
            <TextField
              label="Email or LRN"
              placeholder="you@example.com or 123456789012"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              value={identifier}
              onChangeText={setIdentifier}
              leading={<Hash size={18} color={c.inkFaint} />}
            />

            <TextField
              label="Password"
              placeholder="Enter your password"
              autoCapitalize="none"
              secureTextEntry={!visible}
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              leading={<Lock size={18} color={c.inkFaint} />}
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={visible ? 'Hide password' : 'Show password'}
                  onPress={() => setVisible((value) => !value)}
                  hitSlop={8}>
                  {visible ? <EyeOff size={18} color={c.inkFaint} /> : <Eye size={18} color={c.inkFaint} />}
                </Pressable>
              }
            />

            {error ? <FormMessage>{error}</FormMessage> : null}

            <Button label="Sign in" onPress={submit} busy={busy} disabled={!canSubmit} style={{ marginTop: space.xs }} />
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Register')} style={styles.footerLink}>
          <Text style={[styles.footerText, { color: c.inkSoft }]}>New here?</Text>
          <Text style={[styles.footerAction, { color: c.ember }]}>Create an account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space.xxl },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { alignItems: 'center', gap: 6, marginTop: space.lg, marginBottom: space.sm },
  tile: { width: 62, height: 62, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontSize: 30, fontWeight: '900', letterSpacing: -1.1, marginTop: space.sm },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 2.4 },
  lede: { fontSize: 14, textAlign: 'center', maxWidth: 300, marginTop: space.sm, lineHeight: 20 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: space.lg },
  form: { gap: space.lg },
  footerLink: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: space.sm },
  footerText: { fontSize: 14 },
  footerAction: { fontSize: 14, fontWeight: '700' },
});
