import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBookQr,
  getBooks,
  getBorrowings,
  getDashboard,
  getFines,
  isConnectionError,
  requestReturn,
  type BooksProps,
  type BorrowingsProps,
  type DashboardProps,
  type FinesProps,
} from './client';
import { flushOutbox, queueReturnRequest } from '../offline/outbox';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 60_000,
  });
}

export function useBooks(options: { search?: string; categoryId?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['books', options.search ?? '', options.categoryId ?? '', options.page ?? 1],
    queryFn: () => getBooks(options),
    staleTime: 60_000,
  });
}

export function useBorrowings() {
  return useQuery({
    queryKey: ['borrowings'],
    queryFn: getBorrowings,
    staleTime: 30_000,
  });
}

export function useFines() {
  return useQuery({
    queryKey: ['fines'],
    queryFn: getFines,
    staleTime: 60_000,
  });
}

export function useBookQr(bookId: string | number | null) {
  return useQuery({
    queryKey: ['book-qr', String(bookId)],
    queryFn: () => getBookQr(bookId as string | number),
    enabled: bookId !== null,
    staleTime: 5 * 60_000,
  });
}

export function useReturnRequest() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { transaction_id?: number | string; scanned_qr?: string }) => {
      try {
        return await requestReturn(payload);
      } catch (error) {
        // Offline: queue it and flush on reconnect. The server dedupes.
        if (isConnectionError(error)) {
          await queueReturnRequest(payload);
          return { ok: true, queued: true } as { ok: boolean; queued?: boolean; message?: string };
        }
        throw error;
      }
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['borrowings'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
      await flushOutbox().catch(() => undefined);
      await client.invalidateQueries({ queryKey: ['borrowings'] });
    },
  });
}

export type {
  BooksProps,
  BorrowingsProps,
  DashboardProps,
  FinesProps,
  LiveBook,
  LiveBorrowing,
  LiveFine,
  Paginated,
  StudentUser,
} from './client';
