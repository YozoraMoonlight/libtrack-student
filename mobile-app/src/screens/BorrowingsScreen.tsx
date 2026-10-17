import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, RotateCcw } from 'lucide-react-native';
import {
  useBorrowings,
  useReturnRequest,
  type BorrowingsProps,
  type LiveBook,
  type LiveBorrowing,
} from '../api/hooks';
import { Button, FormMessage } from '../components/ui';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../components/cards';
import { radius, space, useTheme } from '../theme';
import { daysUntil, formatShortDate } from '../utils/format';

type Stage = 'idle' | 'busy' | 'done' | 'queued' | 'error';

export function BorrowingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useBorrowings();
  const returnRequest = useReturnRequest();

  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [target, setTarget] = useState<LiveBorrowing | null>(null);

  const props = data as BorrowingsProps | undefined;
  const rows = (props?.borrowings?.data ?? []) as LiveBorrowing[];

  const askReturn = (row: LiveBorrowing) => {
    setTarget(row);
    setStage('idle');
    setMessage(null);
  };

  const submitReturn = async () => {
    if (!target) return;
    setStage('busy');
    setMessage(null);
    try {
      const result = await returnRequest.mutateAsync({ transaction_id: target.id });
      if (result && (result as { queued?: boolean }).queued) {
        setStage('queued');
        setMessage('Saved offline. We will send it when you reconnect.');
      } else {
        setStage('done');
        setMessage(result?.message ?? 'Return requested. The librarian has been notified.');
      }
    } catch (error) {
      setStage('error');
      setMessage((error as { message?: string }).message ?? 'Could not send the return request.');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.paper }]}>
      <View style={{ paddingTop: space.sm }}>
        <ScreenHeader
          title="My Borrowings"
          subtitle={isLoading ? 'Loading your loans…' : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={<RefreshControl refreshing={isLoading && !isError} onRefresh={() => refetch()} tintColor={c.inkFaint} />}>
        {message ? (
          <FormMessage tone={stage === 'error' ? 'error' : 'success'}>{message}</FormMessage>
        ) : null}

        {rows.length === 0 && !isLoading ? (
          <EmptyState
            title="Nothing borrowed yet"
            message={isError ? 'Could not load your borrowings. Pull down to retry.' : 'Books you borrow will appear here.'}
          />
        ) : null}

        {rows.map((row) => {
          const book: Partial<LiveBook> = row.book ?? {};
          const title = String(book.title ?? 'Untitled');
          const days = daysUntil(row.due_date);
          const overdue = days !== null && days < 0 && !row.returned_at;
          const requested = Boolean(row.return_requested_at);
          const canRequest = !row.returned_at && !requested;

          return (
            <Card key={String(row.id)} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.title, { color: c.ink }]} numberOfLines={2}>
                    {title}
                  </Text>
                  {book.author ? (
                    <Text style={[styles.author, { color: c.inkSoft }]} numberOfLines={1}>
                      {book.author}
                    </Text>
                  ) : null}
                </View>
                <StatusBadge status={row.returned_at ? 'Returned' : overdue ? 'Overdue' : String(row.status ?? 'Borrowed')} />
              </View>

              <View style={styles.dates}>
                <View style={styles.dateItem}>
                  <Text style={[styles.dateLabel, { color: c.inkFaint }]}>Borrowed</Text>
                  <Text style={[styles.dateValue, { color: c.inkSoft }]}>{formatShortDate(row.borrowed_at)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Text style={[styles.dateLabel, { color: c.inkFaint }]}>Due</Text>
                  <View style={styles.dueRow}>
                    <Clock size={13} color={overdue ? c.danger : c.inkFaint} />
                    <Text style={[styles.dateValue, { color: overdue ? c.danger : c.inkSoft }]}>
                      {formatShortDate(row.due_date)}
                    </Text>
                  </View>
                </View>
              </View>

              {requested ? (
                <Text style={[styles.requested, { color: c.success }]}>
                  Return requested{row.return_requested_method ? ` · ${row.return_requested_method}` : ''}
                </Text>
              ) : null}

              {canRequest ? (
                <Button
                  label="Request return"
                  onPress={() => askReturn(row)}
                  variant="ghost"
                  icon={<RotateCcw size={16} color={c.ink} />}
                />
              ) : null}
            </Card>
          );
        })}

        {target ? (
          <Card style={[styles.confirm, { backgroundColor: c.cream, borderColor: c.line }]}>
            <Text style={[styles.confirmTitle, { color: c.ink }]}>Request this return?</Text>
            <Text style={[styles.confirmBody, { color: c.inkSoft }]}>
              {String(target.book?.title ?? 'This book')} will be marked as awaiting return at the counter.
            </Text>
            <View style={styles.confirmActions}>
              <Button
                label="Cancel"
                variant="ghost"
                style={{ flex: 1 }}
                onPress={() => {
                  setTarget(null);
                  setStage('idle');
                }}
              />
              <Button
                label="Confirm"
                style={{ flex: 1 }}
                busy={stage === 'busy'}
                onPress={submitReturn}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  card: { gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  author: { fontSize: 13 },
  dates: { flexDirection: 'row', gap: space.xl },
  dateItem: { gap: 2 },
  dateLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  dateValue: { fontSize: 13, fontWeight: '600' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requested: { fontSize: 12, fontWeight: '700' },
  confirm: { borderRadius: radius.lg, borderWidth: 1, gap: space.sm, marginTop: space.sm },
  confirmTitle: { fontSize: 15, fontWeight: '800' },
  confirmBody: { fontSize: 13, lineHeight: 18 },
  confirmActions: { flexDirection: 'row', gap: space.md, marginTop: space.xs },
});
