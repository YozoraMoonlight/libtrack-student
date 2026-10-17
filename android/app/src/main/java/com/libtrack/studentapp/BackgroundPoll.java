package com.libtrack.studentapp;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

/**
 * Lets the web app hand the background notification check to Android.
 *
 * Two jobs, deliberately separate:
 *
 *   schedule()        - ask Android to run SessionCheckWorker on its own
 *                       schedule. This is what survives the app being swiped
 *                       away, and it needs no permission and shows no permanent
 *                       notification.
 *   recordFingerprint - tell the worker what the student has already been shown.
 *                       Without this the worker has nothing to compare against
 *                       and would either stay silent forever or announce a
 *                       student's entire borrowing history on its first run.
 *
 * And stop() on sign-out, so a background check never runs against a session
 * that is no longer the student's.
 */
@CapacitorPlugin(name = "BackgroundPoll")
public class BackgroundPoll extends Plugin {

    private static final String WORK_NAME = "libtrack-session-check";

    /**
     * Fifteen minutes is the floor Android enforces on periodic work, so asking
     * for less is not an option - it would be silently clamped, and the clamp is
     * worth stating here so nobody later mistakes this for a tuning mistake.
     */
    private static final long INTERVAL_MINUTES = 15;

    /**
     * Keep going on the same schedule.
     *
     * UPDATE rather than KEEP so that changing the interval above actually takes
     * effect on an install that already has the job enqueued.
     */
    @PluginMethod
    public void schedule(PluginCall call) {
        try {
            Constraints constraints = new Constraints.Builder()
                // No point burning a run with no network; the worker would just
                // fail and we would learn nothing.
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                SessionCheckWorker.class,
                INTERVAL_MINUTES,
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                // Deliberately NOT expedited: expedited work is for something the
                // user is actively waiting on, and it costs battery plus, on
                // recent Android, a visible running-notification. A background
                // notice about a book due is neither.
                .build();

            WorkManager.getInstance(getContext())
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.UPDATE,
                    request);

            JSObject result = new JSObject();
            result.put("intervalMinutes", INTERVAL_MINUTES);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not schedule the background check: " + error.getMessage());
        }
    }

    /** Stop checking. Called on sign-out. */
    @PluginMethod
    public void stop(PluginCall call) {
        try {
            WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
            SessionCheckWorker.clearFingerprint(getContext());
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not stop the background check: " + error.getMessage());
        }
    }

    /**
     * Record what the student has just been shown, so a later background run can
     * tell "already seen" from "happened while you were away".
     *
     * The counts come straight from the payload the app already loaded, so this
     * costs nothing extra - it is not an extra request, just a few integers.
     */
    @PluginMethod
    public void recordFingerprint(PluginCall call) {
        try {
            JSObject options = call.getObject("counts");
            if (options == null) {
                call.reject("counts is required");
                return;
            }

            int activeLoans = options.optInt("activeLoans", 0);
            int totalBorrowings = options.optInt("totalBorrowings", 0);
            int totalFines = options.optInt("totalFines", 0);
            double totalUnpaid = options.optDouble("totalUnpaid", 0d);

            String account = call.getString("account");
            if (account == null || account.isEmpty()) {
                call.reject("account is required");
                return;
            }

            SessionCheckWorker.recordFingerprint(
                getContext(), activeLoans, totalBorrowings, totalFines, totalUnpaid, account);

            call.resolve();
        } catch (Exception error) {
            call.reject("Could not record the baseline: " + error.getMessage());
        }
    }
}