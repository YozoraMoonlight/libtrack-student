export type ChangeKind = 'New' | 'Improved' | 'Fixed';

export const updateLogs: Array<{
  version: string;
  date: string;
  title: string;
  changes: Array<{kind: ChangeKind;text: string;}>;
}> = [
{
  version: '2.3.0',
  date: '2026-11-14',
  title: 'Borrow Cart, book covers and notification upgrades',
  changes: [
  { kind: 'New', text: 'Borrow Cart: pick titles from Browse (or scan the shelf label), check your school\'s limit, send one request, and collect the books at the desk.' },
  { kind: 'New', text: 'Book covers now appear in Browse, the book details sheet and the cart. Titles without artwork keep a neat placeholder.' },
  { kind: 'New', text: 'The borrowing limit is read from your school\'s settings instead of a fixed "3 books", and closed days are skipped when the librarian sets a due date.' },
  { kind: 'New', text: 'Profile now edits first, middle and last name plus the mobile number, and shows your LRN, academic strand and school.' },
  { kind: 'Improved', text: 'Notifications use the newer server feed, so cart and request updates arrive correctly, unread dots clear properly, and the owl announces each new event once.' },
  { kind: 'Improved', text: 'Account menu shows a dot when a new release is available; opening Update Logs clears it.' },
  { kind: 'Improved', text: 'Registration can prefill the mobile number when the school\'s student record has one.' },
  { kind: 'Fixed', text: 'A disabled account is now explained on screen and signed out safely instead of failing silently.' }]
},
{
  version: '2.2.1',
  date: '2026-11-13',
  title: 'Scanner fix',
  changes: [
  { kind: 'Fixed', text: 'Scanning a book QR code could show “The app hit an error” right after the code was read. The camera is now shut down safely, once per scan.' },
  { kind: 'Fixed', text: 'Closing the scanner before the camera finished starting no longer triggers the same error.' }]
},
{
  version: '2.2.0',
  date: '2026-10-06',
  title: 'Session persistence',
  changes: [
  { kind: 'Fixed', text: 'App now remembers your login across cold starts and restarts — the session is restored from a saved snapshot instead of forcing a re-login.' },
  { kind: 'Fixed', text: '`restoreSessionCookies` verifies the jar before writing, so a transient empty read never overwrites a good session.' },
  { kind: 'Fixed', text: '`purgeNativeCookies` and `clearCookies` removed — the app no longer destroys a valid snapshot with an empty one.' },
  { kind: 'Fixed', text: '`hasSavedSession` guard ensures the restoring screen only appears when there is a real snapshot to restore from.' },
  { kind: 'Fixed', text: 'Background `watchForBackgroundPersist` saves the cookie on every app background transition, so the snapshot is always fresh.' }]
},
{
  version: '2.1.0',
  date: '2026-10-05',
  title: 'Help Desk, notifications and forgot password',
  changes: [
  { kind: 'New', text: 'Help Desk with answers to common questions, start guides and step-by-step product demos. Open it from the account menu.' },
  { kind: 'New', text: 'Notifications under the bell. A red number shows when something changes on your account or borrowings.' },
  { kind: 'New', text: 'Forgot your password? Press “Forgot password?” on the sign-in page and a 6-digit code is texted to your mobile number.' }]
},
{
  version: '2.0.0',
  date: '2026-09-25',
  title: 'The LIBTRACK app, reworked',
  changes: [
  { kind: 'Improved', text: 'A redesigned app — new look for the Dashboard, Browse, Borrowings and Fines.' },
  { kind: 'New', text: 'Dark mode, available from the top of the screen.' },
  { kind: 'New', text: 'Settings to edit your profile and change your password.' },
  { kind: 'New', text: 'Update Logs, so you can see what changed in each version.' }]

},
{
  version: '1.0.0',
  date: '2026-05-07',
  title: 'LIBTRACK mobile launch',
  changes: [
  { kind: 'New', text: 'Sign in with your LRN, browse books, show your library QR code, and track your borrowings and fines on your phone.' }]

}]