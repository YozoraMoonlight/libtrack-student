# LIBTRACK Student

An Android app for students to use their school library from a phone — browse the
catalogue, read available book PDFs in-app, build a borrow request in a cart, see what
is borrowed and when it is due, check fines, and request a return (from the list or by
scanning a book's QR label).

The app is a React + TypeScript front end bundled for Android with Capacitor. It talks
to a LIBTRACK Laravel backend over HTTPS using existing Inertia page props and form
routes (no separate JSON API). This repository also contains that backend, but this
document focuses on the student app.

**Version 2.4.2** (`versionCode 8`) · `com.libtrack.studentapp` · Android 7.0+ (API 24)

---

## About this app

This is the **reworked** LIBTRACK student app.

The original app (`mobile-app/` in this repository) was built with Expo and React
Native. This version was rebuilt as a React + Vite front end in `mobile-improved/` and
wrapped for Android with Capacitor. That rework enabled a redesigned interface (layout,
typography, colour, dark mode), reworked core screens, and newer features such as the
Borrow Cart, in-app PDF reading, due-date countdowns, Help Center, and Update Logs.

It talks to the same Laravel backend and uses the same student accounts.

---

## What it does

**Accounts**

- Sign in with an LRN (or email, where supported) and password.
- Self-registration: look up an LRN, receive a 6-digit code by SMS, then set a password
  (mobile number can be prefilled when the school record provides it).
- Forgot password through the SMS code flow.
- Profile/settings: update name fields, email and phone (as supported by the backend),
  and view account/school details.

**Browsing and reading**

- **Browse** — book catalogue with covers, availability, and book details.
- Books that have a PDF are marked in the list, can be filtered with **PDF only**, and
  can be opened with **Read PDF** (including from borrowing history for titles with a PDF).
- **Read PDF** is in-app and read-only for students (no download/print). Reading a PDF is
  separate from borrowing — it does not create a loan, count against a limit, or have a
  due date/fine. A physical copy can be added to the Borrow Cart from the reader when
  available.

**Borrowing**

- **Borrow Cart** — add titles from Browse (or scan a shelf label), review the list, see
  the school’s borrowing limit (or **No borrowing limit** if none is set), send one
  request, and collect released books at the desk. Pending/request status and cart history
  are shown in-app.
- **Dashboard** — library QR code for the desk, borrowing summary, upcoming due dates, and
  recent activity.
- **Borrowings** — active loans/return requests and history. Due dates show a plain
  **days-left countdown** (e.g. “3 days left”, “Due today”, “Overdue by 2 days”) for
  items not yet returned. A return can be requested from the list or by scanning the
  book’s QR label; the librarian confirms it at the desk.
- **Fines** — outstanding and paid fines.

**Everything else**

- In-app notifications under the bell (server feed when reachable, with local fallback
  handling for circulation events), including account and borrowing-related updates.
- Offline tolerance: recent successful data can be cached, and return requests made
  without a connection are queued and sent when connectivity returns.
- Stays signed in across app close/restart (session snapshot/restore).
- Dark mode.
- Help Center and Update Logs.

System (Android shade/push) notifications are intentionally disabled in this build.
Alerts appear inside the app instead; see [Permissions](#permissions).

---

## Download

The latest signed APK is attached to the newest GitHub release:

```
https://github.com/YozoraMoonlight/libtrack-student/releases/latest
```

> If the repository is private, that link only works for accounts with access. If a
> recipient cannot open it, share the `.apk` file directly.

### Installing

1. Open the downloaded `.apk` on the phone.
2. If Android blocks it, allow **Install unknown apps** for the app you downloaded with,
   then go back and tap **Install**.

If an older LIBTRACK build signed with a **different key** is already installed, Android
will refuse the update. Uninstall the old app first (this clears its saved session). A
normally signed update with a higher `versionCode` installs in place.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript, React Router |
| Styling | Tailwind CSS, Framer Motion |
| Build | Vite 5 |
| Android shell | Capacitor 8 |
| PDF reading | `pdfjs-dist` (in-app canvas rendering) |
| QR scanning | `html5-qrcode` (camera via `getUserMedia`) |
| Packaging | Gradle, `compileSdk`/`targetSdk` 36, `minSdk` 24 |

---

## Run the web app locally

```bash
cd mobile-improved
npm install
npm run dev
```

The dev server can proxy Laravel routes to the origin in `LIBTRACK_LARAVEL_ORIGIN` and
keep the session usable over local HTTP.

```bash
cp .env.example .env
```

Keep `VITE_API_ORIGIN` blank during development so requests go through the Vite proxy
(unless you intentionally target a direct origin).

---

## Build the APK

From the repository root:

```bash
npm install
npm install --prefix mobile-improved

npm run apk:debug      # debuggable build
npm run apk:release    # signed release build
```

Both scripts run the chain: Vite build → `cap sync android` → Gradle assemble.

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
- A JDK. Example (PowerShell):
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  ```

### Release signing

Release builds are signed from `android/keystore.properties`, which references the
keystore file. **Neither is committed** (gitignored).

- Without them, `apk:release` may produce an **unsigned** APK that will not install.
- Losing the keystore means you cannot ship updates to an installed app (Android requires
  the same signing key). Keep a backup outside this repository.

---

## How it talks to the backend

A packaged app has no Vite dev server, and the Laravel host does not provide CORS headers
for the WebView origin, so plain browser `fetch` would be blocked. `capacitor.config.ts`
handles this with:

- **`webDir: 'mobile-improved/dist'`** — run from bundled assets.
- **`CapacitorHttp.enabled`** — native HTTP stack (no browser CORS policy), with the
  Laravel session cookie kept in the platform jar.
- **`CapacitorCookies.enabled`** — keeps `document.cookie` in sync.

The production origin is set in `mobile-improved/.env.production` and read as
`API_ORIGIN` in `mobile-improved/src/api/laravel.ts`.

The backend authenticates with an encrypted session cookie plus CSRF. The client:

- fetches a CSRF token and sends `X-CSRF-TOKEN` on mutations (with refresh/replay on `419`)
- sends `X-Inertia` / `X-Inertia-Version` on reads and re-bootstraps on `409` / `412`
- checks final URLs so a redirect to login is not treated as app data

Representative routes/endpoints used include: `/mobile/login`, `/mobile/register/*`,
`/student/dashboard`, `/books`, `/books/{id}`, `/books/{id}/read`, `/book-pdfs/{id}`,
`/borrow-cart` (and cart actions), `/borrowings`, `/borrowings/return-request`,
`/my-fines`, `/notifications/feed` (when available), `/user/settings/*`, `/logout`.

---

## Session persistence

Android may freeze or kill a backgrounded WebView, so the session cookie is snapshotted
when the app goes to the background and restored on launch
(`mobile-improved/src/offline/sessionCookies.ts`). A session ends when the user logs out
or the server rejects it.

---

## Offline behaviour

- Successful responses may be cached locally for resilience.
- Return requests created offline can be queued in an outbox and sent when connectivity
  returns.
- The app distinguishes connectivity failures from server/request errors where possible.

---

## Permissions

| Permission | Why |
|---|---|
| `INTERNET` | All backend traffic. |
| `CAMERA` | QR scanning (e.g. “Return with QR”, shelf/label scans) uses `getUserMedia`; requested at runtime when the scanner opens. |

System notification-related permissions/paths are disabled/removed in this build; alerts
are shown in-app.

---

## Project layout

```
mobile-improved/            React app (Vite)
  src/pages/                Screens (Dashboard, Browse, Borrowings, Borrow Cart, Read Book, Fines, …)
  src/api/                  Laravel/Inertia client, cart, notifications, adapters
  src/offline/              Session snapshot, cache, outbox
  src/components/           Shared UI (book covers, PDF reader, QR scanner, app shell, …)
  src/data/                 In-app help content, update logs
android/                    Capacitor Android project
capacitor.config.ts         Capacitor configuration
mobile-app/                 Original Expo / React Native app (reference only)
```

---

## Versioning and releases

- `versionName` in `android/app/build.gradle` must match the newest entry in
  `mobile-improved/src/data/updateLogs.ts` (shown in Update Logs).
- `versionCode` must only ever increase (Android rejects updates with a lower/equal code).
- Each release is tagged in git and published as a GitHub Release with the APK attached.

---

## Troubleshooting

**Blank white screen** — the web bundle did not load. After a build, check that
`android/app/src/main/assets/public/index.html` exists.

**Requests fail with a network or CORS error** — confirm `CapacitorHttp.enabled` is
`true` in `capacitor.config.ts` and `mobile-improved/.env.production` is set correctly,
then rebuild (`npm run apk:release`).

**Login succeeds, then bounces back to the form** — the session cookie is not sticking.
Check `CapacitorCookies.enabled` and ensure the app is not loaded via a remote
`server.url`.

**"The app hit an error" screen** — the app’s error boundary caught a runtime error (not
an Android crash). It shows details to help identify the issue.

**Book list is empty** — usually backend/data-related (e.g. `/books` filtered by the
student’s `school_id`). An account without a matching school/catalogue may see no books.
