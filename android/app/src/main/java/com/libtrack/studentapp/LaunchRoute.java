package com.libtrack.studentapp;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Hands the WebView the route carried by a tapped notification.
 *
 * This only covers the cold-start case. When a notification is tapped while the
 * app is already running, `@capacitor/local-notifications` emits its own
 * `localNotificationActionPerformed` event with the route, which is handled in
 * JavaScript - the plugin does not inspect the launch intent in `load()`, so a
 * tap that starts the app from scratch never reaches its event.
 *
 * `MainActivity` stores the route in a static; this hands it over and clears it
 * so a route is consumed once and never re-applies on a later launch.
 */
@CapacitorPlugin(name = "LaunchRoute")
public class LaunchRoute extends Plugin {

    private static String pendingRoute;

    /** Records the route carried by the intent that started the app. */
    public static void capture(String route) {
        if (route != null && !route.isEmpty()) {
            pendingRoute = route;
        }
    }

    /** Returns the pending route exactly once, then clears it. */
    @PluginMethod
    public void consume(PluginCall call) {
        String route = pendingRoute;
        pendingRoute = null;

        JSObject result = new JSObject();
        result.put("route", route == null ? "" : route);
        call.resolve(result);
    }
}