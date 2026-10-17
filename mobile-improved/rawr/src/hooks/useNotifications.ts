import { useCallback, useEffect, useState } from 'react';
import { notifications as initialNotifications } from '../data/notifications';
import type { AppNotification } from '../types/notifications';

const POPUP_DELAY_MS = 900;
const POPUP_VISIBLE_MS = 6000;
const POPUP_SEEN_KEY = 'libtrack-notif-popup-seen';

/** Notifications, read-state for the header bell, and the owl pop-up for the newest unread notice. */
export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>(initialNotifications);
  const [popup, setPopup] = useState<AppNotification | null>(null);

  const unreadCount = items.filter((item) => item.unread).length;

  // Pop up the newest unread notice once per session
  useEffect(() => {
    if (safeGet(POPUP_SEEN_KEY)) return;
    const newest = initialNotifications.find((item) => item.unread);
    if (!newest) return;
    const timer = window.setTimeout(() => {
      safeSet(POPUP_SEEN_KEY, '1');
      setPopup(newest);
    }, POPUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(() => setPopup(null), POPUP_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [popup]);

  const dismissPopup = useCallback(() => setPopup(null), []);

  const markRead = useCallback((id: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
  }, []);

  return { items, unreadCount, popup, dismissPopup, markRead, markAllRead };
}

function safeGet(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {

    // Storage unavailable (private mode) — the pop-up simply shows again next visit
  }}