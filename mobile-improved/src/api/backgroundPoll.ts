/**
 * The background notification check.
 *
 * The app's own poll covers everything while it is open: the WebView's
 * `setInterval` runs, `useNotifications` notices the change, and the bell
 * updates within a few seconds.
 *
 * It stops the moment the student presses Home. Android freezes a backgrounded
 * WebView to save battery, so the timers simply stop firing and anything the
 * librarian does while the app is closed goes unseen until the student comes
 * back and finds a wall of updates at once.
 *
 * `BackgroundPoll` (native) hands that job to Android's WorkManager, which runs
 * it on its own schedule - roughly every 15 minutes - and keeps running it even
 * when the app has been swiped away. Nothing appears in the notification shade
 * permanently, which is the whole reason this is WorkManager and not a
 * foreground service.
 *
 * Two halves, and both matter:
 *
 *   schedule()        asks Android to start checking.
 *   recordFingerprint tells it what the student has already been shown, so it
 *                     can tell "already seen" from "happened while you were
 *                     away". Without this the check has nothing to compare
 *                     against, and a student's whole borrowing history would be
 *                     announced at once the first time it ran.
 *
 * Every call is best-effort. On the web there is no such plugin, and a failure
 * here must never be the reason a student cannot sign in or load their data -
 * it only costs a notification, never a screen.
 */

import { registerPlugin } from '@capacitor/core';

interface BackgroundPollPlugin {
  schedule(): Promise<{ intervalMinutes: number }>;
  stop(): Promise<void>;
  recordFingerprint(options: {
    counts: {
      activeLoans: number;
      totalBorrowings: number;
      totalFines: number;
      totalUnpaid: number;
    };
    account: string;
  }): Promise<void>;
}

const BackgroundPoll = registerPlugin<BackgroundPollPlugin>('BackgroundPoll');

/**
 * Kill switch, matching ANDROID_NOTIFICATIONS_ENABLED in systemNotifications.ts.
 *
 * The worker's only output is a notification, so with notifications off it does
 * nothing visible while still waking the CPU every 15 minutes. Better to not
 * schedule it at all.
 *
 * Both switches exist because they guard different things: that one stops a
 * notification being posted even if something calls in, and this one stops the
 * scheduled work that exists only to make that call. Together nothing runs and
 * nothing posts.
 */
const BACKGROUND_CHECK_ENABLED = false;

/** The counts a background run compares. Mirrors Snapshot in SessionCheckWorker. */
export type PollCounts = {
  activeLoans: number;
  totalBorrowings: number;
  totalFines: number;
  totalUnpaid: number;
};

/**
 * Start the background check.
 *
 * Called when a student signs in. Idempotent: WorkManager keeps one job under a
 * unique name, so calling it on every launch just refreshes the existing one
 * rather than stacking up duplicates.
 */
export async function scheduleBackgroundCheck(): Promise<boolean> {
  if (!BACKGROUND_CHECK_ENABLED) return false;

  try {
    await BackgroundPoll.schedule();
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop the background check and drop the baseline.
 *
 * Called on sign-out. Clearing the baseline matters as much as cancelling the
 * job: the next student to sign in on this phone must not inherit the previous
 * one's counts, or their whole history reads as brand new.
 */
export async function stopBackgroundCheck(): Promise<void> {
  try {
    await BackgroundPoll.stop();
  } catch {
    // Nothing scheduled is not an error.
  }
}

/**
 * Record what the student has just been shown on screen.
 *
 * Called whenever the live circulation data lands. Not an extra request - these
 * are four integers already in memory from the payload that was just parsed.
 */
export async function recordBackgroundBaseline(account: string, counts: PollCounts): Promise<void> {
  if (!BACKGROUND_CHECK_ENABLED) return;
  if (!account) return;

  try {
    await BackgroundPoll.recordFingerprint({ counts, account });
  } catch {
    // Best effort. Worst case the next background run posts one notification
    // the student has already seen in the app.
  }
}