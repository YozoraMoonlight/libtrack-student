# LIBTRACK Mobile-Improved Frontend

Standalone React/Vite student frontend for the existing LIBTRACK Laravel
backend. The existing web UI is not modified.

## Run locally

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The development server proxies the
Laravel routes to `https://libtrack.laravel.cloud`, forwards the Laravel
session cookies, and rewrites redirects back to the Vite origin.

Copy `.env.example` to `.env` only if the proxy target needs to change:

```env
VITE_API_ORIGIN=
LIBTRACK_LARAVEL_ORIGIN=https://libtrack.laravel.cloud
```

`VITE_API_ORIGIN` stays blank for the local proxy. The backend is not deployed
or modified by this frontend.

## Current integration status

- Phase 0: boundaries and live route contract recorded
- Phase 1: frontend baseline builds successfully
- Phase 2: Laravel CSRF/session client and local development proxy connected
- Phase 3: authenticated dashboard shell and student data surfaces connected
- Phase 4: LRN lookup and OTP registration flow connected
- Phase 5: books, borrowings, fines, settings, return requests, and QR scanning connected
- Phase 6: 24-hour local data cache, API-aware offline modal, and return-request outbox connected
