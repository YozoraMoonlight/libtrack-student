# LIBTRACK Mobile-Improved Integration Contract

## Scope

This folder is the separate student frontend. The existing Laravel web UI is
not modified.

## Backend origin

```text
https://libtrack.laravel.cloud
```

The frontend reuses the existing Laravel session routes and does not deploy or
modify the online backend.

## Existing routes to reuse

- `POST /mobile/login`
- `GET /mobile/register`
- `POST /mobile/register/lookup-lrn`
- `POST /mobile/register/initiate`
- `POST /mobile/register/resend`
- `POST /mobile/register/verify`
- `POST /mobile/register/cancel`
- `GET /student/dashboard`
- `GET /books`
- `GET /books/{book}`
- `GET /books/{book}/qr-code`
- `GET /borrowings`
- `POST /borrowings/return-request`
- `DELETE /borrowings/{transaction}/return-request`
- `GET /my-fines`
- `GET /user/settings`
- `PUT /user/settings/profile`
- `PUT /user/settings/password`
- `POST /api/qr/lookup`

## Integration rules

- Preserve the current visual design and components.
- Replace mock data only after the session transport works.
- Maintain Laravel cookies and CSRF handling.
- Use the server as the source of truth.
- Phase 4 uses the existing Laravel mobile registration routes and OTP session.
- Phase 5 uses live Inertia data for books, borrowings, fines, settings, and QR.
- Phase 6 caches the last 24 hours of student data, shows an API-aware offline state, and queues return requests for replay.
- No deployment, no changes to the online repository, and no edits to the
  existing web components.

## Connection gate

The Phase 2 probe reached the live host successfully, but the host did not
return `Access-Control-Allow-Origin` for a Vite origin. A separate browser
origin therefore cannot directly reuse the Laravel session cookies yet.

For local development, `vite.config.ts` now proxies the Laravel routes to
`https://libtrack.laravel.cloud`, forwards cookies, and rewrites absolute
Laravel redirects back to the Vite origin. Set `VITE_API_ORIGIN=` locally; set
it to the Laravel origin only when the frontend is served from that same origin
or CORS has been enabled.

This proxy is a development aid only. It does not deploy or modify the backend.
A CORS or same-origin failure remains a connection blocker, not a reason to fall
back to mock data.

Phase 2 smoke test result: the proxy returned the live login page, delivered a
CSRF token, preserved the session cookie, returned the real Laravel `422` for
an invalid login, and rewrote an unauthenticated dashboard redirect back to the
local Vite origin.
