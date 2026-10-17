import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type LiveNotification,
} from '../api/laravel';
import { buildActivityNotifications, type ActivityEvent } from '../api/activityFeed';
import { postSystemNotification } from '../api/systemNotifications';
import { useLibraryData } from '../api/libraryData';
import { useAuth } from '../auth/AuthContext';
import type { AppNotification, NotificationKind } from '../types/notifications';

/**
 * Header bell backed by `GET notifications/feed`.
 *
 * The shape is intentionally defensive: the feed may answer as a bare array or
 * wrapped in `notifications`/`data`, and the read flag may arrive as a boolean or
 * as `read_at`. Marking read is optimistic — the badge updates immediately and
 * the request follows, because a tap should never feel slow.
 */

const KIND_BY_TYPE: Record<string, NotificationKind> = {
  due_reminder: 'borrow',
  overdue_notice: 'borrow',
  reservation_ready: 'borrow',
  fine_notice: 'fine',
  general: 'account',
  account: 'account',
  borrow: 'borrow',
  return: 'return',
  fine: 'fine',
  hold: 'hold',
};

/**
 * Dismissed ids, kept on the device.
 *
 * The server exposes no delete route for notifications — only feed, read and
 * read-all — so there is nothing to call when a student clears one. Dismissal is
 * therefore local: hidden ids are remembered so the list stays empty on the next
 * launch instead of springing the items back.
 */
const DISMISSED_KEY = 'libtrack:dismissed-notifications:v1';
const DISMISSED_LIMIT = 500;

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    if (ids.size === 0) window.localStorage.removeItem(DISMISSED_KEY);
    else window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].slice(-DISMISSED_LIMIT)));
  } catch {
    // Dismissals simply will not survive a restart if storage is unavailable.
  }
}

/**
 * Read state is kept on the device as well.
 *
 * Most of the bell is built from live circulation data rather than the server's
 * notification table, and there is no endpoint to mark those read. The local set
 * is what the UI trusts; the server call still happens for rows that came from
 * the real feed, so the two stay in step where they can.
 */
const READ_KEY = 'libtrack:read-notifications:v1';

/**
 * Ids already announced by the owl pop-up.
 *
 * `localStorage`, so a notice is announced once and never again. Kept apart from
 * read/dismissed because those answer "is the student caught up"; this answers
 * "have we already interrupted them".
 */
const SEEN_KEY = 'libtrack:seen-notifications:v1';

const POPUP_DELAY_MS = 900;
const POPUP_VISIBLE_MS = 6000;

function readSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(key: string, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    if (ids.size === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify([...ids].slice(-DISMISSED_LIMIT)));
  } catch {
    // Ignore unavailable storage.
  }
}

function kindOf(type: string | null | undefined): NotificationKind {
  return KIND_BY_TYPE[String(type ?? '').toLowerCase()] ?? 'account';
}

function isRead(row: LiveNotification): boolean {
  if (typeof row.is_read === 'boolean') return row.is_read;
  if (typeof row.is_read === 'number') return row.is_read === 1;
  return Boolean(row.read_at);
}

function mapNotification(row: LiveNotification): AppNotification | null {
  // Delivery logs ("Overdue SMS Sent", "Due Reminder SMS Failed") are plumbing,
  // not something a student needs to read, so sms-channel rows are skipped.
  if (String(row.channel ?? '').toLowerCase() === 'sms') return null;

  return {
    id: `feed:${row.id}`,
    kind: kindOf(row.type as string | null),
    title: String(row.title ?? 'LIBTRACK'),
    body: String(row.message ?? row.body ?? row.description ?? ''),
    actor: String(row.actor ?? 'LIBTRACK Library'),
    time: String(row.sent_at ?? row.created_at ?? ''),
    unread: !isRead(row),
  };
}

/**
 * Notifications for the header bell.
 *
 * Two sources are merged. The server feed only ever carries `due_reminder` and
 * `overdue_notice` (and currently 500s), so borrows, returns and settled fines
 * are derived from the same borrowings/fines payloads the screens already load.
 * Derived ids are stable, so nothing duplicates across reloads.
 */
export function useNotifications(enabled = true, suppressPopup = false) {
  const { user } = useAuth();
  const [serverItems, setServerItems] = useState<AppNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [read, setRead] = useState<Set<string>>(() => readSet(READ_KEY));
  const [seen, setSeen] = useState<Set<string>>(() => readSet(SEEN_KEY));
  const [popup, setPopup] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(false);

  // Shared with the Borrowings and Fines screens, so a librarian action lands
  // everywhere at once instead of only inside the bell.
  const { borrowings, fines } = useLibraryData();

  // Which account the "already announced" baseline was taken for.
  const baselinedFor = useRef<number | string | null>(null);
  const accountId = user?.id ?? null;

  const derived = useMemo<ActivityEvent[]>(() => {
    if (!enabled || !borrowings.data) return [];
    return buildActivityNotifications({
      activeLoans: borrowings.data?.props?.activeLoans ?? [],
      transactions: borrowings.data?.props?.borrowings?.data ?? [],
      fines: fines.data?.props?.fines?.data ?? [],
    });
  }, [enabled, borrowings.data, fines.data]);

  const merged = useMemo<AppNotification[]>(() => {
    const byId = new Map<string, AppNotification>();

    for (const item of derived) byId.set(item.id, item);
    for (const item of serverItems) if (!byId.has(item.id)) byId.set(item.id, item);

    return [...byId.values()]
      .map((item) => (read.has(item.id) ? { ...item, unread: false } : item))
      .sort((a, b) => {
        const left = a.time ? new Date(a.time).getTime() : 0;
        const right = b.time ? new Date(b.time).getTime() : 0;
        return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left);
      });
  }, [derived, serverItems, read]);

  const items = useMemo(() => merged.filter((item) => !dismissed.has(item.id)), [merged, dismissed]);


  /**
   * Take a baseline once per account.
   *
   * Without it, a first install would pop the owl for every historical item at
   * once. The ref makes it a one-shot: later polls add new ids to `seen` only via
   * `markSeen`, so a genuinely new notice still gets announced.
   */
  useEffect(() => {
    if (!enabled) return;
    if (accountId === null) return;
    if (baselinedFor.current === accountId) return;
    if (!borrowings.data && !serverItems.length) return;

    baselinedFor.current = accountId;
    setSeen((current) => {
      const next = new Set(current);
      let changed = false;
      items.forEach((item) => {
        if (!next.has(item.id)) {
          next.add(item.id);
          changed = true;
        }
      });
      if (changed) writeSet(SEEN_KEY, next);
      return changed ? next : current;
    });
  }, [enabled, accountId, borrowings.data, serverItems, items]);

  /** Notices that have arrived but have not been announced yet. */
  const pending = useMemo(
    () => items.filter((item) => !seen.has(item.id) && item.unread),
    [items, seen],
  );
  const pendingCount = pending.length;

  /**
   * Keep the popup object identity stable.
   *
   * Every 3s poll rebuilds `items`, so storing `pending[0]` directly produced a
   * new object each tick. That restarted the hide timer before it could ever
   * reach 6s and re-targeted the owl's animations, which is what read as
   * flicker. Comparing on id means an unchanged popup is never touched.
   */
  const showPopup = useCallback((next: AppNotification | null) => {
    setPopup((current) => (current?.id === next?.id ? current : next));
  }, []);

  /**
   * Raise an Android notification for every newly arrived item.
   *
   * Only while the app is in the background. In the foreground the owl popup
   * already announces the arrival on screen, and posting as well would tell the
   * student about the same event twice.
   *
   * One notification per event, not one per batch. Capping at a single
   * notification meant that of three books borrowed in a row only the first
   * ever reached the shade - the rest were silently dropped, which reads as
   * "notifications are broken" rather than "I was busy".
   *
   * Ref-guarded by id so one arrival can never produce two notifications even if
   * the 3s poll re-runs the announce.
   */
  const postedRef = useRef<Set<string>>(new Set());

  const postArrivals = useCallback((arrivals: AppNotification[]) => {
    if (!arrivals.length) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;

    const fresh = arrivals.filter((item) => !postedRef.current.has(item.id));
    if (!fresh.length) return;

    fresh.forEach((item) => {
      postedRef.current.add(item.id);
      void postSystemNotification(item);
    });
  }, []);

  /**
   * Leaving the app with unread items should produce a notification for each.
   *
   * `postArrivals` only covers events that land while backgrounded, because
   * `announceNext` marks everything seen the moment it runs in the foreground.
   * So a student who borrows a book while looking at the app gets the owl popup
   * and then nothing at all when they leave - which reads as "notifications do
   * not work" even though the plumbing is fine.
   *
   * Every unread item gets its own notification on the way out, for the same
   * reason as above: the bell lists them all, but the shade is what a student
   * actually sees when the app is not in front of them.
   */
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;

      itemsRef.current
        .filter((item) => item.unread && !postedRef.current.has(item.id))
        .forEach((item) => {
          postedRef.current.add(item.id);
          void postSystemNotification(item);
        });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const announceNext = useCallback(() => {
    // Arrivals collected on the way here, so a system notification can be
    // raised for each one that was genuinely new.
    const arrivals: AppNotification[] = [];

    setSeen((current) => {
      if (!items.length) return current;
      const next = new Set(current);
      let changed = false;
      items.forEach((item) => {
        if (!next.has(item.id) && item.unread) {
          next.add(item.id);
          arrivals.push(item);
          changed = true;
        }
      });
      if (changed) writeSet(SEEN_KEY, next);
      return changed ? next : current;
    });

    postArrivals(arrivals);
    showPopup(pending[0] ?? null);
  }, [items, pending, showPopup, postArrivals]);

  // Held in a ref so the 3s poll does not re-trigger the announce. Depending on
  // the callback itself re-ran it every tick, which immediately re-announced
  // with an empty queue and slammed the popup shut.
  const announceRef = useRef(announceNext);
  announceRef.current = announceNext;

  // Announce the newest arrival, a beat after the data lands so the header has
  // finished animating in. Held back while the bell panel is open, otherwise it
  // would appear behind the panel and time out unseen.
  useEffect(() => {
    if (!enabled || suppressPopup) return;
    if (!pendingCount) return;

    const timer = window.setTimeout(() => announceRef.current(), POPUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, suppressPopup, pendingCount]);

  // Give it its moment, then get out of the way. Keyed on the id, not the
  // object, so the countdown survives the next poll.
  const popupId = popup?.id ?? null;
  useEffect(() => {
    if (!popupId) return;
    const timer = window.setTimeout(() => showPopup(null), POPUP_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [popupId, showPopup]);

  /** Swiped away or tapped the X: clear this and anything queued behind it. */
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const dismissPopup = useCallback(() => {
    showPopup(null);
    setSeen((current) => {
      const next = new Set(current);
      let changed = false;
      pendingRef.current.forEach((item) => {
        if (!next.has(item.id)) {
          next.add(item.id);
          changed = true;
        }
      });
      if (changed) writeSet(SEEN_KEY, next);
      return changed ? next : current;
    });
  }, []);

  /** Tapped the body: the bell shows the rest, so only clear this one. */
  const openPopup = useCallback(() => showPopup(null), [showPopup]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const rows = await getNotifications();
      setServerItems(rows.map(mapNotification).filter((item): item is AppNotification => item !== null));
    } catch {
      // The feed is not reachable; the derived events still fill the bell.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setServerItems([]);
      return;
    }
    void load();
  }, [enabled, load]);

  // Coming back to the app is a strong signal something may have changed.
  // The shared provider already refreshes circulation data; only the server feed
  // needs nudging here.
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [enabled, load]);

  const unreadCount = items.filter((item) => item.unread).length;

  const markRead = useCallback((id: string) => {
    setRead((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      writeSet(READ_KEY, next);
      return next;
    });

    // Only rows that came from the real feed have an id the server recognises.
    if (id.startsWith('feed:')) {
      const serverId = id.slice('feed:'.length);
      void markNotificationRead(serverId).catch(() => undefined);
    }
  }, []);

  const markAllRead = useCallback(() => {
    setRead((current) => {
      const next = new Set(current);
      items.forEach((item) => next.add(item.id));
      writeSet(READ_KEY, next);
      return next;
    });

    void markAllNotificationsRead().catch(() => undefined);
  }, [items]);

  /** Remove one notification from the list on this device. */
  const dismiss = useCallback((id: string) => {
    setDismissed((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }, []);

  /** Empty the list on this device. */
  const dismissAll = useCallback(() => {
    setDismissed((current) => {
      const next = new Set(current);
      items.forEach((item) => next.add(item.id));
      writeDismissed(next);
      return next;
    });
  }, [items]);

  return {
    items,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
    dismissAll,
    dismissedCount: dismissed.size,
    popup,
    pendingCount,
    dismissPopup,
    openPopup,
    loading,
    refresh: load,
  };
}
