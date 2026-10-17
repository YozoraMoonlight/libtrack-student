import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, AtSign, Eye, EyeOff, Hash, Lock, Phone, Search, UserRoundCheck } from 'lucide-react-native';
import {
  cancelRegistration,
  initiateRegistration,
  isConnectionError,
  lookupLrn,
  resendRegistrationOtp,
  verifyRegistration,
  type RegistrationLookup,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, FormMessage, TextField } from '../components/ui';
import { radius, space, useTheme } from '../theme';

type Stage = 'lookup' | 'details' | 'otp';

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { c } = useTheme();
  const { setUser } = useAuth();

  const [stage, setStage] = useState<Stage>('lookup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [lrn, setLrn] = useState('');
  const [student, setStudent] = useState<RegistrationLookup | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');

  const fail = (e: unknown, fallback: string) => {
    if (isConnectionError(e)) {
      setError('No connection to the LIBTRACK server. Check your internet and try again.');
      return;
    }
    const message = (e as { message?: string }).message;
    setError(message && !message.startsWith('ApiError') ? message : fallback);
  };

  const runLookup = async () => {
    if (lrn.trim().length < 4) {
      setError('Enter the 12-digit LRN from your school record.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const found = await lookupLrn(lrn.trim());
      setStudent(found);
      setStage('details');
    } catch (e) {
      fail(e, 'We could not find that LRN.');
    } finally {
      setBusy(false);
    }
  };

  const initiate = async () => {
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const pending = await initiateRegistration({
        lrn: lrn.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        password_confirmation: confirm,
      });
      setPhoneMasked(pending?.phone_masked ?? '');
      setInfo(`Verification code sent to ${pending?.phone_masked ?? 'your phone'}.`);
      setStage('otp');
    } catch (e) {
      fail(e, 'We could not start your registration.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 4) {
      setError('Enter the code we sent you.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await verifyRegistration({
        code: code.trim(),
        lrn: lrn.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        password_confirmation: confirm,
      });
      if (user && user.name) setUser(user);
    } catch (e) {
      fail(e, 'That code did not work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      const pending = await resendRegistrationOtp({ lrn: lrn.trim(), phone: phone.trim() });
      setInfo(`New code sent to ${pending?.phone_masked ?? phoneMasked}.`);
    } catch (e) {
      fail(e, 'We could not resend the code.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelRegistration();
    } catch {
      // Leaving the pending record behind is harmless.
    }
    setStage('details');
    setCode('');
    setInfo(null);
    setError(null);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: c.paper }]}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowLeft size={18} color={c.inkSoft} />
          <Text style={[styles.backText, { color: c.inkSoft }]}>Back</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={[styles.title, { color: c.ink }]}>Create account</Text>
          <Text style={[styles.step, { color: c.inkSoft }]}>
            {stage === 'lookup'
              ? 'Step 1 of 3 — find your LRN.'
              : stage === 'details'
                ? 'Step 2 of 3 — set your sign-in details.'
                : `Step 3 of 3 — enter the code sent to ${phoneMasked || 'your phone'}.`}
          </Text>
        </View>

        {error ? <FormMessage>{error}</FormMessage> : null}
        {info ? <FormMessage tone="success">{info}</FormMessage> : null}

        {stage === 'lookup' ? (
          <View style={styles.form}>
            <TextField
              label="LRN"
              placeholder="12-digit LRN"
              keyboardType="number-pad"
              value={lrn}
              onChangeText={setLrn}
              leading={<Hash size={18} color={c.inkFaint} />}
            />
            <Button
              label="Find my record"
              onPress={runLookup}
              busy={busy}
              icon={<Search size={17} color={c.paper} />}
            />
          </View>
        ) : null}

        {stage === 'details' ? (
          <View style={styles.form}>
            {student ? (
              <View style={[styles.found, { backgroundColor: `${c.success}14`, borderColor: `${c.success}44` }]}>
                <UserRoundCheck size={20} color={c.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.foundName, { color: c.ink }]}>{student.name}</Text>
                  <Text style={[styles.foundMeta, { color: c.inkSoft }]}>
                    {[student.school_name, student.grade_level, student.section].filter(Boolean).join(' · ') || 'School record found'}
                  </Text>
                </View>
              </View>
            ) : null}

            <TextField
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leading={<AtSign size={18} color={c.inkFaint} />}
            />

            <TextField
              label="Mobile number"
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              leading={<Phone size={18} color={c.inkFaint} />}
            />

            <TextField
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry={!visible}
              value={password}
              onChangeText={setPassword}
              leading={<Lock size={18} color={c.inkFaint} />}
              trailing={
                <Pressable accessibilityRole="button" onPress={() => setVisible((v) => !v)} hitSlop={8}>
                  {visible ? <EyeOff size={18} color={c.inkFaint} /> : <Eye size={18} color={c.inkFaint} />}
                </Pressable>
              }
            />

            <TextField
              label="Confirm password"
              placeholder="Re-enter your password"
              secureTextEntry={!visible}
              value={confirm}
              onChangeText={setConfirm}
              leading={<Lock size={18} color={c.inkFaint} />}
            />

            <Button label="Send verification code" onPress={initiate} busy={busy} />
          </View>
        ) : null}

        {stage === 'otp' ? (
          <View style={styles.form}>
            <TextField
              label="Verification code"
              placeholder="6-digit code"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              leading={<Hash size={18} color={c.inkFaint} />}
            />
            <Button label="Verify and sign in" onPress={verify} busy={busy} />
            <View style={styles.otpActions}>
              <Button label="Resend code" onPress={resend} busy={busy} variant="ghost" style={{ flex: 1 }} />
              <Button label="Start over" onPress={cancel} busy={busy} variant="ghost" style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        {busy && stage === 'otp' ? <ActivityIndicator color={c.inkFaint} style={{ marginTop: space.md }} /> : null}

        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
          <Text style={[styles.footerText, { color: c.inkSoft }]}>Already registered?</Text>
          <Text style={[styles.footerAction, { color: c.ember }]}>Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: space.xxl, paddingBottom: space.sm },
  backText: { fontSize: 15 },
  heading: { gap: 6 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.9 },
  step: { fontSize: 14, lineHeight: 20 },
  form: { gap: space.lg },
  found: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.md, padding: space.md },
  foundName: { fontSize: 15, fontWeight: '700' },
  foundMeta: { fontSize: 12 },
  otpActions: { flexDirection: 'row', gap: space.md },
  footerLink: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: space.sm },
  footerText: { fontSize: 14 },
  footerAction: { fontSize: 14, fontWeight: '700' },
});
