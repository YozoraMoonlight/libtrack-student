import type { ArticleBlock, StartGuide } from '../types/helpCenter';

export const schoolContact = {
  name: 'Lumbia National High School',
  address: 'Lumbia, Cagayan de Oro City',
  phone: '+63 88 000 0001',
  email: 'info@lnhs.edu.ph'
};

export const articleTopics = [
{ id: 'start', label: 'Getting started' },
{ id: 'account', label: 'Account & sign-in' },
{ id: 'borrowing', label: 'Borrowing & returning' },
{ id: 'fines', label: 'Fines & holds' },
{ id: 'updates', label: 'Notifications & updates' }] as
const;

export type ArticleTopicId = (typeof articleTopics)[number]['id'];

export const articles: Array<{id: string;topic: ArticleTopicId;title: string;summary: string;body: ArticleBlock[];}> = [
{
  id: 'sign-in',
  topic: 'start',
  title: 'Signing in to LIBTRACK',
  summary: 'Use your 12-digit LRN or your email address, on the web or in the mobile app.',
  body: [
  { type: 'p', text: 'Students sign in on the Student & Librarian page. You can type either your 12-digit LRN or the email address on your account.' },
  {
    type: 'steps',
    items: [
    'Open LIBTRACK and choose the Student sign-in.',
    'Type your LRN (for example 123456789012) or your email address.',
    'Type your password and press Sign in.']

  },
  { type: 'warning', text: 'If your school registered you, your first password is your surname followed by your birth year — for example Montenegro2005. Change it in Settings after you sign in.' },
  { type: 'p', text: 'On your phone you can also use the LIBTRACK Student Mobile App. It takes the same LRN or email and password.' }]

},
{
  id: 'create-account',
  topic: 'start',
  title: 'Creating your account with your LRN',
  summary: 'Sign up yourself if your school has you on its roster — a code is texted to confirm your number.',
  body: [
  { type: 'p', text: 'If your school has not made your account yet, you can register yourself. Your LRN has to be on your school’s roster and marked enrolled.' },
  {
    type: 'steps',
    items: [
    'Open the Register page and type your 12-digit LRN. LIBTRACK shows your name and school so you can check it is you.',
    'Add your email address, your mobile number (09XXXXXXXXX) and a password.',
    'Type the 6-digit code texted to your number to finish.']

  },
  { type: 'warning', text: 'If LIBTRACK says your LRN was not found or you are not enrolled, ask your school library to check the roster.' }]

},
{
  id: 'qr',
  topic: 'start',
  title: 'Your library QR code',
  summary: 'The QR code on your Dashboard is your library card.',
  body: [
  { type: 'p', text: 'Your Dashboard shows "My Library QR Code". It is your library card: the librarian scans it when you borrow or return books, so the loan is recorded under your name.' },
  { type: 'tip', text: 'Open your Dashboard before you reach the desk so the librarian can scan it right away. Turning up your screen brightness helps the scanner.' },
  { type: 'link', label: 'Open my Dashboard', to: '/app' }]

},
{
  id: 'forgot-password',
  topic: 'account',
  title: 'Forgot your password?',
  summary: 'Reset it yourself with a code texted to the mobile number on your account.',
  body: [
  {
    type: 'steps',
    items: [
    'On the sign-in page, press "Forgot password?".',
    'Type your email address or LRN and press Send code.',
    'A 6-digit code is texted to the mobile number on your account. Type it in.',
    'Choose a new password, type it again, and press Reset password.',
    'Sign in with your new password.']

  },
  { type: 'p', text: 'The code is valid for 10 minutes. If it doesn’t arrive, wait a minute and press "Send a new code".' },
  { type: 'warning', text: 'No text at all? Your account may not have a mobile number on file. Ask your school library to set a new password for you — then add your number in Settings.' }]

},
{
  id: 'change-password',
  topic: 'account',
  title: 'Changing your password',
  summary: 'Settings → Password. You need your current password.',
  body: [
  {
    type: 'steps',
    items: [
    'Open the menu under your name (top right) and choose Settings.',
    'Open the Password tab.',
    'Type your current password, then your new password twice.',
    'Press Update Password. A pop-up confirms the change.']

  },
  { type: 'p', text: 'A strong password has at least 8 characters with upper- and lower-case letters, a number and a symbol, and no spaces. The checklist under the box turns green as you type.' },
  { type: 'link', label: 'Open Settings', to: '/app/settings' }]

},
{
  id: 'update-contact',
  topic: 'account',
  title: 'Updating your mobile number or email',
  summary: 'Keep your number current — reminders and reset codes are texted to it.',
  body: [
  {
    type: 'steps',
    items: [
    'Go to Settings and stay on the Profile tab.',
    'Change your mobile number (09XXXXXXXXX), email address or name.',
    'Press Save Changes. A pop-up tells you what was changed.']

  },
  { type: 'tip', text: 'Due-date reminders and Forgot Password codes go to this number, so keep it one you can reach.' },
  { type: 'p', text: 'If a librarian or your school admin changes your details, you get a notification saying who changed what.' },
  { type: 'link', label: 'Open Settings', to: '/app/settings' }]

},
{
  id: 'disabled',
  topic: 'account',
  title: 'My account was disabled',
  summary: 'Only your school can enable it again — here is what that means.',
  body: [
  { type: 'p', text: 'Your school library can disable a student account — for example after you graduate or transfer. While it is disabled you cannot sign in, and LIBTRACK shows an "Account disabled" message.' },
  { type: 'p', text: 'If it happens while you are signed in, a pop-up tells you who disabled it, and you are signed out.' },
  { type: 'warning', text: 'Talk to your school library if you think it was a mistake. When they enable it again, you will see an "Account enabled" pop-up the next time you sign in.' }]

},
{
  id: 'find-book',
  topic: 'borrowing',
  title: 'Finding a book',
  summary: 'Search by title, author or ISBN and check if a copy is on the shelf.',
  body: [
  {
    type: 'steps',
    items: [
    'Open Browse Books.',
    'Search by title, author or ISBN, or pick a category.',
    'Open a book to see its details and how many copies are available.']

  },
  { type: 'p', text: 'If a copy is available, visit the library to borrow it. LIBTRACK does not hold books for you — whoever reaches the desk first gets the copy.' },
  { type: 'link', label: 'Browse books', to: '/app/browse' }]

},
{
  id: 'borrow',
  topic: 'borrowing',
  title: 'How to borrow a book',
  summary: 'Bring the book and your library QR code to the desk. Up to 3 books at a time.',
  body: [
  {
    type: 'steps',
    items: [
    'Find the book on the shelf (check Browse Books first if you like).',
    'Bring it to the librarian’s desk and show your library QR code from your Dashboard.',
    'The librarian scans the QR label on the book and sets the due date.',
    'The book appears in My Borrowings with its due date, and you get a "Book borrowed" notification.']

  },
  {
    type: 'bullets',
    items: [
    'You can have up to 3 books out at a time.',
    'Only one copy of the same title at a time.',
    'You can’t borrow while you have an unpaid fine or a credential hold.']

  }]

},
{
  id: 'return',
  topic: 'borrowing',
  title: 'How to return a book',
  summary: 'Ask to return it in My Borrowings, then hand it to the librarian — the loan closes when they confirm.',
  body: [
  {
    type: 'steps',
    items: [
    'Open My Borrowings.',
    'Press Return on the book — or press "Return with QR" and scan the QR label on the book.',
    'The book now says "Waiting for librarian". Hand it to the librarian.',
    'The librarian receives it and the loan closes. You get a "Book returned" notification.']

  },
  { type: 'warning', text: 'Asking to return is not the return itself. Until the librarian receives the book it is still on your account, and an overdue fine keeps counting.' },
  { type: 'p', text: 'Changed your mind? Press Cancel next to "Waiting for librarian".' },
  { type: 'link', label: 'Open My Borrowings', to: '/app/borrowings' }]

},
{
  id: 'due-dates',
  topic: 'borrowing',
  title: 'Due dates and reminders',
  summary: 'See every due date in My Borrowings. A reminder is texted on the day a book is due.',
  body: [
  { type: 'p', text: 'Each book in My Borrowings shows its due date, and your Dashboard lists what is due soon.' },
  { type: 'p', text: 'On the morning a book is due, LIBTRACK texts a reminder to the mobile number on your account.' },
  { type: 'p', text: 'If the librarian changes a due date, you get a notification with the new date.' },
  { type: 'warning', text: 'A book not returned by its due date becomes overdue and earns a fine of ₱5.00 for every day late.' }]

},
{
  id: 'fines',
  topic: 'fines',
  title: 'How fines work',
  summary: '₱5.00 for every day a book is overdue. Pay at the library.',
  body: [
  {
    type: 'bullets',
    items: [
    'Overdue: ₱5.00 for each day late, updated every morning until the book is returned.',
    'Lost or damaged books: the librarian adds a fine for the book.']

  },
  { type: 'p', text: 'You can see every fine, and your total unpaid amount, in My Fines. Pay at the library; the librarian marks the fine as paid and you get a notification.' },
  { type: 'warning', text: 'While any fine is unpaid you can’t borrow books.' },
  { type: 'link', label: 'Open My Fines', to: '/app/fines' }]

},
{
  id: 'holds',
  topic: 'fines',
  title: 'Credential holds',
  summary: 'A hold stops borrowing until your fines or overdue books are cleared.',
  body: [
  { type: 'p', text: 'A credential hold means the library has flagged your account until something is settled. It is placed automatically when:' },
  { type: 'bullets', items: ['your unpaid fines reach ₱50.00, or', 'a book is overdue by more than 14 days.'] },
  { type: 'p', text: 'The librarian can also place a hold, for example for an unpaid fine. You get a notification either way, with the reason.' },
  { type: 'p', text: 'While on hold you can’t borrow books. Pay the fines or return the books and the hold is released — you get a "hold released" notification.' }]

},
{
  id: 'notifications',
  topic: 'updates',
  title: 'Notifications',
  summary: 'What the bell tells you, and why.',
  body: [
  { type: 'p', text: 'When something happens to your account, a red number appears on the bell at the top of the screen. The notice stays under the bell until you read it. You are told when:' },
  {
    type: 'bullets',
    items: [
    'you change your password or profile, or someone at your school changes it for you;',
    'your account is disabled or enabled;',
    'you borrow or return a book, or a due date changes;',
    'a librarian adds a fine or marks it paid, or a credential hold is placed or released;',
    'your enrollment status, grade or section changes.']

  },
  { type: 'p', text: 'Press the bell to see them all. "Mark all as read" clears the red count.' }]

},
{
  id: 'whats-new',
  topic: 'updates',
  title: 'Seeing what’s new in LIBTRACK',
  summary: 'Update Logs in the account menu lists every update to this app.',
  body: [
  { type: 'p', text: 'Open the account menu under your name at the top right and choose Update Logs. Every version is listed, newest first.' },
  { type: 'link', label: 'Open Update Logs', to: '/app/updates' }]

}];


export const productDemos = [
{
  id: 'borrow',
  title: 'Borrowing a book',
  summary: 'From finding the book to seeing it in My Borrowings.',
  to: '/demos/borrow',
  steps: [
  'Search for the book in Browse and check that a copy is available.',
  'Note its shelf location and pick it up.',
  'Show your QR code from Home at the circulation desk.',
  'The book appears in Borrowings with its due date.']

},
{
  id: 'return',
  title: 'Returning a book',
  summary: 'Ask to return it, then hand it to the librarian.',
  to: '/demos/return',
  steps: [
  'Open Borrowings and tap the book you’re returning.',
  'Choose Return to let the library know it’s coming back.',
  'Hand it to the librarian — the loan closes when they confirm.']

},
{
  id: 'reset',
  title: 'Resetting a forgotten password',
  summary: 'Get a code by text and choose a new password.',
  to: '/demos/reset',
  steps: [
  'Press "Forgot password?" on the sign-in page.',
  'Type your email or LRN and press Send code.',
  'Enter the code and a new password.']

},
{
  id: 'profile',
  title: 'Updating your profile and password',
  summary: 'Change your mobile number, email or password in Settings.',
  to: '/demos/profile',
  steps: [
  'Open Settings from the account menu.',
  'Edit your mobile number or email and save.',
  'Under Password, enter your current password and a new one.']

},
{
  id: 'notifications',
  title: 'Notifications and updates',
  summary: 'Where notifications go, and how to see updates.',
  to: '/demos/notifications',
  steps: [
  'A red number on the bell means something changed on your account.',
  'Press the bell to see every notification.',
  'Open Update Logs from the account menu to see what’s new.']

}];


export interface DemoWalkthrough {
  title: string;
  summary: string;
  cta: {label: string;to: string;};
  steps: Array<{title: string;text: string;}>;
}

const returnDemo: DemoWalkthrough = {
  title: 'Returning a book',
  summary: 'Ask to return it, then hand it to the librarian.',
  cta: { label: 'Try it now: Open My Borrowings', to: '/app/borrowings' },
  steps: [
  { title: 'Open My Borrowings', text: 'The Return Books box lists every book you still have.' },
  { title: 'Press Return — or scan the book', text: 'Press Return next to the book, or press "Return with QR" and scan the label on the book.' },
  {
    title: 'Hand it to the librarian',
    text: 'The book says "Waiting for librarian". It stays on your account until the librarian receives it — then it disappears from this list.'
  }]

};

const borrowDemo: DemoWalkthrough = {
  title: 'Borrowing a book',
  summary: 'From finding the book to seeing it in My Borrowings.',
  cta: { label: 'Try it now: Browse books', to: '/app/browse' },
  steps: [
  { title: 'Find the book', text: 'Open Browse Books and search by title, author or ISBN, or filter by category.' },
  { title: 'Check that a copy is available', text: 'Open the book. The Availability box says whether a copy is on the shelf.' },
  { title: 'Show your library QR code', text: 'At the desk, open your Dashboard. The librarian scans your QR code, then the book’s label.' },
  { title: 'It’s on your account', text: 'The book appears in My Borrowings with its due date, and a "Book borrowed" notification appears under the bell.' }]

};

const profileDemo: DemoWalkthrough = {
  title: 'Updating your profile and password',
  summary: 'Change your mobile number, email or password in Settings.',
  cta: { label: 'Try it now: Open Settings', to: '/app/settings' },
  steps: [
  { title: 'Open Settings', text: 'Use the menu under your name at the top right.' },
  { title: 'Edit your profile', text: 'On the Profile tab, change your mobile number, email or name and press Save Changes.' },
  { title: 'Change your password', text: 'On the Password tab, type your current password and the new one twice. A pop-up confirms it.' }]

};

const resetDemo: DemoWalkthrough = {
  title: 'Resetting a forgotten password',
  summary: 'Get a code by text and choose a new password.',
  cta: { label: 'Try it now: Reset my password', to: '/forgot-password' },
  steps: [
  { title: 'Press "Forgot password?"', text: 'It is next to the Password box on the sign-in page.' },
  { title: 'Type your email or LRN', text: 'Press Send code. A 6-digit code is texted to the mobile number on your account.' },
  {
    title: 'Enter the code and a new password',
    text: 'Type the code, then your new password twice, and press Reset password. Sign in with the new password.'
  }]

};

const notificationsDemo: DemoWalkthrough = {
  title: 'Notifications and updates',
  summary: 'Where notifications go, and how to see updates.',
  cta: { label: 'Try it now: Open my Dashboard', to: '/app' },
  steps: [
  { title: 'Watch for the red number', text: 'When something changes on your account, a red number appears on the bell at the top of the screen.' },
  { title: 'Everything is kept under the bell', text: 'Press the bell to see all your notifications. "Mark all as read" clears the red count.' },
  { title: 'See what’s new', text: 'Open the account menu under your name and choose Update Logs to see every update to LIBTRACK.' }]

};

export const demoWalkthroughs: Record<string, DemoWalkthrough> = {
  notifications: notificationsDemo,
  borrow: borrowDemo,
  return: returnDemo,
  reset: resetDemo,
  profile: profileDemo
};

export const startGuides: StartGuide[] = [
{
  id: 'quick-start',
  kind: 'guide',
  title: 'Student Quick Start Guide',
  summary: 'Everything you need for your first week with LIBTRACK — sign in, borrow, return, fines.',
  sections: [
  {
    heading: 'Sign in',
    items: [
    'Go to the Student sign-in and type your 12-digit LRN (or email) and your password.',
    'School-registered accounts start with the password Surname + birth year (e.g. Montenegro2005). Change it in Settings → Password.',
    'Forgot it? Press "Forgot password?" — a code is texted to your mobile number.']

  },
  {
    heading: 'Your library QR code',
    items: [
    'Your Dashboard shows "My Library QR Code". It is your library card.',
    'Show it at the desk whenever you borrow or return a book.']

  },
  {
    heading: 'Borrow',
    items: [
    'Find the book in Browse Books, then bring it and your QR code to the librarian.',
    'Up to 3 books at a time, one copy per title.',
    'Not possible while you have an unpaid fine or a credential hold.']

  },
  {
    heading: 'Return',
    items: [
    'My Borrowings → Return (or "Return with QR") → hand the book to the librarian.',
    'The loan closes only when the librarian receives the book.']

  },
  {
    heading: 'Due dates and fines',
    items: [
    'A reminder is texted on the morning a book is due.',
    'Overdue books: ₱5.00 per day. Pay at the library.',
    'Unpaid fines of ₱50.00 or a book 14 days overdue put a hold on borrowing.']

  },
  {
    heading: 'Stay informed',
    items: [
    'The bell keeps every notification about your account.',
    'Update Logs in the account menu shows what’s new in LIBTRACK.',
    'Keep your mobile number up to date in Settings → Profile.',
    'Questions? Open the Help Desk (the ? button) or visit your school library.']

  }]

},
{
  id: 'checklist',
  kind: 'checklist',
  title: 'Borrowing & Returning Checklist',
  summary: 'A one-page checklist to keep in your notebook.',
  sections: [
  {
    heading: 'Before you borrow',
    items: [
    'I have no unpaid fines and no credential hold.',
    'I have fewer than 3 books out.',
    'My Dashboard (library QR code) is open on my phone.']

  },
  {
    heading: 'When I borrow',
    items: ['The librarian scanned my QR code and the book’s label.', 'I checked the due date in My Borrowings.']
  },
  {
    heading: 'When I return',
    items: [
    'I pressed Return (or "Return with QR") in My Borrowings.',
    'I handed the book to the librarian.',
    'The book is gone from my Return Books list and I got a "Book returned" notification.']

  },
  {
    heading: 'If something goes wrong',
    items: [
    'Late: ₱5.00 per day until the librarian receives the book.',
    'Lost or damaged: tell the librarian right away.',
    'Forgot my password: "Forgot password?" on the sign-in page.']

  }]

}];