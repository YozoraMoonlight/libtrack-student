# LIBTRACK Student — Android app (Capacitor)

The student app is the Vite/React frontend in `mobile-improved/`, packaged for
Android with Capacitor. It talks to the **existing live Laravel backend** at
`https://libtrack.laravel.cloud` — nothing is deployed and no server changes are
required.

## Build the APK

```bash
npm run apk:debug
```

That runs the whole chain: build the web app → `cap sync android` → Gradle
`assembleDebug`.

Output:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it with:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

To read the app's logs while it runs:

```bash
adb logcat --pid=$(adb shell pidof com.libtrack.studentapp)
```

Prerequisites: Android SDK (already pointed at by `android/local.properties`)
and a JDK. The build works with Android Studio's bundled JDK:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

Individual steps if you want them separately:

```bash
npm run mobile:build   # vite build -> mobile-improved/dist
npm run mobile:sync    # cap sync android
npm run mobile:open    # open in Android Studio
```

## What makes the live API work from inside the APK

This is the part that is easy to get wrong, so it is worth being explicit.

A packaged app does **not** have a Vite dev server, so the frontend cannot rely
on the dev proxy. It also does not have a browser origin that
`libtrack.laravel.cloud` accepts, because the server sends no
`Access-Control-Allow-Origin` header. A plain `fetch` from the WebView would be
blocked by CORS on every request.

Two things solve it, both configured in `capacitor.config.ts`:

1. **`webDir: 'mobile-improved/dist'`** — the app runs from the bundled assets
   instead of `server.url`, which previously pointed at
   `https://libtrack.laravel.cloud/mobile/login` and made this a remote-page
   wrapper. That hardcoded URL is gone.

2. **`CapacitorHttp: { enabled: true }`** — Capacitor patches `fetch` and
   `XMLHttpRequest` so requests to non-local origins are performed by the native
   HTTP stack. The native layer applies no CORS policy and keeps Laravel's
   session cookie in the platform cookie jar. `CapacitorCookies` is enabled too
   so `document.cookie` reflects that jar.

`mobile-improved/.env.production` sets `VITE_API_ORIGIN=https://libtrack.laravel.cloud`
so the production bundle addresses the live origin directly. Leaving it blank is
still correct for `npm run dev`, which uses the Vite proxy instead.

## Session handling

The backend authenticates with an encrypted session cookie plus CSRF, so the
client in `mobile-improved/src/api/laravel.ts` handles:

- `GET /mobile/login` to obtain the CSRF token and Inertia asset version
- `X-CSRF-TOKEN` on mutations, with one refresh-and-replay on `419`
- `X-Inertia` / `X-Inertia-Version` on page reads, re-bootstrapping once on
  `409`/`412`
- final-URL checks so a signed-out redirect to a login page is never parsed as
  app data

## Routes used

`/mobile/login`, `/mobile/register/*`, `/student/dashboard`, `/books`,
`/books/{book}/qr-code`, `/borrowings`, `/borrowings/return-request`,
`/my-fines`, `/user/settings/*`, `/logout`.

## Permissions

`android/app/src/main/AndroidManifest.xml` declares `INTERNET` and `CAMERA`.
`CAMERA` is required because the QR return scanner uses `getUserMedia` inside
the WebView — without the manifest entry the browser permission prompt is
auto-denied and the scanner shows no camera. The app also requests the runtime
permission when the scanner is opened.

## Troubleshooting

**Blank white screen** — the bundle did not load. Check
`android/app/src/main/assets/public/index.html` exists after a sync.

**Requests fail with a network/CORS error** — confirm
`assets/capacitor.config.json` inside the APK still has
`CapacitorHttp.enabled: true`, and that `mobile-improved/.env.production` exists.
Re-run `npm run apk:debug` after changing either.

**Login succeeds then bounces back** — the session cookie is not sticking. Make
sure `CapacitorCookies` is still enabled, and that the app is not being loaded
through `server.url`.

**Book list is empty** — this is backend data, not the client. `/books` filters
`books.school_id = user.school_id`, so a student whose record has no matching
`school_id` sees an empty catalog.
