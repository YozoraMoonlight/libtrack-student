import React from 'react';
import { ArrowLeftIcon, BookOpenIcon, ChevronDownIcon, QrCodeIcon, RotateCcwIcon, SearchIcon } from 'lucide-react';
import { QrCode } from '../../app/QrCode';
import { MiniFrame } from './MiniFrame';
import { Spot } from './Spot';
import { currentStudent } from '../../../data/currentStudent';
import { schoolContact } from '../../../data/helpCenter';

const browseBooks = [
{ title: 'Atomic Habits', author: 'James Clear', category: 'Non-Fiction', copies: '3/3' },
{ title: 'Calculus: Early Transcendentals', author: 'James Stewart', category: 'Mathematics', copies: '3/4' },
{ title: 'Design Patterns', author: 'Erich Gamma et al.', category: 'Technology', copies: '2/2' },
{ title: 'El Filibusterismo', author: 'Jose Rizal', category: 'Literature', copies: '5/5' }];


export function FindBookScreen() {
  return (
    <MiniFrame active="browse">
      <p className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">Browse Books</p>
      <p className="text-[9px] text-ink/50">19 books available</p>
      <Spot className="mt-2.5 bg-white p-1.5">
        <div className="flex items-center gap-1.5 rounded-lg bg-paper px-2 py-1.5 text-[9px] text-ink/45">
          <SearchIcon className="h-3 w-3" />
          Search by title, author, or ISBN…
        </div>
        <div className="mt-1.5 flex items-center justify-between rounded-lg bg-paper px-2 py-1.5 text-[9px] text-ink/70">
          All Categories
          <ChevronDownIcon className="h-3 w-3" />
        </div>
      </Spot>
      <ul className="mt-3 space-y-2">
        {browseBooks.map((book) =>
        <li key={book.title} className="flex gap-2.5 rounded-xl bg-white p-2 ring-1 ring-ink/[0.06]">
            <QrCode value={book.title} className="h-10 w-10 shrink-0 rounded" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold text-ink">{book.title}</p>
              <p className="text-[8.5px] text-ink/50">{book.author}</p>
              <p className="mt-0.5 text-[8px] text-ink/60">
                {book.category} · {book.copies} copies · <span className="font-semibold text-[#2f9e6a]">Available</span>
              </p>
            </div>
          </li>
        )}
      </ul>
    </MiniFrame>);

}

const details = [
['ISBN', '978-0061120084'],
['Publisher', 'Harper Perennial'],
['Year', '1960'],
['Category', 'Fiction'],
['Location', 'Shelf A1'],
['Availability', '1 / 3 copies']];


export function AvailabilityScreen() {
  return (
    <MiniFrame active="browse">
      <div className="flex items-center gap-1.5">
        <ArrowLeftIcon className="h-3.5 w-3.5 text-ink" />
        <p className="text-[13px] font-extrabold tracking-[-0.03em] text-ink">Book Details</p>
      </div>
      <div className="mt-2.5 rounded-xl bg-white p-3 ring-1 ring-ink/[0.06]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-bold text-ink">To Kill a Mockingbird</p>
            <p className="text-[9px] text-ink/50">by Harper Lee</p>
          </div>
          <span className="rounded-full bg-[#2f9e6a]/15 px-1.5 py-0.5 text-[8px] font-semibold text-[#2f9e6a]">Available</span>
        </div>
        <dl className="mt-2.5 grid grid-cols-3 gap-x-2 gap-y-2">
          {details.map(([label, value]) =>
          <div key={label}>
              <dt className="text-[7px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</dt>
              <dd className="text-[9px] text-ink">{value}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="mt-2.5 flex h-16 items-center justify-center rounded-xl bg-ink/[0.05] text-ink/30">
        <BookOpenIcon className="h-5 w-5" />
      </div>
      <Spot className="mt-2.5 bg-white p-3">
        <p className="text-[10px] font-bold text-ink">Availability</p>
        <p className="mt-1 text-[9px] leading-[1.45] text-ink/60">This book is currently available. Visit the library to borrow it.</p>
      </Spot>
    </MiniFrame>);

}

export function QrScreen() {
  return (
    <MiniFrame active="home">
      <p className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">Dashboard</p>
      <p className="text-[9px] text-ink/50">Welcome back, {currentStudent.name}!</p>
      <Spot className="mt-2.5 bg-white p-3">
        <div className="flex items-center gap-1 text-[10px] font-bold text-ink">
          <QrCodeIcon className="h-3 w-3" />
          My Library QR Code
        </div>
        <div className="mt-2 flex gap-3">
          <QrCode value={currentStudent.lrn} className="h-[72px] w-[72px] shrink-0 rounded-md ring-1 ring-ink/10" />
          <div className="min-w-0 text-[9px] leading-[1.5]">
            <p className="font-semibold text-ink">{currentStudent.name}</p>
            <p className="text-ink/55">LRN: {currentStudent.lrn}</p>
            <p className="text-[#2f5fd0]">{schoolContact.name}</p>
          </div>
        </div>
        <p className="mt-2 text-[8px] text-ink/45">Present this QR code to the librarian when borrowing or returning books.</p>
      </Spot>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
        ['2', 'Active borrows'],
        ['2', 'Total borrowed'],
        ['₱0.00', 'Unpaid fines']].
        map(([value, label]) =>
        <div key={label} className="rounded-xl bg-white p-2.5 ring-1 ring-ink/[0.06]">
            <p className="text-[13px] font-bold text-ink">{value}</p>
            <p className="text-[8.5px] text-ink/50">{label}</p>
          </div>
        )}
      </div>
    </MiniFrame>);

}

const returnRows = [
{ title: 'To Kill a Mockingbird', code: 'ACC-00001-002', due: 'Due 10/4/2026' },
{ title: 'The Great Gatsby', code: 'ACC-00003-002', due: 'Due 10/7/2026' }];


export function OnAccountScreen() {
  return (
    <MiniFrame active="borrowings">
      <p className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">My Borrowings</p>
      <p className="text-[9px] text-ink/50">2 borrowings total</p>
      <Spot className="mt-2.5 bg-white p-3">
        <div className="flex items-center gap-1 text-[10px] font-bold text-ink">
          <RotateCcwIcon className="h-3 w-3" />
          Return Books
        </div>
        <p className="mt-1 text-[8px] leading-[1.45] text-ink/50">
          Scan the QR label on the book, or press Return below. Then hand the book to the librarian.
        </p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 text-[8.5px] font-semibold text-paper">
          <QrCodeIcon className="h-2.5 w-2.5" />
          Return with QR
        </span>
        <ul className="mt-2 divide-y divide-ink/[0.06]">
          {returnRows.map((row) =>
          <li key={row.title} className="flex items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-[9.5px] font-semibold text-ink">{row.title}</p>
                <p className="font-mono text-[7.5px] text-ink/45">
                  {row.code} · {row.due}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8px] text-ink ring-1 ring-ink/15">
                <RotateCcwIcon className="h-2.5 w-2.5" />
                Return
              </span>
            </li>
          )}
        </ul>
      </Spot>
      <div className="mt-3 space-y-1.5">
        {returnRows.map((row) =>
        <div key={row.title} className="flex items-center justify-between rounded-xl bg-white px-2.5 py-2 ring-1 ring-ink/[0.06]">
            <p className="text-[9px] font-semibold text-ink">{row.title}</p>
            <span className="rounded-full bg-[#2f5fd0]/15 px-1.5 py-0.5 text-[7.5px] font-semibold text-[#2f5fd0]">Active</span>
          </div>
        )}
      </div>
      <Spot className="absolute inset-x-3.5 top-0 flex items-center gap-2 bg-white p-2 shadow-card">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#2f9e6a]/15 text-[#2f9e6a]">
          <BookOpenIcon className="h-3 w-3" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-ink">Book borrowed</p>
          <p className="truncate text-[8px] text-ink/55">To Kill a Mockingbird · due Oct 4</p>
        </div>
      </Spot>
    </MiniFrame>);

}

export const borrowDemoScreens = [FindBookScreen, AvailabilityScreen, QrScreen, OnAccountScreen];