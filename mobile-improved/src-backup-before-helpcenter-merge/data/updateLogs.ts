export type ChangeKind = 'New' | 'Improved' | 'Fixed';

export const updateLogs: Array<{
  version: string;
  date: string;
  title: string;
  changes: Array<{kind: ChangeKind;text: string;}>;
}> = [
{
  version: '1.5.0',
  date: '2026-10-01',
  title: 'Clearer return tracking',
  changes: [
  { kind: 'New', text: 'A "Waiting for approval" list showing every return you have asked for, and how you asked for it.' },
  { kind: 'Improved', text: 'Books you already requested now move out of the return list, so nothing is duplicated.' },
  { kind: 'Improved', text: 'A book leaves the waiting list on its own once the librarian confirms the return.' },
  { kind: 'Fixed', text: 'The app no longer says a book was returned before the librarian has confirmed it.' },
  { kind: 'Fixed', text: 'The offline notice now clears itself once your connection is back.' }]

},
{
  version: '1.4.0',
  date: '2026-09-26',
  title: 'Help Desk and update logs',
  changes: [
  { kind: 'New', text: 'Help Desk with library hours, contact details, and answers to common questions.' },
  { kind: 'New', text: 'Update logs so you can see what changed in each version.' }]

},
{
  version: '1.3.0',
  date: '2026-09-18',
  title: 'Dark mode and app icons',
  changes: [
  { kind: 'New', text: 'Dark mode, available from the account menu.' },
  { kind: 'Improved', text: 'Smoother transition when switching themes.' },
  { kind: 'Improved', text: 'Refreshed LIBTRACK app icon.' }]

},
{
  version: '1.2.0',
  date: '2026-09-08',
  title: 'Offline notice',
  changes: [
  { kind: 'New', text: 'A notice appears when you lose connection, so you know data may be out of date.' },
  { kind: 'Fixed', text: 'Due dates now show in the correct time zone.' }]

},
{
  version: '1.1.0',
  date: '2026-08-28',
  title: 'Account settings',
  changes: [
  { kind: 'New', text: 'Edit your profile and change your password in Settings.' },
  { kind: 'Improved', text: 'Faster book search in Browse.' }]

},
{
  version: '1.0.0',
  date: '2026-08-15',
  title: 'LIBTRACK mobile launch',
  changes: [
  { kind: 'New', text: 'Log in with your LRN, browse books, and track your borrowings and fines on your phone.' }]

}];