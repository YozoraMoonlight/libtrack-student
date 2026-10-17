import AsyncStorage from '@react-native-async-storage/async-storage';
import { isConnectionError, requestReturn } from '../api/client';

const KEY = 'libtrack_outbox_v1';

export type QueuedReturn = {
  transaction_id?: number | string;
  scanned_qr?: string;
  queued_at: string;
};

async function read(): Promise<QueuedReturn[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedReturn[]) : [];
  } catch {
    return [];
  }
}

async function write(items: QueuedReturn[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Nothing to do if the queue cannot be persisted.
  }
}

export async function queueReturnRequest(payload: Omit<QueuedReturn, 'queued_at'>): Promise<void> {
  const items = await read();
  items.push({ ...payload, queued_at: new Date().toISOString() });
  await write(items);
}

export async function pendingCount(): Promise<number> {
  return (await read()).length;
}

/** FIFO flush. The server is truth: its duplicate guard wins. */
export async function flushOutbox(): Promise<number> {
  const items = await read();
  if (items.length === 0) return 0;

  const remaining: QueuedReturn[] = [];

  for (const item of items) {
    try {
      await requestReturn({ transaction_id: item.transaction_id, scanned_qr: item.scanned_qr });
    } catch (error) {
      // Keep this item and everything after it; stop on the first failure.
      if (isConnectionError(error)) {
        remaining.push(item);
        continue;
      }
      // A server-side rejection (already returned, not borrowed) is dropped.
    }
  }

  await write(remaining);
  return remaining.length;
}
