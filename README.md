# LIBTRACK Student

An Android app that lets students use their school library from a phone — browse the
catalogue, see what they have borrowed and when it is due, check fines, and scan a
book's QR label to request a return.

The app is a React + TypeScript front end bundled for Android with Capacitor, talking
to a LIBTRACK Laravel backend over HTTPS. This repository also contains that backend,
but this document covers only the app.

**Version 2.2.1** (`versionCode 4`) · `com.libtrack.studentapp` · Android 7.0+ (API 24)

---

## About this version

This is the **reworked** LIBTRACK student app.

The original app (`mobile-app/` in this repository) was built with Expo and React
Native. This version was rebuilt as a React + Vite front end in `mobile-improved/` and
wrapped for Android with Capacitor instead. Doing that rework is what allowed the
interface to be redesigned end to end — new layout, typography and colour, dark mode,
reworked Dashboard, Browse, Borrowings, Fines and Settings screens, plus the Help Center
and Update Logs.

It talks to the same Laravel backend and uses the same student accounts, so nobody has
to register again for this version.

---

## What it does

**Accounts**

- Sign in with an LRN and password.
- Self-registration: look up an LRN, receive a 6-digit code by SMS, then set a password.
- Forgot password through the same SMS code flow.

**Library**

- **Dashboard** — the student's library QR code, which the librarian scans at the desk,
  plus a summary of current loans and unpaid fines.
- **Browse** — the book catalogue with covers and availability.
- **Borrowings** — due dates, overdue state, and history. A return can be requested from
  the list, or by scanning the book's QR label. Either way the librarian confirms it at
  the desk.
- **Fines** — outstanding and paid fines, with progress towards clearing them.

**Everything else**

- In-app notifications under the bell: book borrowed, book returned, fine added, and
  fine paid or waived.
- Offline tolerance: the last successful data is cached for 24 hours, and return
  requests made without a connection are queued and sent when it returns.
- Stays signed in across app close, force-stop, and restart.
- Dark mode.
- Help Center with guides and step-by-step demos of each screen.
- Update Logs, showing what changed in each version.

System (Android shade) notifications are intentionally disabled in this build. Alerts
appear inside the app instead; see [Permissions](#permissions).

---

## Download

The latest signed APK is attached to the newest release:

```
https://github.com/YozoraMoonlight/libtrack-student/releases/latest
```

A copy is also kept in [`releases/`](releases).

> The repository is currently private, so those links only work for accounts with
> access. If the recipient cannot open them, send the `.apk` file directly.

### Installing

1. Open the downloaded `.apk` on the phone.
2. Android will warn that installing from this source is not allowed — tap **Settings**,
   allow **Install unknown apps** for the app you downloaded with, then go back.
3. Tap **Install**.

If an older LIBTRACK build signed with a different key is already installed, Android
will refuse the update. Uninstall the old app first; that also clears its saved session.

Upgrading from 2.2.0 to 2.2.1 is a normal in-place update — no uninstall needed.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript, React Router |
| Styling | Tailwind CSS, Framer Motion |
| Build | Vite 5 |
| Android shell | Capacitor 8 |
| QR scanning | `html5-qrcode` (camera via `getUserMedia`) |
| Packaging | Gradle, `compileSdk`/`targetSdk` 36, `minSdk` 24 |

---

## Run the web app locally

```bash
cd mobile-improved
npm install
npm run dev
```

The dev server proxies the Laravel routes to the origin in `LIBTRACK_LARAVEL_ORIGIN` and
keeps the session usable over local HTTP. The proxy target comes from a local `.env`:

```bash
cp .env.example .env
```

`.env.example` already points at the production backend. `VITE_API_ORIGIN` stays blank
during development so requests go through the Vite proxy instead of being sent directly.

---

## Build the APK

From the repository root:

```bash
npm install
npm install --prefix mobile-improved

npm run apk:debug      # debuggable build
npm run apk:release    # signed release build
```

Both scripts run the full chain: Vite build → `cap sync android` → Gradle assemble.

| Output | Path |
|---|---|
| Debug | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Release | `android/app/build/outputs/apk/release/app-release.apk` |

Install to a connected device:

```bash
npm run apk:install
```

### Requirements

- Node.js and the Android SDK (`android/local.properties` points at it).
- A JDK. Set `JAVA_HOME`, for example:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  ```

### Release signing

Release builds are signed from `android/keystore.properties`, which references the
keystore file. **Neither is committed** — they are gitignored on purpose.

- Without them, `apk:release` still runs but produces an *unsigned* APK, which will not
  install.
- Losing the keystore means you can never ship an update to an installed app, because
  Android requires every release to carry the same signing key. Keep a backup somewhere
  outside this repository.

---

## How it talks to the backend

A packaged app has no Vite dev server, and the Laravel host sends no
`Access-Control-Allow-Origin` header, so a plain `fetch` from the WebView would be
blocked on every request. Two settings in `capacitor.config.ts` handle this:

- **`webDir: 'mobile-improved/dist'`** — the app runs from bundled assets rather than
  loading a remote page.
- **`CapacitorHttp.enabled`** — requests are performed by the native HTTP stack, which
  applies no CORS policy and keeps the Laravel session cookie in the platform jar.
  `CapacitorCookies.enabled` keeps `document.cookie` in sync with it.

The production origin is set in `mobile-improved/.env.production` and read as
`API_ORIGIN` in `mobile-improved/src/api/laravel.ts`.

The backend authenticates with an encrypted session cookie plus CSRF, so the client
handles:

- fetching a CSRF token from the login page and sending `X-CSRF-TOKEN` on mutations,
  with one refresh-and-replay on `419`
- `X-Inertia` / `X-Inertia-Version` on reads, re-bootstrapping once on `409` / `412`
- final-URL checks, so a signed-out redirect to a login page is never parsed as app data

Routes used: `/mobile/login`, `/mobile/register/*`, `/student/dashboard`, `/books`,
`/books/{book}/qr-code`, `/borrowings`, `/borrowings/return-request`, `/my-fines`,
`/user/settings/*`, `/logout`.

---

## Session persistence

Android may freeze or kill a backgrounded WebView at any point, so the session cookie is
snapshotted whenever the app goes to the background and restored on the next launch
(`mobile-improved/src/offline/sessionCookies.ts`).

A returning user sees a restoring screen while the snapshot is verified; a first-time
visitor goes straight to the sign-in form. A session only ends when the user logs out or
the server rejects it.

---

## Offline behaviour

- Successful responses are cached in `localStorage` for 24 hours.
- Return requests created offline go into an outbox and are sent when connectivity
  returns.
- The offline modal distinguishes a real network failure from a rejected request, so a
  server error is not misreported as being offline.

---

## Permissions

| Permission | Why |
|---|---|
| `INTERNET` | All API traffic. |
| `CAMERA` | The QR scanner for "Return with QR" uses `getUserMedia`; without the manifest entry the permission prompt is auto-denied and the scanner shows no camera. |

The camera permission is requested at runtime when the scanner is opened.

`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, and `SCHEDULE_EXACT_ALARM` are explicitly
removed from the merged manifest, and the notification/background-check code paths are
switched off. The app therefore never asks for notification permission and never posts
to the Android notification shade.

---

## Project layout

```
mobile-improved/            React app
  src/pages/                Screens (Dashboard, Browse, Borrowings, Fines, …)
  src/api/                  Laravel client, polling, notifications
  src/offline/              Session snapshot, cache, return-request outbox
  src/components/           Shared UI, including AppErrorBoundary and QrScanner
android/                    Capacitor Android project
capacitor.config.ts         Capacitor configuration
releases/                   Built APK for sharing
mobile-app/                 Original Expo / React Native app (reference only)
```

---

## Versioning and releases

- `versionName` lives in `android/app/build.gradle` and must match the newest entry in
  `mobile-improved/src/data/updateLogs.ts`, since that entry is what the Update Logs
  screen shows.
- `versionCode` must only ever increase. Android refuses an update whose code is not
  higher than the installed one.
- Each release gets a git tag and a GitHub Release with the APK attached.

---

## Troubleshooting

**Blank white screen** — the web bundle did not load. After a build, check that
`android/app/src/main/assets/public/index.html` exists.

**Requests fail with a network or CORS error** — confirm `CapacitorHttp.enabled` is still
`true` in `capacitor.config.ts`, and that `mobile-improved/.env.production` exists. Re-run
`npm run apk:release` after changing either.

**Login succeeds, then bounces back to the form** — the session cookie is not sticking.
Check that `CapacitorCookies.enabled` is `true` and that the app is not being loaded
through a remote `server.url`.

**"The app hit an error" screen** — this is the app's own error boundary, not an Android
crash. It shows the error message, and the stack when the thrown value has one, so the
failure can be identified instead of presenting a black screen.

**Book list is empty** — this is backend data. `/books` filters by the student's
`school_id`, so an account with no matching school sees an empty catalogue.
