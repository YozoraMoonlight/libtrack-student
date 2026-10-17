import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Moon, Sun, UserRound } from 'lucide-react-native';
import { updatePassword, updateProfile } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, FormMessage, TextField } from '../components/ui';
import { Card, ScreenHeader } from '../components/cards';
import { radius, space, useTheme } from '../theme';
import { initialsOf } from '../utils/format';
import { pendingCount } from '../offline/outbox';

export function SettingsScreen() {
  const { c, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuth();
  const client = useQueryClient();

  const [name, setName] = useState(user?.name ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  useEffect(() => {
    void pendingCount().then(setQueued);
  }, []);

  const saveProfile = async () => {
    setBusy(true);
    setProfileMsg(null);
    try {
      const result = await updateProfile(name.trim());
      setUser({ ...(user ?? { name: name.trim(), email: '' }), name: result.name ?? name.trim() });
      setProfileMsg('Profile updated.');
    } catch (error) {
      setProfileMsg((error as { message?: string }).message ?? 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (next !== confirm) {
      setPasswordMsg('Those passwords do not match.');
      return;
    }
    setBusy(true);
    setPasswordMsg(null);
    try {
      await updatePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      setPasswordMsg('Password changed.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (error) {
      setPasswordMsg((error as { message?: string }).message ?? 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    client.clear();
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.paper }}
      contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 96 }]}
      keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Settings" subtitle="Your account and app preferences." />

      <Card style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: c.ink }]}>
          <Text style={styles.avatarText}>{initialsOf(user?.name ?? 'Student')}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.identityName, { color: c.ink }]} numberOfLines={1}>
            {user?.name ?? 'Student'}
          </Text>
          <Text style={[styles.identityMeta, { color: c.inkSoft }]} numberOfLines={1}>
            {user?.email ?? '—'}
          </Text>
          {user?.lrn || user?.student_id ? (
            <Text style={[styles.identityMeta, { color: c.inkFaint }]}>LRN {user?.lrn ?? user?.student_id}</Text>
          ) : null}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.headRow}>
          <UserRound size={18} color={c.inkSoft} />
          <Text style={[styles.cardTitle, { color: c.ink }]}>Profile</Text>
        </View>
        <TextField label="Display name" value={name} onChangeText={setName} autoCapitalize="words" />
        {profileMsg ? <FormMessage tone={profileMsg.includes('updated') ? 'success' : 'error'}>{profileMsg}</FormMessage> : null}
        <Button label="Save profile" onPress={saveProfile} busy={busy} disabled={name.trim().length === 0} />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.ink }]}>Change password</Text>
        <TextField
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextField label="New password" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" />
        <TextField
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
        />
        {passwordMsg ? (
          <FormMessage tone={passwordMsg.includes('changed') ? 'success' : 'error'}>{passwordMsg}</FormMessage>
        ) : null}
        <Button
          label="Update password"
          onPress={savePassword}
          busy={busy}
          disabled={current.length === 0 || next.length < 8}
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.headRow}>
          {isDark ? <Sun size={18} color={c.inkSoft} /> : <Moon size={18} color={c.inkSoft} />}
          <Text style={[styles.cardTitle, { color: c.ink }]}>Appearance</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isDark }}
          onPress={toggleTheme}
          style={[styles.toggleRow, { backgroundColor: c.cream, borderColor: c.line }]}>
          <Text style={[styles.toggleLabel, { color: c.ink }]}>Dark mode</Text>
          <View style={[styles.switchTrack, { backgroundColor: isDark ? c.ink : c.line }]}>
            <View style={[styles.switchThumb, { backgroundColor: isDark ? c.paper : c.surface, alignSelf: isDark ? 'flex-end' : 'flex-start' }]} />
          </View>
        </Pressable>
      </Card>

      {queued > 0 ? (
        <Card style={[styles.card, { backgroundColor: c.cream }]}>
          <Text style={[styles.cardTitle, { color: c.ink }]}>{queued} queued return request{queued === 1 ? '' : 's'}</Text>
          <Text style={[styles.queuedHint, { color: c.inkSoft }]}>
            These will send automatically when you are back online.
          </Text>
        </Card>
      ) : null}

      <Button label="Sign out" onPress={signOut} variant="ghost" icon={<LogOut size={16} color={c.danger} />} />

      <Text style={[styles.footer, { color: c.inkFaint }]}>LIBTRACK Student · native app</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: space.sm, gap: space.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: { width: 54, height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 19, fontWeight: '800' },
  identityName: { fontSize: 17, fontWeight: '800' },
  identityMeta: { fontSize: 12 },
  card: { gap: space.md },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  switchTrack: { width: 46, height: 26, borderRadius: radius.pill, padding: 3, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: radius.pill },
  queuedHint: { fontSize: 12, lineHeight: 17 },
  footer: { textAlign: 'center', fontSize: 11, paddingTop: space.sm },
});
