import React from 'react';
import { BellIcon, BookOpenIcon, HomeIcon, LibraryIcon, LogOutIcon, ReceiptIcon, SearchIcon, SettingsIcon } from 'lucide-react';
import { Spot } from './Spot';
import { currentStudent } from '../../../data/currentStudent';
import { cn } from '../../../utils/cn';

interface MiniFrameProps {
  /** Highlighted bottom tab; omit for screens outside the tabs (e.g. Settings) */
  active?: 'home' | 'browse' | 'borrowings';
  /** Show the account menu open under the avatar, spotlighted */
  menuOpen?: boolean;
  /** Red count on the bell */
  unread?: number;
  /** Spotlight a header icon */
  spot?: 'bell' | 'avatar';
  /** Spotlighted layer drawn over the page (pop-ups, panels, dialogs) */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

const tabs = [
{ id: 'home', icon: HomeIcon, label: 'Home' },
{ id: 'browse', icon: SearchIcon, label: 'Browse' },
{ id: 'borrowings', icon: LibraryIcon, label: 'Borrowings' },
{ id: 'fines', icon: ReceiptIcon, label: 'Fines' }] as
const;

/** A miniature of the mobile app chrome used inside product demos. */
export function MiniFrame({ active, menuOpen = false, unread = 0, spot, overlay, children }: MiniFrameProps) {
  const bell =
  <span className="relative block">
      <BellIcon className="h-3.5 w-3.5" />
      {unread ?
    <span className="absolute -right-1 -top-1 flex h-2.5 min-w-2.5 items-center justify-center rounded-full bg-[#dc2626] px-0.5 text-[6px] font-bold leading-none text-[#fff]">
          {unread}
        </span> :
    null}
    </span>;

  const avatar =
  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-amber/25 text-[8px] font-bold text-ink">{currentStudent.initials}</span>;


  return (
    <div className="relative flex h-full flex-col bg-paper">
      <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-amber text-[#1c1917]">
            <BookOpenIcon className="h-3 w-3" />
          </span>
          <span className="text-[10px] font-extrabold tracking-[-0.04em] text-ink">LIBTRACK</span>
        </div>
        <div className="flex items-center gap-2 text-ink/50">
          {spot === 'bell' ? <Spot className="rounded-full bg-white p-0.5">{bell}</Spot> : bell}
          {menuOpen || spot === 'avatar' ? <Spot className="rounded-full bg-white">{avatar}</Spot> : avatar}
        </div>
      </div>

      {menuOpen ?
      <Spot className="absolute right-2.5 top-10 w-[148px] bg-white p-1 shadow-card">
          <div className="border-b border-ink/[0.06] px-2 pb-1.5 pt-1">
            <p className="text-[9.5px] font-bold text-ink">{currentStudent.name}</p>
            <p className="text-[8px] text-ink/50">{currentStudent.email}</p>
          </div>
          <p className="mt-1 flex items-center gap-1.5 rounded-md bg-ink/[0.05] px-2 py-1.5 text-[9px] font-semibold text-ink">
            <SettingsIcon className="h-3 w-3" />
            Settings
          </p>
          <p className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] text-[#dc2626]">
            <LogOutIcon className="h-3 w-3" />
            Log out
          </p>
        </Spot> :
      null}

      {overlay}

      <div className="relative flex-1 overflow-hidden px-3.5">{children}</div>
      <div className="grid grid-cols-4 border-t border-ink/[0.06] bg-white px-2 pb-2.5 pt-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const on = tab.id === active;
          return (
            <span key={tab.id} className={cn('flex flex-col items-center gap-0.5 text-[7.5px] font-semibold', on ? 'text-brand-ember' : 'text-ink/40')}>
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </span>);

        })}
      </div>
    </div>);

}