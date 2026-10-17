import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QrCode as QrIcon, Search, SearchX, X } from 'lucide-react-native';
import { useBooks, type BooksProps, type LiveBook } from '../api/hooks';
import { Card, EmptyState, PressableCard, ScreenHeader, StatusBadge } from '../components/cards';
import { TextField } from '../components/ui';
import { radius, space, useTheme } from '../theme';
import { BookDetailScreen } from './BookDetailScreen';

type Category = { id: string; name: string };

export function BooksScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<LiveBook | null>(null);

  const { data, isLoading, isError, refetch } = useBooks({ search: term, categoryId });
  const props = data as BooksProps | undefined;

  const categories = useMemo<Category[]>(() => {
    const list = props?.categories ?? [];
    return [{ id: '', name: 'All' }, ...list.map((item) => ({ id: String(item.id), name: item.name }))];
  }, [props?.categories]);

  const books = props?.books?.data ?? [];
  const total = props?.books?.total ?? books.length;
  const hasFilters = term.length > 0 || categoryId !== undefined;

  return (
    <View style={[styles.flex, { backgroundColor: c.paper }]}>
      <View style={{ paddingTop: space.sm }}>
        <ScreenHeader
          title="Browse Books"
          subtitle={isLoading ? 'Loading the catalog…' : `${total} ${total === 1 ? 'title' : 'titles'} available`}
        />
      </View>

      <View style={styles.controls}>
        <TextField
          placeholder="Search title, author, ISBN"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => setTerm(query.trim())}
          leading={<Search size={17} color={c.inkFaint} />}
          trailing={
            query ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(''); setTerm(''); }} hitSlop={8}>
                <X size={16} color={c.inkFaint} />
              </Pressable>
            ) : null
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {categories.map((item) => {
            const active = (categoryId ?? '') === item.id;
            return (
              <Pressable
                key={item.id || 'all'}
                accessibilityRole="button"
                onPress={() => setCategoryId(item.id === '' ? undefined : item.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.ink : c.surface,
                    borderColor: active ? c.ink : c.line,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? c.paper : c.inkSoft }]}>{item.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={<RefreshControl refreshing={isLoading && !isError} onRefresh={() => refetch()} tintColor={c.inkFaint} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              title="No books found"
              message={
                isError
                  ? 'Could not reach the catalog. Pull down to retry.'
                  : hasFilters
                    ? 'Try another title, author, or category.'
                    : 'No books are assigned to your school yet.'
              }
            />
          )
        }
        ListHeaderComponent={
          books.length > 0 ? (
            <Text style={[styles.resultCount, { color: c.inkFaint }]}>
              {books.length} {books.length === 1 ? 'result' : 'results'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const available = Number(item.available_copies ?? 0);
          const totalCopies = Number(item.total_copies ?? 0);
          return (
            <PressableCard onPress={() => setSelected(item)}>
              <Card style={styles.bookRow}>
                <View style={[styles.bookQr, { backgroundColor: '#ffffff', borderColor: c.line }]}>
                  <QrIcon size={22} color="#121212" />
                  <Text style={styles.bookQrText}>QR</Text>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.bookTitle, { color: c.ink }]} numberOfLines={2}>
                    {item.title ?? 'Untitled'}
                  </Text>
                  {item.author ? (
                    <Text style={[styles.bookAuthor, { color: c.inkSoft }]} numberOfLines={1}>
                      {item.author}
                    </Text>
                  ) : null}
                  {item.category?.name ? (
                    <Text style={[styles.bookCategory, { color: c.inkFaint }]}>{item.category.name}</Text>
                  ) : null}
                  <Text style={[styles.bookCopies, { color: c.inkSoft }]}>
                    {available} of {totalCopies} copies available
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <StatusBadge status={available > 0 ? 'Available' : 'Borrowed'} />
                </View>
              </Card>
            </PressableCard>
          );
        }}
      />

      {selected ? (
        <BookDetailScreen
          book={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md },
  chips: { gap: space.sm, paddingVertical: 2 },
  chip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  resultCount: { fontSize: 12, fontWeight: '600', marginBottom: space.xs },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  bookQr: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bookQrText: { fontSize: 9, fontWeight: '700', color: 'rgba(18,18,18,0.55)' },
  bookTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  bookAuthor: { fontSize: 13 },
  bookCategory: { fontSize: 11, fontWeight: '600' },
  bookCopies: { fontSize: 12, marginTop: 2 },
});
