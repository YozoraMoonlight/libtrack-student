export type ChangeKind = 'New' | 'Improved' | 'Fixed';

export const updateLogs: Array<{
  version: string;
  date: string;
  title: string;
  changes: Array<{kind: ChangeKind;text: string;}>;
}> = [
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

}];