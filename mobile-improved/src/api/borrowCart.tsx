import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ApiError,
  SessionExpiredError,
  inertiaPage,
  inertiaVisit,
  type InertiaPage,
} from './laravel';
import { useAuth } from '../auth/AuthContext';

/**
 * The student's Borrow Cart.
 *
 * The cart lives on the server (one `BorrowRequest` row in the `cart` state) so
 * it survives a reinstall and so the Browse page can mark titles that are
 * already picked. This provider keeps one copy for the whole signed-in shell:
 * the cart page, the badge on the nav bar and the Browse buttons all read the
 * same data and update together.
 */

export type BorrowCartItem = {
  id: number;
  book_id: number;
  title: string | null;
  author: string | null;
  location: string | null;
  cover_image_url: string | null;
  available_copies: number;
  has_pdf: boolean;
  scanned_copy: string | null;
};

export type BorrowRequestItem = {
  id: number;
  title: string;
  author: string | null;
  location: string | null;
  status: string;
  copy: string | null;
  chose_physical: boolean;
  note: string | null;
};

export type BorrowRequestSummary = {
  id: number;
  status: string;
  submitted_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  note: string | null;
  handled_by: string | null;
  items: BorrowRequestItem[];
};

export type BorrowCartSlate = {
  /** The school's per-student limit. */
  max: number;
  /** Books currently out on loan. */
  loans: number;
  /** Books set aside by a request waiting at the desk. */
  reserved: number;
  /** Books sitting in this cart. */
  cart: number;
};

export type FlashMessage = {
  success?: string | null;
  error?: string | null;
  info?: string | null;
  id?: string | null;
};

export type BorrowCartProps = {
  user?: { name?: string | null; email?: string | null };
  cart: BorrowCartItem[];
  pending: BorrowRequestSummary | null;
  history: BorrowRequestSummary[];
  slate: BorrowCartSlate;
  blockedReason: string | null;
  qrCode?: string | null;
  flash?: FlashMessage;
};

export type CartNotice = { type: 'success' | 'error' | 'info'; text: string };
export type CartActionResult = { ok: boolean; message: string | null };

type BorrowCartValue = {
  data: InertiaPage<BorrowCartProps> | null;
  cart: BorrowCartItem[];
  pending: BorrowRequestSummary | null;
  history: BorrowRequestSummary[];
  slate: BorrowCartSlate;
  blockedReason: string | null;
  /** Titles the student has already picked (cart / reserved / borrowed). */
  states: { cart: number[]; reserved: number[]; borrowed: number[] };
  count: number;
  loading: boolean;
  busy: boolean;
  error: string | null;
  notice: CartNotice | null;
  clearNotice: () => void;
  refresh: () => Promise<void>;
  add: (bookId: number | string, options?: { physical?: boolean; copyId?: number | string }) => Promise<CartActionResult>;
  remove: (itemId: number | string) => Promise<CartActionResult>;
  submit: () => Promise<CartActionResult>;
  cancel: (requestId: number | string) => Promise<CartActionResult>;
};

const BorrowCartContext = createContext<BorrowCartValue | null>(null);

const EMPTY_SLATE: BorrowCartSlate = { max: 0, loans: 0, reserved: 0, cart: 0 };
const EMPTY_CART: BorrowCartItem[] = [];
const EMPTY_HISTORY: BorrowRequestSummary[] = [];

/** A request waiting at the desk changes when a librarian acts, not on a timer. */
const CART_POLL_MS = 15_000;

/* ------------------------------------------------------------------ requests */

export function getBorrowCartPage(): Promise<InertiaPage<BorrowCartProps>> {
  return inertiaPage<BorrowCartProps>('/borrow-cart', 0, ['cart', 'slate']);
}

function addToBorrowCartRequest(
  bookId: number | string,
  options: { physical?: boolean; copyId?: number | string } = {},
): Promise<InertiaPage<BorrowCartProps> | null> {
  return inertiaVisit<BorrowCartProps>('/borrow-cart', {
    method: 'POST',
    data: {
      book_id: bookId,
      // The server asks for an explicit confirmation when the title also has a
      // PDF, so the flag is always sent rather than left out.
      physical: options.physical ? '1' : '0',
      copy_id: options.copyId,
    },
    referrer: '/borrow-cart',
  });
}

function removeFromBorrowCartRequest(itemId: number | string): Promise<InertiaPage<BorrowCartProps> | null> {
  return inertiaVisit<BorrowCartProps>(`/borrow-cart/items/${itemId}`, {
    method: 'DELETE',
    referrer: '/borrow-cart',
  });
}

function submitBorrowCartRequest(): Promise<InertiaPage<BorrowCartProps> | null> {
  return inertiaVisit<BorrowCartProps>('/borrow-cart/submit', {
    method: 'POST',
    data: {},
    referrer: '/borrow-cart',
  });
}

function cancelBorrowRequestRequest(requestId: number | string): Promise<InertiaPage<BorrowCartProps> | null> {
  return inertiaVisit<BorrowCartProps>(`/borrow-requests/${requestId}`, {
    method: 'DELETE',
    referrer: '/borrow-cart',
  });
}

function readableError(error: unknown): string {
  if (error instanceof SessionExpiredError) return error.message;
  if (error instanceof ApiError) return Object.values(error.errors)[0]?.[0] || error.message;
  if (error instanceof TypeError) return 'Cannot reach the LIBTRACK server. Check your connection.';
  return 'Something went wrong. Please try again.';
}

export function BorrowCartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const accountId = user?.id ?? null;
  const [data, setData] = useState<InertiaPage<BorrowCartProps> | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<CartNotice | null>(null);

  const loadedFor = useRef<number | string | null>(null);
  /** Bumped by every write so a slower poll cannot overwrite its result. */
  const actionSeq = useRef(0);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const applyPage = useCallback((page: InertiaPage<BorrowCartProps>) => {
    setData(page);
    const flash = page.props?.flash;
    if (flash?.error) setNotice({ type: 'error', text: flash.error });
    else if (flash?.success) setNotice({ type: 'success', text: flash.success });
    else if (flash?.info) setNotice({ type: 'info', text: flash.info });
  }, []);

  const refresh = useCallback(async () => {
    if (accountId === null) return;
    const seq = actionSeq.current;
    if (loadedFor.current !== accountId) setLoading(true);
    try {
      const page = await getBorrowCartPage();
      // A write that finished after this read started owns the newer state.
      if (seq !== actionSeq.current) return;
      // A poll is not an action: it must not replay a flash that belongs to
      // another screen. Writes apply their own page (and flash) in `run`.
      setData(page);
      setError(null);
      loadedFor.current = accountId;
    } catch (reason: unknown) {
      if (seq === actionSeq.current) setError(readableError(reason));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (accountId === null) {
      setData(null);
      setError(null);
      setNotice(null);
      loadedFor.current = null;
      return;
    }

    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busyRef.current) void refresh();
    }, CART_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !busyRef.current) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [accountId, refresh]);

  const run = useCallback(
    async (action: () => Promise<InertiaPage<BorrowCartProps> | null>): Promise<CartActionResult> => {
      if (accountId === null || busy) return { ok: false, message: 'Please wait a moment.' };
      actionSeq.current += 1;
      setBusy(true);
      setNotice(null);
      setError(null);
      try {
        const page = await action();
        if (page?.props) {
          applyPage(page);
          const message = page.props.flash?.error ?? null;
          return { ok: !message, message };
        }
        await refresh();
        return { ok: true, message: null };
      } catch (reason: unknown) {
        const message = readableError(reason);
        setNotice({ type: 'error', text: message });
        return { ok: false, message };
      } finally {
        setBusy(false);
      }
    },
    [accountId, busy, applyPage, refresh],
  );

  const add = useCallback(
    (bookId: number | string, options: { physical?: boolean; copyId?: number | string } = {}) =>
      run(() =>
        addToBorrowCartRequest(bookId, {
          physical: options.physical,
          copyId: options.copyId,
        }),
      ),
    [run],
  );

  const remove = useCallback((itemId: number | string) => run(() => removeFromBorrowCartRequest(itemId)), [run]);
  const submit = useCallback(() => run(() => submitBorrowCartRequest()), [run]);
  const cancel = useCallback((requestId: number | string) => run(() => cancelBorrowRequestRequest(requestId)), [run]);

  const cart = data?.props?.cart ?? EMPTY_CART;
  const pending = data?.props?.pending ?? null;
  const history = data?.props?.history ?? EMPTY_HISTORY;
  const slate = data?.props?.slate ?? EMPTY_SLATE;

  /**
   * The Browse buttons read these lists from the page props. The cart ids are
   * repeated here so a title added from the detail sheet is marked immediately,
   * without waiting for the Browse page to refetch.
   */
  const states = useMemo(
    () => ({
      cart: cart.map((item) => Number(item.book_id)),
      reserved: [] as number[],
      borrowed: [] as number[],
    }),
    [cart],
  );

  const count = slate.cart || cart.length;

  const value = useMemo<BorrowCartValue>(
    () => ({
      data,
      cart,
      pending,
      history,
      slate,
      blockedReason: data?.props?.blockedReason ?? null,
      states,
      count,
      loading,
      busy,
      error,
      notice,
      clearNotice: () => setNotice(null),
      refresh,
      add,
      remove,
      submit,
      cancel,
    }),
    [data, cart, pending, history, slate, states, count, loading, busy, error, notice, refresh, add, remove, submit, cancel],
  );

  return <BorrowCartContext.Provider value={value}>{children}</BorrowCartContext.Provider>;
}

export function useBorrowCart(): BorrowCartValue {
  const context = useContext(BorrowCartContext);
  if (!context) throw new Error('useBorrowCart must be used inside BorrowCartProvider');
  return context;
}
