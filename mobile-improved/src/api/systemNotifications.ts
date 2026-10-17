/**
 * Android system notifications.
 *
 * Scope is deliberately narrow: the LIBTRACK server has no push (no FCM, no
 * websocket, and it cannot be deployed), so there is nothing that can wake a
 * killed app. These are local notifications raised from the app's own polling,
 * which means they only fire while the process is alive - foreground or
 * backgrounded. That is the ceiling for a client-only implementation.
 *
 * When the app is in the foreground we deliberately post nothing: the owl popup
 * already announces arrivals on screen, and a system notification on top of it
 * would double-notify the same event.
 */

import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { AppNotification } from '../types/notifications';

/**
 * Must match CHANNEL_ID in MainActivity.java and SessionCheckWorker.
 *
 * "-v3" for the same reason as "-v2": this Honor ROM clamps a newly created
 * channel's importance down to DEFAULT regardless of what we ask for, and
 * Android will not re-importance an existing channel. A new id is the only way
 * to get a new channel.
 */
const CHANNEL_ID = 'libtrack-updates-v3';

/** LIBTRACK brand amber, from ic_launcher_background / libtrack_accent. */
const ACCENT = '#F5B539';

/** Must match EXTRA_ROUTE in MainActivity.java. */
const EXTRA_ROUTE = 'libtrackRoute';

const LaunchRoutePlugin = registerPlugin<{ consume(): Promise<{ route: string }> }>('LaunchRoute');

/**
 * Kill switch for Android system notifications.
 *
 * Every notification on the device goes through `postSystemNotification` - both
 * the in-app poll and the native background worker - so one flag here turns off
 * all of them and leaves the bell, the screens, and session persistence
 * untouched.
 *
 * Set to false deliberately: the feature is built and working, but it is off
 * until someone wants it back on. Flip this to true and the whole thing returns,
 * no other file needing to change.
 */
const ANDROID_NOTIFICATIONS_ENABLED = false;

/**
 * Fires when a notification is tapped while the app is already running.
 *
 * This is the plugin's own supported path: it parses the tap intent and emits
 * with `retainUntilConsumed`, so the event is buffered if JavaScript is not yet
 * listening. `LaunchRoute` covers the cold-start case, which the plugin does
 * not handle (its `load()` never inspects the launch intent), so both are
 * needed.
 */
export function watchNotificationTaps(onRoute: (route: string) => void): Promise<{ remove: () => void }> {
  return LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const extra = action.notification?.extra as Record<string, unknown> | undefined;
    const route = typeof extra?.[EXTRA_ROUTE] === 'string' ? (extra[EXTRA_ROUTE] as string) : '';
    if (route) onRoute(route);
  });
}

/** Where a notification should take the student when tapped. */
export function routeForNotification(notification: AppNotification): string {
  const prefix = notification.id.split(':')[0];

  switch (prefix) {
    case 'borrowed':
    case 'returned':
      return '/app/borrowings';
    case 'fine_paid':
    case 'fine_waived':
    case 'fine_added':
      return '/app/fines';
    default:
      // Server-feed items are not tied to one screen; the bell on the dashboard
      // already shows them.
      return '/app';
  }
}

/**
 * Stable 32-bit id for a notification.
 *
 * Android identifies a notification by an int, but our ids are strings like
 * `borrowed:12`. Hashing the string means the same notification always maps to
 * the same int, so re-posting replaces it instead of stacking up duplicates.
 */
function notificationId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(31, hash) + id.charCodeAt(index)) | 0;
  }
  // Keep it positive; NotificationManager treats a negative id as invalid.
  return Math.abs(hash) || 1;
}

/** True once the student has granted the runtime notification permission. */
export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Ask for POST_NOTIFICATIONS.
 *
 * Called once, after the student is actually signed in. Android only shows this
 * dialog from a real user context, so asking at cold start on the launch screen
 * is both rude and unreliable.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Post one notification. No-op without permission, which is the common case
 * before the student has been asked.
 */
export async function postSystemNotification(notification: AppNotification): Promise<boolean> {
  // Checked before the permission probe so a disabled build does not even ask
  // Android about a permission it is never going to use.
  if (!ANDROID_NOTIFICATIONS_ENABLED) return false;
  if (!(await hasNotificationPermission())) return false;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId(notification.id),
          title: notification.title,
          body: notification.body,
          // Small icon is a mask: Android tints it, so only the silhouette
          // matters. Large icon is the full-colour owl on the expanded card.
          smallIcon: 'ic_stat_libtrack_owl',
          largeIcon: 'ic_notification_owl',
          // Tints the small icon and the accent, matching LIBTRACK's amber.
          iconColor: ACCENT,
          // Created in MainActivity; posting to a channel that does not exist
          // is silently dropped from API 26.
          channelId: CHANNEL_ID,
          // Carried in the launch intent and read back by LaunchRoute.
          extra: { [EXTRA_ROUTE]: routeForNotification(notification) },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the route from a tapped notification, exactly once.
 *
 * Empty string means there was none, which is the normal case: the app was
 * opened from the launcher.
 */
export async function consumeLaunchRoute(): Promise<string> {
  try {
    const { route } = await LaunchRoutePlugin.consume();
    return route || '';
  } catch {
    return '';
  }
}

/** Cancel a pending notification, used when the student dismisses it in-app. */
export async function cancelSystemNotification(id: string): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const match = pending.notifications.find((item) => item.id === notificationId(id));
    if (match) {
      await LocalNotifications.cancel({ notifications: [{ id: match.id }] });
    }
  } catch {
    // Nothing scheduled is not an error worth surfacing.
  }
}