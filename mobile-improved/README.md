# LIBTRACK Student App (mobile-improved)

React + TypeScript + Vite front end for the LIBTRACK student mobile app. It is bundled
into the Android app with Capacitor (`webDir: mobile-improved/dist`) and talks to the
existing Laravel/Inertia backend over HTTPS (session + CSRF), not a separate JSON API.

See the repository root [`README.md`](../README.md) for the full app overview, features,
build/signing steps, and troubleshooting.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

- `VITE_API_ORIGIN` stays blank for local development so requests go through the Vite
  proxy.
- `LIBTRACK_LARAVEL_ORIGIN` sets the backend origin the dev proxy targets.
- Copy `.env.example` to `.env` if you need to change the proxy target.

## Build

```bash
npm run build
```

This runs the mock-data guard and produces `dist/`, which Capacitor syncs into the
Android project (`cap sync android` from the repo root).

## Notes

- Production API origin is configured in `.env.production` and consumed by
  `src/api/laravel.ts`.
- Main areas: `src/pages` (screens), `src/api` (Laravel/Inertia client, cart,
  notifications), `src/components` (UI, PDF reader, QR scanner), `src/offline`
  (session/cache/outbox), `src/data` (help content, update logs).
