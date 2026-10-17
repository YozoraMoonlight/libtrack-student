import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useBookQr, type LiveBook } from '../api/hooks';
import { Button } from '../components/ui';
import { QrTile, StatusBadge } from '../components/cards';
import { radius, space, useTheme } from '../theme';

export function BookDetailScreen({ book, onClose }: { book: LiveBook; onClose(): void }) {
  const { c } = useTheme();
  const [showQr, setShowQr] = useState(true);
  const { data: qr, isLoading: qrLoading } = useBookQr(showQr ? book.id : null);

  const available = Number(book.available_copies ?? 0);
  const totalCopies = Number(book.total_copies ?? 0);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.paper, borderColor: c.line }]}>
        <View style={[styles.grabber, { backgroundColor: c.line }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: c.ink }]} numberOfLines={2}>
            {book.title ?? 'Untitled'}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
            <X size={20} color={c.inkSoft} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.metaRow}>
            <StatusBadge status={available > 0 ? 'Available' : 'Borrowed'} />
            {book.category?.name ? <Text style={[styles.meta, { color: c.inkSoft }]}>{book.category.name}</Text> : null}
          </View>

          {book.author ? <Text style={[styles.author, { color: c.inkSoft }]}>{book.author}</Text> : null}

          <View style={styles.facts}>
            <Fact label="Available" value={`${available} of ${totalCopies}`} />
            {book.isbn ? <Fact label="ISBN" value={String(book.isbn)} /> : null}
            {book.accession_number ? <Fact label="Accession" value={String(book.accession_number)} /> : null}
          </View>

          <View style={styles.qrSection}>
            <Text style={[styles.qrHeading, { color: c.ink }]}>Book QR</Text>
            {qrLoading ? (
              <Text style={[styles.meta, { color: c.inkFaint }]}>Loading QR…</Text>
            ) : qr ? (
              <QrTile value={qr} size={168} />
            ) : (
              <Text style={[styles.meta, { color: c.inkFaint }]}>No QR code available for this title.</Text>
            )}
            <Text style={[styles.hint, { color: c.inkFaint }]}>Scan this at the return counter to request a return.</Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: c.line }]}>
          <Button label="Close" onPress={onClose} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[styles.factLabel, { color: c.inkFaint }]}>{label}</Text>
      <Text style={[styles.factValue, { color: c.ink }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    paddingTop: space.sm,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.lg },
  title: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  body: { padding: space.lg, gap: space.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: { fontSize: 13 },
  author: { fontSize: 14 },
  facts: { gap: space.sm },
  fact: { borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: 2 },
  factLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  factValue: { fontSize: 14, fontWeight: '700' },
  qrSection: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  qrHeading: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 12, textAlign: 'center' },
  footer: { borderTopWidth: 1, padding: space.lg },
});
