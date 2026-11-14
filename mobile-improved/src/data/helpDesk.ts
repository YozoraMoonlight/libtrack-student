export const libraryDesk = {
  location: 'Main Library, Ground Floor — Circulation Desk',
  hours: [
  { day: 'Monday', open: '7:30 AM', close: '5:00 PM' },
  { day: 'Tuesday', open: '7:30 AM', close: '5:00 PM' },
  { day: 'Wednesday', open: '7:30 AM', close: '5:00 PM' },
  { day: 'Thursday', open: '7:30 AM', close: '5:00 PM' },
  { day: 'Friday', open: '7:30 AM', close: '4:00 PM' },
  { day: 'Saturday', open: '', close: '' },
  { day: 'Sunday', open: '', close: '' }]

};

export const helpContacts = [
{ id: 'email', label: 'Email the librarian', value: 'library@school.edu.ph', href: 'mailto:library@school.edu.ph' },
{ id: 'phone', label: 'Call the library', value: '(02) 8123 4567', href: 'tel:+63281234567' },
{ id: 'facebook', label: 'Facebook page', value: 'fb.com/SchoolLibrary', href: 'https://facebook.com' }];


export const faqs = [
{
  id: 'borrow',
  question: 'How do I borrow a book?',
  answer:
  'Find the book in Browse and add it to your Borrow Cart — or scan the QR label on the shelf. Open the Cart tab, check the limit, and send one request. When the librarian releases it, collect the books at the circulation desk with your student QR code from Home. The books then appear in Borrowings.'
},
{
  id: 'limit',
  question: 'How many books can I borrow, and for how long?',
  answer: 'Your school sets the limit, and the Borrow Cart shows it together with how many you are already using. The loan period is also set by your school; the due date appears in My Borrowings when the librarian hands the book over.'
},
{
  id: 'renew',
  question: 'Can I renew a book?',
  answer: 'Ask the librarian at the desk before the due date. They can move the due date if the copy is not needed by someone else.'
},
{
  id: 'fines',
  question: 'How are overdue fines computed?',
  answer:
  'Overdue books earn a daily fine set by your school. Lost or damaged books are charged based on the replacement cost. Fines are paid at the library desk only, and any unpaid fine stops new borrowing.'
},
{
  id: 'lost',
  question: 'I lost a book. What should I do?',
  answer: 'Report it to the librarian as soon as possible so the fine stops adding up. You can replace it with the same title or pay the replacement cost.'
},
{
  id: 'account',
  question: 'I forgot my password or can’t log in.',
  answer:
  'Visit the library desk with your school ID. The librarian can verify your LRN and reset your account. If you’re logged in, you can change your password in Settings.'
},
{
  id: 'wrong',
  question: 'My borrowings or fines look wrong.',
  answer: 'Records sync from the library system. If something looks off, bring your receipt or the book to the desk and the librarian will check it.'
}];