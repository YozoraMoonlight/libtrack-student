import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    [key: string]: unknown;
}

export interface School {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
    librarians_count?: number;
    students_count?: number;
    books_count?: number;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    user_role: 'super_admin' | 'admin' | 'school_admin' | 'librarian' | 'user';
    student_id?: string | null;
    lrn?: string | null;
    birthdate?: string | null;
    phone?: string | null;
    department?: string | null;
    school_id?: number | null;
    school?: School | null;
    is_active: boolean;
    qr_code?: string | null;
    last_login_at?: string | null;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    // Computed/loaded relationships
    transactions_count?: number;
    fines_count?: number;
    active_borrow_count?: number;
    [key: string]: unknown;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
    books_count?: number;
    created_at: string;
    updated_at: string;
}

export interface BookCopy {
    id: number;
    book_id?: number;
    copy_number: number;
    /** Printed on the label, e.g. ACC-00012-002. */
    accession_number: string | null;
    /** Unique per physical copy — this is what a return is verified against. */
    qr_code: string;
    status: 'available' | 'borrowed' | 'reserved' | 'damaged' | 'lost';
    condition?: string | null;
    /** Name of the student currently holding this copy, when it is out. */
    borrower?: string | null;
    due_date?: string | null;
    /** Inline data: URI of the copy's QR, supplied by the Copies page. */
    qr_image?: string;
}

export interface Book {
    id: number;
    isbn: string | null;
    title: string;
    author: string;
    publisher: string | null;
    publication_year: number | null;
    category_id: number | null;
    category?: Category;
    school_id: number | null;
    school?: School | null;
    description: string | null;
    cover_image: string | null;
    cover_image_url: string | null;
    qr_code: string;
    total_copies: number;
    available_copies: number;
    location: string | null;
    status: 'available' | 'borrowed' | 'reserved' | 'damaged' | 'lost';
    copies?: BookCopy[];
    /** Only the copies currently on the shelf — sent by the borrow screen. */
    available_copies_list?: BookCopy[];
    availableCopies?: BookCopy[];
    created_at: string;
    updated_at: string;
}

export interface Transaction {
    id: number;
    user_id: number;
    book_id: number;
    /** The exact physical copy. Null only for loans predating copy tracking. */
    book_copy_id?: number | null;
    librarian_id: number | null;
    user?: User;
    book?: Book;
    book_copy?: BookCopy | null;
    librarian?: User;
    type: 'borrow' | 'return' | 'renew';
    borrowed_at: string;
    due_date: string;
    returned_at: string | null;
    /** Set when the student asked to return it; the loan stays open until a librarian receives the book. */
    return_requested_at?: string | null;
    return_request_method?: 'qr' | 'manual' | null;
    status: 'active' | 'returned' | 'overdue';
    notes: string | null;
    fines?: Fine[];
    created_at: string;
    updated_at: string;
}

export interface Reservation {
    id: number;
    user_id: number;
    book_id: number;
    user?: User;
    book?: Book;
    status: 'pending' | 'ready' | 'fulfilled' | 'cancelled' | 'expired';
    reserved_at: string;
    expires_at: string | null;
    fulfilled_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface Fine {
    id: number;
    user_id: number;
    transaction_id: number;
    user?: User;
    transaction?: Transaction;
    type: 'overdue' | 'lost' | 'damaged';
    amount: string;
    paid_amount: string;
    status: 'unpaid' | 'partial' | 'paid' | 'waived';
    description: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}
