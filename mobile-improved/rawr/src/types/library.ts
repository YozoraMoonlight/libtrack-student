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