import type { AppNotification } from '../types/notifications';

export const notifications: AppNotification[] = [
{
  id: 'n-account-mobile',
  kind: 'account',
  title: 'Your account was updated',
  body: 'School Admin Admin User updated your mobile number.',
  actor: 'Admin User',
  time: 'Just now',
  unread: true
},
{
  id: 'n-borrow-gatsby',
  kind: 'borrow',
  title: 'Book borrowed',
  body: 'You borrowed “The Great Gatsby” (ACC-00003-002). Please return it by Oct 7, 2026.',
  actor: 'Maria Santos',
  time: '2h ago',
  unread: true
},
{
  id: 'n-borrow-mockingbird',
  kind: 'borrow',
  title: 'Book borrowed',
  body: 'You borrowed “To Kill a Mockingbird” (ACC-00001-002). Please return it by Oct 4, 2026.',
  actor: 'Maria Santos',
  time: '2h ago',
  unread: false
},
{
  id: 'n-fine-paid',
  kind: 'fine',
  title: 'Fine marked as paid',
  body: 'Your ₱15.00 overdue fine for “Noli Me Tangere” was marked as paid.',
  actor: 'Maria Santos',
  time: 'Sep 24',
  unread: false
},
{
  id: 'n-hold-released',
  kind: 'hold',
  title: 'Credential hold released',
  body: 'Your fines are settled, so you can borrow books again.',
  actor: 'LIBTRACK',
  time: 'Sep 24',
  unread: false
}];