package com.libtrack.studentapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import android.webkit.CookieManager;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Notices that something changed on the student's account while the app was not
 * looking.
 *
 * Why this exists, and why it is not a foreground service
 * -----------------------------------------------------
 * Android freezes a backgrounded WebView, so the app's own `setInterval` stops
 * firing the moment the student presses Home. That left notifications working
 * only while the app was open. The obvious fix is a foreground service, which
 * does keep running - at the cost of a permanent, undismissable notification in
 * the shade that the student cannot remove. On a student app that reads as
 * broken.
 *
 * WorkManager is the other option: Android schedules the work on its own terms,
 * batch- and battery-aware, and it survives the app being swiped away. No
 * persistent notification, no `startForeground()`, and therefore none of the
 * `ForegroundServiceStartNotAllowedException` problems a service run into when
 * started from `onCreate`. The trade is latency - WorkManager will not run more
 * often than every 15 minutes - which is the right trade here, because nobody
 * needs to hear about a fine within twenty seconds.
 *
 * How it decides there is news
 * ---------------------------
 * It fetches the same borrowings/fines payloads the app already uses, folds them
 * into a small fingerprint, and compares that with the fingerprint the web app
 * last saw. A change means a librarian did something.
 *
 * The baseline is written by the web app (see `BackgroundPoll.recordFingerprint`)
 * rather than seeded here. That matters: if the worker invented its own baseline
 * on its first run it would have nothing to compare against, and the first
 * change it ever saw would be indistinguishable from "everything ever
 * happened". Worse, a student signing in on a fresh install would get one
 * notification per historical loan at once.
 *
 * The session comes from Android's own cookie jar. It is already there and it is
 * already flushed to disk by the time the app is backgrounded, so there is no
 * login of its own to do and nothing extra to store.
 */
public class SessionCheckWorker extends Worker {

    /**
     * Logcat tag. Everything this worker decides is logged under this name.
     *
     * It exists because the alternative last time was guessing: a background
     * check that quietly does nothing looks exactly like "notifications are
     * broken", and there is no other way to tell the two apart from outside.
     */
    private static final String TAG = "LibtrackPoll";

    /** Must match VITE_API_ORIGIN in .env.production. */
    private static final String ORIGIN = "https://libtrack.laravel.cloud";

    /** Must match CHANNEL_ID in MainActivity.java and systemNotifications.ts. */
    private static final String CHANNEL_ID = "libtrack-updates-v3";

    /** Must match EXTRA_ROUTE in MainActivity.java and systemNotifications.ts. */
    private static final String EXTRA_ROUTE = "libtrackRoute";

    /**
     * Separate from the app's notifications so a student's own id never collides
     * with ours, and vice versa.
     */
    private static final int NOTIFICATION_BASE = 900_100;

    private static final String PREFS = "libtrack-background-poll";
    private static final String KEY_FINGERPRINT = "fingerprint";
    private static final String KEY_ACCOUNT = "account";

    private static final int TIMEOUT_MS = 20_000;

    /** Bounded so four bad runs cannot pile up forever. */
    private static final int MAX_FINED_BORROWINGS = 400;

    public SessionCheckWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        // Belt and braces. A throw inside a Worker does not take the app down,
        // but it does mark the run failed and WorkManager will retry, so an
        // early return here is what keeps a broken network from turning into a
        // retry storm.
        try {
            check();
        } catch (Throwable error) {
            // Never retry: a failure here is environmental (no network, dead
            // session), and the next scheduled run is only 15 minutes away.
            Log.w(TAG, "run failed, will try again next interval", error);
        }
        return Result.success();
    }

    private void check() throws Exception {
        String cookie = readSessionCookie();
        if (cookie == null || cookie.isEmpty()) return;

        Snapshot now = fetch(cookie);
        // A null snapshot means the read did not come back as a signed-in page.
        // Most often the session has genuinely expired. Nothing to announce, and
        // the baseline is dropped so the next successful read starts fresh rather
        // than firing a backlog against a dead session.
        if (now == null) {
            Log.i(TAG, "read came back signed-out; dropping baseline");
            clearFingerprintOnly(getApplicationContext());
            return;
        }

        SharedPreferences prefs = prefs(getApplicationContext());
        String stored = prefs.getString(KEY_FINGERPRINT, null);

        Log.i(TAG, "read " + now.fingerprint + ", baseline " + (stored == null ? "(none)" : stored));

        if (stored == null || stored.isEmpty()) {
            // First run, or the session had expired and was rebuilt. Record what
            // we see and stay quiet - the web app has not had a chance to show
            // this data yet, so nothing is news.
            writeFingerprint(prefs, now);
            return;
        }

        if (stored.equals(now.fingerprint)) return;

        // Something moved. Announce it, then move the baseline forward so the
        // same change is never announced twice.
        if (canPostNotifications(getApplicationContext())) {
            String body = describe(stored, now);
            String route = routeFor(now);
            Log.i(TAG, "change detected, posting: " + body);
            post(getApplicationContext(), body, route);
        } else {
            // No permission, so nothing appears. The baseline still moves: if it
            // did not, the student would grant permission later and be handed a
            // backlog of notifications for things they already saw in the app.
            Log.i(TAG, "change detected but POST_NOTIFICATIONS is not granted; skipping post");
        }
        writeFingerprint(prefs, now);
    }

    /* ------------------------------------------------------------- fetching */

    /**
     * The three counts that together stand in for "did anything happen".
     *
     * Deliberately counts rather than copies: the payload is large and we only
     * need to know that it changed, plus enough to word the notification.
     */
    private static final class Snapshot {
        final String fingerprint;
        final int activeLoans;
        final int totalBorrowings;
        final int totalFines;
        final double totalUnpaid;

        Snapshot(int activeLoans, int totalBorrowings, int totalFines, double totalUnpaid) {
            this.activeLoans = activeLoans;
            this.totalBorrowings = totalBorrowings;
            this.totalFines = totalFines;
            this.totalUnpaid = totalUnpaid;
            // Unpaid is formatted to whole pesos so a float wobble in the
            // fraction cannot read as a change on its own.
            this.fingerprint = activeLoans + ":" + totalBorrowings + ":" + totalFines
                + ":" + Math.round(totalUnpaid);
        }
    }

    /** Returns null when the responses do not look like a signed-in session. */
    private static Snapshot fetch(String cookie) throws Exception {
        JSONObject borrowings = inertiaGet("/borrowings", cookie);
        JSONObject fines = inertiaGet("/my-fines", cookie);
        if (borrowings == null || fines == null) return null;

        // Shape check, mirroring inertiaPage() in laravel.ts. A signed-out read
        // can come back as a valid 200 with the wrong props, so the presence of
        // the keys we need is what proves the session is live.
        if (!borrowings.has("borrowings") || !fines.has("fines")) return null;

        int activeLoans = length(borrowings.optJSONArray("activeLoans"));
        int totalBorrowings = totalOf(borrowings.optJSONObject("borrowings"));
        int totalFines = totalOf(fines.optJSONObject("fines"));
        double totalUnpaid = fines.optDouble("totalUnpaid", 0d);

        return new Snapshot(activeLoans, totalBorrowings, totalFines, totalUnpaid);
    }

    /**
     * One Inertia GET, returning the `props` object or null.
     *
     * `X-Inertia` is what makes Laravel answer with the JSON envelope instead of
     * a full HTML page. Without it we would be pattern-matching HTML.
     */
    private static JSONObject inertiaGet(String path, String cookie) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(ORIGIN + path).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/json, text/html");
            connection.setRequestProperty("X-Inertia", "true");
            connection.setRequestProperty("X-Requested-With", "XMLHttpRequest");
            connection.setRequestProperty("Cookie", cookie);

            int status = connection.getResponseCode();

            // A dead session is answered as a redirect to /login, and Inertia
            // turns a same-origin redirect it cannot turn into a partial reload
            // into 409. Neither is data.
            if (status == 409 || status == 401) return null;
            if (status >= 300 && status < 400) return null;

            InputStreamReader reader;
            if (status >= 400) {
                reader = new InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8);
            } else {
                reader = new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8);
            }

            StringBuilder body = new StringBuilder();
            try (BufferedReader buffered = new BufferedReader(reader)) {
                String line;
                while ((line = buffered.readLine()) != null) body.append(line);
            }

            String text = body.toString().trim();
            // The login page arrives as HTML. Do not try to parse it.
            if (!text.startsWith("{")) return null;

            JSONObject page = new JSONObject(text);
            JSONObject props = page.optJSONObject("props");
            return props == null ? null : props;
        } catch (Exception ignored) {
            // A network blip is not a session death. Returning null here clears
            // the baseline, which is the one outcome worth avoiding, so callers
            // treat this as "could not read" via a distinct path.
            throw ignored;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static int length(JSONArray array) {
        return array == null ? 0 : array.length();
    }

    /**
     * Reads a pagination total, falling back to the row count.
     *
     * The web app uses `borrowings.total` when it is there. Older payloads only
     * carry the rows, so counting them keeps the fingerprint stable across both
     * shapes instead of reading a total as 0 one day and N the next.
     */
    private static int totalOf(JSONObject paginated) {
        if (paginated == null) return 0;
        if (paginated.has("total")) return paginated.optInt("total", 0);
        int data = length(paginated.optJSONArray("data"));
        // Borrowings past this are almost certainly a different screen's rows.
        return Math.min(data, MAX_FINED_BORROWINGS);
    }

    /* -------------------------------------------------------------- session */

    /**
     * The Laravel session cookie as Android holds it.
     *
     * Read straight from the jar the web app has been using, so there is no
     * second copy of the session to keep in sync. Returns null when there is no
     * session cookie, which is the normal state for a signed-out student.
     *
     * The name is matched by suffix rather than written out. Laravel derives it
     * from APP_NAME (config/session.php: Str::slug(APP_NAME).'_session'), so it
     * is `libtrack_session` today and would silently become something else the
     * day APP_NAME is renamed. Hard-coding it would mean the background check
     * quietly stops working with no error anywhere.
     */
    private static String readSessionCookie() {
        String header = CookieManager.getInstance().getCookie(ORIGIN);
        if (header == null || header.isEmpty()) {
            Log.i(TAG, "no cookie for " + ORIGIN + " - signed out, nothing to check");
            return null;
        }

        for (String pair : header.split(";")) {
            String trimmed = pair.trim();
            int eq = trimmed.indexOf('=');
            if (eq < 1) continue;

            String name = trimmed.substring(0, eq);
            if (name.endsWith("_session")) {
                Log.i(TAG, "found session cookie '" + name + "'");
                return header;
            }
        }

        Log.w(TAG, "cookie header had no *_session cookie; names were " + cookieNames(header));
        return null;
    }

    /** Names only. A session cookie is a credential and must never be logged. */
    private static String cookieNames(String header) {
        StringBuilder names = new StringBuilder();
        for (String pair : header.split(";")) {
            String trimmed = pair.trim();
            int eq = trimmed.indexOf('=');
            if (eq < 1) continue;
            if (names.length() > 0) names.append(", ");
            names.append(trimmed.substring(0, eq));
        }
        return names.toString();
    }

    /* ------------------------------------------------------- the baseline */

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Where the web app records what it has already shown the student. */
    static void recordFingerprint(Context context, int activeLoans, int totalBorrowings,
                                  int totalFines, double totalUnpaid, String accountKey) {
        SharedPreferences prefs = prefs(context);
        // A different account must not inherit the previous one's baseline, or
        // signing in as someone else announces their history as fresh news.
        if (!accountKey.equals(prefs.getString(KEY_ACCOUNT, ""))) {
            prefs.edit().putString(KEY_FINGERPRINT, "").apply();
        }
        prefs.edit()
            .putString(KEY_ACCOUNT, accountKey)
            .putString(KEY_FINGERPRINT, snapshotOf(activeLoans, totalBorrowings, totalFines, totalUnpaid))
            .apply();
    }

    /** Called on sign-out, so the next student's first run starts clean. */
    static void clearFingerprint(Context context) {
        prefs(context).edit().clear().apply();
    }

    private static void writeFingerprint(SharedPreferences prefs, Snapshot snapshot) {
        prefs.edit().putString(KEY_FINGERPRINT, snapshot.fingerprint).apply();
    }

    private static void clearFingerprintOnly(Context context) {
        // Only the fingerprint. The account marker must survive, so that signing
        // in again after an expiry is not mistaken for a different account.
        prefs(context).edit().remove(KEY_FINGERPRINT).apply();
    }

    private static String snapshotOf(int activeLoans, int totalBorrowings, int totalFines, double totalUnpaid) {
        return activeLoans + ":" + totalBorrowings + ":" + totalFines + ":" + Math.round(totalUnpaid);
    }

    /* -------------------------------------------------------- the wording */

    /**
     * Describe what moved, in the order a librarian would expect to hear about
     * it: a loan, then a return, then money.
     */
    private static String describe(String before, Snapshot now) {
        int oldLoans = field(before, 0);
        int oldBorrowings = field(before, 1);
        int oldFines = field(before, 2);
        double oldUnpaid = Math.round(field(before, 3));

        if (now.activeLoans > oldLoans) {
            int n = now.activeLoans - oldLoans;
            return n == 1
                ? "A book was borrowed for you. Open LIBTRACK to see which one."
                : n + " books were borrowed for you. Open LIBTRACK to see which ones.";
        }

        if (now.activeLoans < oldLoans || now.totalBorrowings > oldBorrowings) {
            return "A book was returned. Open LIBTRACK to see which one.";
        }

        if (now.totalUnpaid > oldUnpaid || now.totalFines > oldFines) {
            return now.totalFines > oldFines
                ? "A new fine was added. You now owe " + peso(now.totalUnpaid) + "."
                : "Your unpaid fines now total " + peso(now.totalUnpaid) + ".";
        }

        return "Your library account was updated. Open LIBTRACK to see what changed.";
    }

    /** Where a tap should land. Mirrors routeForNotification in systemNotifications.ts. */
    private static String routeFor(Snapshot now) {
        if (now.activeLoans > 0) return "/app/borrowings";
        return "/app/fines";
    }

    private static int field(String fingerprint, int index) {
        String[] parts = fingerprint.split(":");
        if (index >= parts.length) return 0;
        try {
            return Integer.parseInt(parts[index].trim());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static String peso(double amount) {
        return "₱" + String.format("%.2f", amount);
    }

    /* ------------------------------------------------------- the post itself */

    private static boolean canPostNotifications(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return ContextCompat.checkSelfPermission(
            context, android.Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private static void post(Context context, String body, String route) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        // Created here too, not just in MainActivity. The worker can run when the
        // activity has never been in this process, and posting to a channel that
        // does not exist is silently dropped from API 26 - which would look
        // exactly like "notifications do not work".
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Library updates", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Books you borrowed or returned, and fines that change.");
            manager.createNotificationChannel(channel);
        }

        // The route goes on the intent itself, not through LaunchRoute.capture().
        // That helper keeps the route in a process-static, and this worker very
        // often posts from a process that has no MainActivity in it - the static
        // would be empty by the time the student tapped the notification.
        // An intent extra survives, because the intent is what brings the app
        // back to life.
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra(EXTRA_ROUTE, route);

        PendingIntent pending = PendingIntent.getActivity(
            context,
            Math.abs(route.hashCode()),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_libtrack_owl)
            .setContentTitle("LIBTRACK")
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setColor(0xFFF5B539)
            .setContentIntent(pending)
            .setAutoCancel(true)
            .build();

        manager.notify(NOTIFICATION_BASE + Math.abs(route.hashCode() % 500), notification);
    }
}