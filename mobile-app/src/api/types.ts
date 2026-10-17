export type ApiUser = {
  id: number;
  name: string;
  email: string;
  student_id?: string | null;
  lrn?: string | null;
  school_id?: number | null;
  school_name?: string | null;
};

export type Stats = { activeBorrows: number; totalBorrowed: number; unpaidFines: number };

export type Loan = {
  id: number;
  book_title?: string;
  book_author?: string;
  accession_number?: string | null;
  borrowed_at?: string;
  due_date?: string;
  status: string;
  return_requested_at?: string | null;
  return_request_method?: string | null;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};
