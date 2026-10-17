package com.libtrack.studentapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

/**
 * Carries a tapped notification's route through to the WebView, and owns the
 * notification channel.
 *
 * The route does not arrive as its own intent extra.
 * `@capacitor/local-notifications` serialises the entire notification into one
 * JSON string under a single key, with our `extra` map nested inside it, so the
 * route has to be pulled out of that blob. That applies to both paths: the
 * launch intent on a cold start, and onNewIntent when the app is already
 * running (singleTask launch mode funnels both through this activity).
 */
public class MainActivity extends BridgeActivity {

    /**
     * Intent extra @capacitor/local-notifications uses for the serialised
     * notification. Note the upstream typo ("Notfication") - it is in their
     * source as NOTIFICATION_OBJ_INTENT_KEY and cannot be corrected from here.
     */
    private static final String EXTRA_NOTIFICATION_JSON = "LocalNotficationObject";

    /** Must match EXTRA_ROUTE in systemNotifications.ts. */
    private static final String EXTRA_ROUTE = "libtrackRoute";

    /**
     * Must match CHANNEL_ID in systemNotifications.ts and SessionCheckWorker.
     *
     * "-v3" for the same reason as "-v2" did: Android refuses to change an
     * existing channel's importance once created, and this Honor ROM also
     * *clamps* a freshly created one down to DEFAULT. A brand new id is the only
     * way to get a genuinely new channel, so the version has to move whenever we
     * change how we ask for it.
     */
    private static final String CHANNEL_ID = "libtrack-updates-v3";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LibtrackCookies.class);
        registerPlugin(LaunchRoute.class);
        registerPlugin(BackgroundPoll.class);
        super.onCreate(savedInstanceState);

        // Take the scroll furniture off the WebView itself.
        //
        // Hiding scrollbars in CSS is not enough here. Android's WebView draws
        // its scrollbars as part of the native view rather than as part of the
        // document, so `::-webkit-scrollbar { display: none }` never reaches
        // them, and the bar kept drawing down the right edge. It also paints a
        // translucent white glow when the page is overscrolled past its end,
        // which reads as a white smudge on a phone.
        //
        // Scrolling itself is untouched - these only remove the indicators.
        WebView webView = getBridge().getWebView();
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        createNotificationChannel();
        captureRoute(getIntent());
    }

    /**
     * Creates the notification channel.
     *
     * @capacitor/local-notifications auto-creates its own channel, but with the
     * id "default". Posting to a channelId that does not exist is silently
     * dropped from API 26, so the channel has to exist before the first post -
     * and doing it here means it is ready before the WebView even boots.
     *
     * IMPORTANCE_HIGH makes the notification pop up as a heads-up banner as well as
     * landing in the shade. DEFAULT was tried first and only played a sound - the
     * notification never appeared on screen, which reads as "it did not work".
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        // Delete before creating, so a re-run does not skip creation. The id itself
        // is versioned (see CHANNEL_ID) because some devices refuse to change an
        // existing channel's importance at all.
        manager.deleteNotificationChannel(CHANNEL_ID);

        // IMPORTANCE_HIGH, not MAX. MAX was tried as a way around this ROM clamping
        // HIGH down to DEFAULT (measured on a clean uninstall, so it was not a
        // stale channel) and it did not work - MAX is clamped the same way. It is
        // also the wrong semantic for a student app: it is intrusive and
        // insistent. HIGH is what we want, and if the ROM clamps that then the
        // channel has to be raised once by hand in Android Settings, where a
        // user-set importance is not clamped.
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Library updates",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Books you borrowed or returned, and fines that change.");
        manager.createNotificationChannel(channel);
    }

    /** SingleTask means a tap on a notification lands here rather than a new activity. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        captureRoute(intent);
    }

    private void captureRoute(Intent intent) {
        if (intent == null) return;

        // Our own notifications (from SessionCheckWorker) carry the route as a
        // plain extra. Checked first because the worker posts from a process that
        // may have no MainActivity in it, so the route has to arrive on the
        // intent rather than in a static - and there is no plugin JSON blob to
        // read in that case.
        String direct = intent.getStringExtra(EXTRA_ROUTE);
        if (direct != null && !direct.isEmpty()) {
            LaunchRoute.capture(direct);
            return;
        }

        String json = intent.getStringExtra(EXTRA_NOTIFICATION_JSON);
        if (json == null) return;

        try {
            JSONObject extra = new JSONObject(json).optJSONObject("extra");
            if (extra == null) return;
            LaunchRoute.capture(extra.optString(EXTRA_ROUTE, ""));
        } catch (Exception ignored) {
            // A notification with no route, or malformed JSON, is not an error.
        }
    }
}