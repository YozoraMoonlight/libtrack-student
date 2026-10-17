import { ApiError, isConnectionError, requestReturn } from '../api/laravel';

export type ReturnPayload = { transaction_id?: number; scanned_qr?: string };
export type QueuedReturn = ReturnPayload & { id: string; queuedAt: string };

function key(userId: number | string): string {
  return `libtrack:outbox:${userId}`;
}

function read(userId: number | string): QueuedReturn[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as QueuedReturn[]) : [];
  } catch {
    return [];
  }
}

function write(userId: number | string, items: QueuedReturn[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(items));
  } catch {
    // Queue persistence is best effort when storage is unavailable.
  }
}

export function enqueueReturn(userId: number | string, payload: ReturnPayload): void {
  const items = read(userId);
  const id = payload.transaction_id ? `transaction:${payload.transaction_id}` : `qr:${payload.scanned_qr || ''}`;
  const next = items.filter((item) => item.id !== id);
  next.push({ ...payload, id, queuedAt: new Date().toISOString() });
  write(userId, next);
}

export function pendingReturnCount(userId: number | string): number {
  return read(userId).length;
}

export async function flushReturns(userId: number | string): Promise<{ sent: number; remaining: number; failed: number }> {
  const items = read(userId);
  if (!items.length) return { sent: 0, remaining: 0, failed: 0 };

  const remaining: QueuedReturn[] = [];
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await requestReturn({ transaction_id: item.transaction_id, scanned_qr: item.scanned_qr });
      sent += 1;
    } catch (error: unknown) {
      if (isConnectionError(error) || error instanceof TypeError) {
        remaining.push(item);
        break;
      }
      // A server validation/conflict response will not improve by retrying
      // forever; drop it from the outbox and let the UI refresh truth.
      if (error instanceof ApiError) failed += 1;
      else remaining.push(item);
    }
  }

  write(userId, remaining);
  return { sent, remaining: remaining.length, failed };
}
