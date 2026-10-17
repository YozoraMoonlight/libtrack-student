import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, QrCode as QrIcon } from 'lucide-react-native';
import { useDashboard } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Card, PressableCard, QrTile, ScreenHeader, StatTile, StatusBadge } from '../components/cards';
import { radius, space, useTheme } from '../theme';
import { formatShortDate, formatPeso } from '../utils/format';

type Row = Record<string, unknown>;

function readBook(row: Row): { title: string; author: string } {
  const book = (row.book ?? {}) as { title?: string; author?: string };
  return {
    title: String(book.title ?? (row.book_title as string) ?? 'Untitled'),
    author: String(book.author ?? (row.book_author as string) ?? ''),
  };
}

export function DashboardScreen({ navigation }: { navigation: any }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const [qrOpen, setQrOpen] = useState(false);

  const firstName = (user?.name ?? data?.user?.name ?? 'there').split(' ')[0];
  const upcoming = (data?.upcomingDue ?? []) as Row[];
  const recent = (data?.recentActivity ?? []) as Row[];

  return (
    <ScrollView
      style={{ backgroundColor: c.paper }}
      contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 96 }]}
      refreshControl={<RefreshControl refreshing={isLoading && !isError} onRefresh={() => refetch()} tintColor={c.inkFaint} />}>
      <ScreenHeader title={`Hi, ${firstName}`} subtitle="Welcome back to your library." />

      {isError ? (
        <View style={styles.pad}>
          <Card>
            <Text style={[styles.errorTitle, { color: c.danger }]}>Could not load your dashboard</Text>
            <Text style={[styles.errorBody, { color: c.inkSoft }]}>
              {(error as { message?: string })?.message ?? 'Check your connection and try again.'}
            </Text>
          </Card>
        </View>
      ) : null}

      {qrOpen && data ? (
        <View style={styles.pad}>
          <Card style={{ alignItems: 'center', gap: space.md }}>
            <Text style={[styles.qrHeading, { color: c.ink }]}>Your library QR</Text>
            {data.qrCode ? (
              <QrTile value={String(data.qrCode)} size={168} />
            ) : (
              <Text style={[styles.errorBody, { color: c.inkSoft }]}>No QR code is issued yet.</Text>
            )}
            <Text style={[styles.qrMeta, { color: c.inkSoft }]}>LRN {user?.lrn ?? user?.student_id ?? '—'}</Text>
          </Card>
        </View>
      ) : data ? (
        <View style={styles.pad}>
          <PressableCard onPress={() => setQrOpen((open) => !open)}>
            <View style={[styles.qrCard, { backgroundColor: c.ink }]}>
              <View style={styles.qrCardText}>
                <Text style={styles.qrCardLabel}>LIBRARY CARD</Text>
                <Text style={styles.qrCardName} numberOfLines={1}>
                  {user?.name ?? data.user?.name ?? ''}
                </Text>
                <Text style={styles.qrCardLrn}>LRN {user?.lrn ?? user?.student_id ?? '—'}</Text>
              </View>
              <View style={styles.qrCardIcon}>
                {data.qrCode ? <QrTile value={String(data.qrCode)} size={72} /> : <QrIcon size={30} color="#ffffff" />}
              </View>
            </View>
          </PressableCard>
        </View>
      ) : null}

      {data ? (
        <View style={[styles.pad, styles.stats]}>
          <StatTile label="Active" value={data.stats.activeBorrows} tone={c.ember} />
          <StatTile label="Borrowed" value={data.stats.totalBorrowed} />
          <StatTile
            label="Unpaid"
            value={formatPeso(data.stats.unpaidFines)}
            tone={data.stats.unpaidFines > 0 ? c.danger : c.success}
          />
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <View style={styles.pad}>
          <Text style={[styles.sectionTitle, { color: c.ink }]}>Due soon</Text>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {upcoming.slice(0, 3).map((row, index) => {
              const book = readBook(row);
              const due = String(row.due_date ?? '');
              return (
                <PressableCard key={String(row.id ?? index)} onPress={() => navigation.navigate('Borrowings')}>
                  <Card style={styles.row}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.rowTitle, { color: c.ink }]} numberOfLines={1}>
                        {book.title}
                      </Text>
                      <View style={styles.rowMeta}>
                        <Clock size={13} color={c.inkFaint} />
                        <Text style={[styles.rowMetaText, { color: c.inkSoft }]}>
                          Due {due ? formatShortDate(due) : '—'}
                        </Text>
                      </View>
                    </View>
                    <StatusBadge status={String(row.status ?? 'Borrowed')} />
                  </Card>
                </PressableCard>
              );
            })}
          </View>
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View style={styles.pad}>
          <Text style={[styles.sectionTitle, { color: c.ink }]}>Recent activity</Text>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {recent.slice(0, 5).map((row, index) => {
              const book = readBook(row);
              return (
                <PressableCard key={String(row.id ?? index)} onPress={() => navigation.navigate('Borrowings')}>
                  <Card style={styles.row}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.rowTitle, { color: c.ink }]} numberOfLines={1}>
                        {book.title}
                      </Text>
                      <Text style={[styles.rowMetaText, { color: c.inkFaint }]}>
                        {String(row.borrowed_at ?? row.returned_at ?? '').slice(0, 10)}
                      </Text>
                    </View>
                    <StatusBadge status={String(row.status ?? 'Borrowed')} />
                  </Card>
                </PressableCard>
              );
            })}
          </View>
        </View>
      ) : null}

      {!isLoading && !isError && !data ? (
        <View style={styles.pad}>
          <Card>
            <Text style={[styles.errorBody, { color: c.inkSoft }]}>No dashboard data yet.</Text>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: space.sm, gap: space.lg },
  pad: { paddingHorizontal: space.lg },
  stats: { flexDirection: 'row', gap: space.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  qrCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderRadius: radius.xl, padding: space.lg },
  qrCardText: { flex: 1, gap: 4 },
  qrCardLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  qrCardName: { color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  qrCardLrn: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  qrCardIcon: { alignItems: 'center', justifyContent: 'center' },
  qrHeading: { fontSize: 17, fontWeight: '800' },
  qrMeta: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaText: { fontSize: 12 },
  errorTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  errorBody: { fontSize: 13, lineHeight: 19 },
});
