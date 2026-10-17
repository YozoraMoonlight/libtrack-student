import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFines, type FinesProps, type LiveFine } from '../api/hooks';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../components/cards';
import { space, useTheme } from '../theme';
import { formatPeso, formatShortDate, toNumber } from '../utils/format';

export function FinesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useFines();

  const props = data as FinesProps | undefined;
  const rows = (props?.fines?.data ?? []) as LiveFine[];
  const totalUnpaid = props?.totalUnpaid ?? 0;

  return (
    <View style={[styles.flex, { backgroundColor: c.paper }]}>
      <View style={{ paddingTop: space.sm }}>
        <ScreenHeader title="My Fines" subtitle="Outstanding balances and payment history." />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={<RefreshControl refreshing={isLoading && !isError} onRefresh={() => refetch()} tintColor={c.inkFaint} />}>
        <Card style={[styles.summary, { backgroundColor: c.ink, borderColor: c.ink }]}>
          <Text style={styles.summaryLabel}>TOTAL UNPAID</Text>
          <Text style={styles.summaryValue}>{formatPeso(totalUnpaid)}</Text>
          {Number(totalUnpaid) > 0 ? (
            <Text style={styles.summaryHint}>Settle at the library counter to clear your record.</Text>
          ) : (
            <Text style={styles.summaryHint}>You are all clear. Nice work.</Text>
          )}
        </Card>

        {rows.length === 0 && !isLoading ? (
          <EmptyState
            title="No fines"
            message={isError ? 'Could not load your fines. Pull down to retry.' : 'Nothing owed on your account.'}
          />
        ) : null}

        {rows.map((fine) => {
          const amount = toNumber(fine.amount);
          const paid = toNumber(fine.paid_amount);
          const outstanding = amount - paid;
          const title = fine.transaction?.book?.title ?? 'Library charge';
          const type = fine.type ?? 'Fine';

          return (
            <Card key={String(fine.id)} style={styles.row}>
              <View style={styles.rowHead}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.rowTitle, { color: c.ink }]} numberOfLines={2}>
                    {title}
                  </Text>
                  <Text style={[styles.rowType, { color: c.inkSoft }]}>
                    {type}
                    {fine.description ? ` · ${fine.description}` : ''}
                  </Text>
                </View>
                <StatusBadge status={outstanding > 0 ? 'Unpaid' : 'Paid'} />
              </View>

              <View style={styles.rowFoot}>
                <Text style={[styles.rowDate, { color: c.inkFaint }]}>{formatShortDate(fine.created_at)}</Text>
                <View style={styles.amounts}>
                  {paid > 0 ? <Text style={[styles.rowPaid, { color: c.inkFaint }]}>{formatPeso(paid)} paid</Text> : null}
                  <Text style={[styles.rowAmount, { color: outstanding > 0 ? c.danger : c.success }]}>
                    {formatPeso(outstanding > 0 ? outstanding : amount)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  summary: { gap: 4, marginBottom: space.sm },
  summaryLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  summaryValue: { color: '#ffffff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  summaryHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  row: { gap: space.md },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  rowTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  rowType: { fontSize: 12 },
  rowFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowDate: { fontSize: 12 },
  amounts: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowPaid: { fontSize: 12, textDecorationLine: 'line-through' },
  rowAmount: { fontSize: 15, fontWeight: '800' },
});
