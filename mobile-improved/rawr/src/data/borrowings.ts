import type { Borrowing } from '../types/library';

export const borrowings: Borrowing[] = [
{ id: 'br-008', bookTitle: 'The Great Gatsby', borrowed: '2026-09-25', due: '2026-10-09', returned: null, status: 'Borrowed', fine: null },
{ id: 'br-007', bookTitle: 'Noli Me Tangere', borrowed: '2026-09-22', due: '2026-10-06', returned: null, status: 'Borrowed', fine: null },
{ id: 'br-006', bookTitle: 'Merriam-Webster Dictionary', borrowed: '2026-09-19', due: '2026-09-30', returned: '2026-09-19', status: 'Returned', fine: null },
{ id: 'br-005', bookTitle: 'Meditations', borrowed: '2026-09-19', due: '2026-09-20', returned: '2026-09-19', status: 'Returned', fine: null },
{ id: 'br-004', bookTitle: 'To Kill a Mockingbird', borrowed: '2026-09-12', due: '2026-09-26', returned: '2026-09-19', status: 'Returned', fine: null },
{ id: 'br-003', bookTitle: 'A Brief History of Time', borrowed: '2026-09-08', due: '2026-09-22', returned: '2026-09-24', status: 'Returned', fine: 10 },
{ id: 'br-002', bookTitle: 'Calculus: Early Transcendentals', borrowed: '2026-08-28', due: '2026-09-11', returned: '2026-09-19', status: 'Returned', fine: 40 },
{ id: 'br-001', bookTitle: 'Pride and Prejudice', borrowed: '2026-08-21', due: '2026-09-04', returned: '2026-09-03', status: 'Returned', fine: null }];