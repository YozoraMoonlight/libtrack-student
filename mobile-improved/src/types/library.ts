export type BorrowStatus = 'Borrowed' | 'Returned' | 'Overdue';
export type FineStatus = 'Paid' | 'Unpaid';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  copies: number;
  available: number;
  /** Server-resolved cover URL (`/book-covers/{file}`). Never rebuild it. */
  cover?: string | null;
  /** True when the title can also be read as a PDF. */
  hasPdf?: boolean;
  location?: string;
  /** Where this title already is for the signed-in student. */
  state?: 'cart' | 'reserved' | 'borrowed' | null;
}

export interface NightShelfBook extends Book {
  category: 'Manga' | 'Light Novel';
  genre: string;
  volumes: number;
  /** The developer's one-line take */
  note: string;
  /** Poster artwork URL */
  cover: string;
  /** Signature color pulled from the poster */
  accent: string;
}

export interface Borrowing {
  id: string;
  bookTitle: string;
  borrowed: string;
  due: string;
  returned: string | null;
  status: BorrowStatus;
  fine: number | null;
  /** Live: set once the student has asked the librarian to take the book back. */
  returnRequestedAt?: string | null;
  returnRequestedMethod?: string | null;
}

export interface Fine {
  id: string;
  bookTitle: string;
  type: string;
  amount: number;
  paid: number;
  status: FineStatus;
  date: string;
}

export interface CurrentStudent {
  name: string;
  initials: string;
  lrn: string;
  email: string;
  gradeSection: string;
}