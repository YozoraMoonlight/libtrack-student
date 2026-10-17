# LIBTRACK Student — native app

True native React Native (Expo) client for LIBTRACK. It is **not** a WebView
wrapper: every screen is a real native component, and it talks to the live
Laravel backend over native networking.

## Run it

```bash
cd mobile-app
npm install
npm run android     # device/emulator via Expo (native build)
# or
npm start           # then scan the QR with Expo Go
```

## Backend

Origin is `https://libtrack.laravel.cloud`, set in `app.json` under
`expo.extra.origin` (override with the `API_URL` env var).

The app uses the **same session/Inertia routes as the web app** — no separate
API layer and nothing to deploy:

| Screen        | Route                                       |
| ------------- | ------------------------------------------- |
| Sign in       | `GET/POST /mobile/login`                    |
| Register      | `/mobile/register/*` (LRN lookup, OTP)      |
| Home          | `GET /student/dashboard`                    |
| Browse        | `GET /books`                                |
| Book QR       | `GET /books/{book}/qr-code`                 |
| Loans         | `GET /borrowings`                           |
| Return        | `POST /borrowings/return-request`           |
| Fines         | `GET /my-fines`                             |
| Profile       | `PUT /user/settings/profile`                |
| Password      | `PUT /user/settings/password`               |
| Sign out      | `GET /logout`                               |

## How session auth works natively

Laravel authenticates with an encrypted session cookie plus a CSRF token, and
`fetch` alone does not carry those between calls. `src/api/client.ts` therefore
implements what a browser gives you for free:

- **Cookie jar** — parses every `Set-Cookie` (including combined headers and
  `Expires` commas), keeps `libtrack_session` / `XSRF-TOKEN`, and replays them
  on later requests. Persisted to `AsyncStorage` so a warm start keeps its
  session.
- **CSRF** — reads `<meta name="csrf-token">` from `/mobile/login` and sends
  `X-CSRF-TOKEN`. A `419` triggers one refresh-and-replay.
- **Inertia** — sends `X-Inertia` plus `X-Inertia-Version`, and re-bootstraps
  once on `409`/`412`.
- **Redirect safety** — native `fetch` follows redirects, so a signed-out read
  lands on the login page with a `200`. The client checks the final URL and
  raises `SessionExpiredError` instead of parsing a login page as app data.
- **Offline** — return requests are queued in `AsyncStorage` and flushed on
  reconnect (`src/offline/outbox.ts`); the server's duplicate guard is the
  source of truth.

Native networking has no browser CORS layer, so the app calls the live origin
directly. The web build in `mobile-improved` still needs its Vite proxy because
browsers do enforce CORS.

## Verify the live contract

```bash
npm run check:contract   # routes, CSRF, Inertia version, no data leaks
npm run check:auth       # bootstrap, signed-out bounce, failed login
npm run types
```

Both scripts run against the live host using read-only requests and deliberately
invalid credentials, so they are safe to re-run.

## Layout

```
App.tsx                 navigation (auth stack + bottom tabs), outbox flushing
src/api/client.ts       live Laravel session client (cookies, CSRF, Inertia)
src/api/hooks.ts        react-query hooks over the live routes
src/auth/AuthContext.tsx  session state, sign in/out, cache invalidation
src/theme.tsx           light/dark palette matching the rawr design
src/components/         TextField, Button, cards, badges, QR tile
src/screens/            Login, Register, Dashboard, Books, BookDetail,
                        Borrowings, Fines, Scan, Settings
src/offline/outbox.ts   queued return requests
scripts/                live contract checks
```

## Known backend behaviour

`GET /books` filters by `books.school_id = user.school_id`. A student whose
record has no matching `school_id` sees an empty catalog. That is live data, not
a client bug.
