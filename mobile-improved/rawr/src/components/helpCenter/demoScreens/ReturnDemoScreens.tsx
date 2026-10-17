import React from 'react';
import { ClockIcon, QrCodeIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import { MiniFrame } from './MiniFrame';
import { Spot } from './Spot';

type Focus = 'card' | 'actions' | 'waiting';

interface BorrowingsScreenProps {
  focus: Focus;
}

const rows = [
{ title: 'To Kill a Mockingbird', code: 'ACC-00001-002', due: 'Due 10/4/2026' },
{ title: 'The Great Gatsby', code: 'ACC-00003-002', due: 'Due 10/7/2026' }];


function MaybeSpot({ on, className, children }: {on: boolean;className?: string;children: React.ReactNode;}) {
  return on ? <Spot className={className}>{children}</Spot> : <div className={className}>{children}</div>;
}

function ReturnButton() {
  return (
    <span className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8px] text-ink ring-1 ring-ink/15">
      <RotateCcwIcon className="h-2.5 w-2.5" />
      Return
    </span>);

}

function RowText({ title, code, due }: (typeof rows)[number]) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[9.5px] font-semibold text-ink">{title}</p>
      <p className="font-mono text-[7.5px] text-ink/45">
        {code} · {due}
      </p>
    </div>);

}

function BorrowingsScreen({ focus }: BorrowingsScreenProps) {
  const [first, second] = rows;
  const waiting = focus === 'waiting';

  return (
    <MiniFrame active="borrowings">
      <p className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">My Borrowings</p>
      <p className="text-[9px] text-ink/50">2 borrowings total</p>

      <MaybeSpot on={focus === 'card'} className="mt-2.5 rounded-xl bg-white p-3 ring-1 ring-ink/[0.06]">
        <div className="flex items-center gap-1 text-[10px] font-bold text-ink">
          <RotateCcwIcon className="h-3 w-3" />
          Return Books
        </div>
        <p className="mt-1 text-[8px] leading-[1.45] text-ink/50">
          Scan the QR label on the book, or press Return below. Then hand the book to the librarian — the return is complete once they confirm it.
        </p>

        <MaybeSpot on={focus === 'actions'} className="-mx-1.5 mt-2 px-1.5 py-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 text-[8.5px] font-semibold text-paper">
            <QrCodeIcon className="h-2.5 w-2.5" />
            Return with QR
          </span>
          {!waiting ?
          <div className="mt-1.5 flex items-center justify-between gap-2 py-1">
              <RowText {...first} />
              <ReturnButton />
            </div> :
          null}
        </MaybeSpot>

        {waiting ?
        <Spot className="-mx-1.5 mt-1 bg-white px-1.5 py-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <RowText {...first} />
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="flex items-center gap-0.5 rounded-full bg-brand-amber/20 px-1.5 py-0.5 text-[7.5px] font-semibold text-brand-ember">
                  <ClockIcon className="h-2.5 w-2.5" />
                  Waiting for librarian
                </span>
                <span className="flex items-center gap-0.5 text-[8px] font-medium text-ink">
                  <XIcon className="h-2.5 w-2.5" />
                  Cancel
                </span>
              </div>
            </div>
          </Spot> :
        null}

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-ink/[0.06] pt-1.5">
          <RowText {...second} />
          <ReturnButton />
        </div>
      </MaybeSpot>

      <div className="mt-3 space-y-1.5">
        {rows.map((row, i) =>
        <div key={row.title} className="flex items-center justify-between gap-2 rounded-xl bg-white px-2.5 py-2 ring-1 ring-ink/[0.06]">
            <p className="truncate text-[9px] font-semibold text-ink">{row.title}</p>
            <div className="flex shrink-0 items-center gap-1">
              <span className="rounded-full bg-[#2f5fd0]/15 px-1.5 py-0.5 text-[7.5px] font-semibold text-[#2f5fd0]">Active</span>
              {waiting && i === 0 ? <span className="text-[7.5px] font-semibold text-brand-ember">Return requested</span> : null}
            </div>
          </div>
        )}
      </div>
    </MiniFrame>);

}

export function OpenBorrowingsScreen() {
  return <BorrowingsScreen focus="card" />;
}

export function PressReturnScreen() {
  return <BorrowingsScreen focus="actions" />;
}

export function WaitingScreen() {
  return <BorrowingsScreen focus="waiting" />;
}

export const returnDemoScreens = [OpenBorrowingsScreen, PressReturnScreen, WaitingScreen];