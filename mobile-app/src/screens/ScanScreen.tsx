import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraOff, Keyboard, ScanLine } from 'lucide-react-native';
import { useReturnRequest } from '../api/hooks';
import { Button, FormMessage, TextField } from '../components/ui';
import { Card, ScreenHeader } from '../components/cards';
import { radius, space, useTheme } from '../theme';

export function ScanScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'error' | 'success' | 'info'>('info');
  const [busy, setBusy] = useState(false);
  const returnRequest = useReturnRequest();

  const submit = useCallback(
    async (value: string) => {
      const payload = value.trim();
      if (!payload || busy) return;

      setBusy(true);
      setMessage(null);

      try {
        const result = await returnRequest.mutateAsync({ scanned_qr: payload });
        if ((result as { queued?: boolean }).queued) {
          setTone('info');
          setMessage('Saved offline. We will send it when you reconnect.');
        } else {
          setTone('success');
          setMessage(result?.message ?? 'Return requested. The librarian has been notified.');
        }
        setManual('');
      } catch (error) {
        setTone('error');
        setMessage((error as { message?: string }).message ?? 'Could not send the return request.');
      } finally {
        setBusy(false);
      }
    },
    [busy, returnRequest],
  );

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (!scanning) return;
      setScanning(false);
      void submit(data);
    },
    [scanning, submit],
  );

  if (!permission) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: c.paper }]}>
        <Text style={{ color: c.inkSoft }}>Preparing camera…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.paper }}
      contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 96 }]}
      keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Scan to return" subtitle="Point the camera at the book QR code." />

      <Card style={styles.viewer}>
        {permission.granted ? (
          <>
            <View style={styles.viewport}>
              {scanning ? (
                <>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={handleScan}
                  />
                  <View style={styles.frame} pointerEvents="none" />
                </>
              ) : (
                <View style={[styles.placeholder, { backgroundColor: c.cream }]}>
                  <ScanLine size={28} color={c.inkSoft} />
                  <Text style={[styles.placeholderText, { color: c.inkSoft }]}>Code captured</Text>
                </View>
              )}
            </View>

            {scanning ? (
              <Button label="Stop scanning" variant="ghost" onPress={() => setScanning(false)} />
            ) : (
              <Button label="Scan again" onPress={() => setScanning(true)} />
            )}
          </>
        ) : (
          <View style={styles.permission}>
            <CameraOff size={26} color={c.inkSoft} />
            <Text style={[styles.permissionText, { color: c.inkSoft }]}>
              Camera access is needed to scan book QR codes.
            </Text>
            <Button label="Allow camera" onPress={() => requestPermission()} />
          </View>
        )}
      </Card>

      {message ? <FormMessage tone={tone}>{message}</FormMessage> : null}

      <Card style={styles.manual}>
        <View style={styles.manualHead}>
          <Keyboard size={18} color={c.inkSoft} />
          <Text style={[styles.manualTitle, { color: c.ink }]}>Enter code manually</Text>
        </View>
        <TextField
          placeholder="Paste the code under the QR"
          value={manual}
          onChangeText={setManual}
          autoCapitalize="none"
          returnKeyType="send"
          onSubmitEditing={() => submit(manual)}
        />
        <Button
          label="Request return"
          busy={busy}
          disabled={manual.trim().length === 0}
          onPress={() => submit(manual)}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  page: { paddingTop: space.sm, gap: space.lg },
  viewer: { gap: space.md },
  viewport: { height: 260, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000000' },
  frame: {
    position: 'absolute',
    top: '18%',
    left: '14%',
    right: '14%',
    bottom: '18%',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'rgba(251,146,60,0.9)',
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  placeholderText: { fontSize: 13, fontWeight: '600' },
  permission: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  permissionText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  manual: { gap: space.md },
  manualHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  manualTitle: { fontSize: 15, fontWeight: '800' },
});
