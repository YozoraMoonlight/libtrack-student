package com.libtrack.studentapp;

import android.webkit.CookieManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Reads the cookie header Android holds for one specific origin.
 *
 * Capacitor's built-in CapacitorCookies.getCookies() ignores its `url` option and
 * evaluates `document.cookie` inside the WebView instead, which only ever sees
 * the app's own origin (https://localhost) and never the LIBTRACK host. That
 * makes it impossible to snapshot a Laravel session cookie for persistence, so
 * this exposes the real CookieManager lookup.
 */
@CapacitorPlugin(name = "LibtrackCookies")
public class LibtrackCookies extends Plugin {

    @PluginMethod
    public void getCookieHeader(PluginCall call) {
        String url = call.getString("url");
        JSObject result = new JSObject();

        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }

        String cookie = CookieManager.getInstance().getCookie(url);
        result.put("cookie", cookie == null ? "" : cookie);
        call.resolve(result);
    }

    /** Force the in-memory jar to disk. */
    @PluginMethod
    public void flush(PluginCall call) {
        CookieManager.getInstance().flush();
        call.resolve();
    }
}
