import React from 'react';
import { CheckCheckIcon, LifeBuoyIcon, QrCodeIcon, SettingsIcon, SparklesIcon } from 'lucide-react';
import { QrCode } from '../../app/QrCode';
import { MiniFrame } from './MiniFrame';
import { Spot } from './Spot';
import { currentStudent } from '../../../data/currentStudent';
import { notifications } from '../../../data/notifications';
import { NotificationIcon } from '../../app/notifications/NotificationIcon';
import { cn } from '../../../utils/cn';

function DashboardBody() {
  return (
    <>
      <p className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">Dashboard</p>
      <p className="text-[9px] text-ink/50">Welcome back, {currentStudent.name}!</p>
      <div className="mt-2.5 rounded-xl bg-white p-3 ring-1 ring-ink/[0.06]">
        <div className="flex items-center gap-1 text-[10px] font-bold text-ink">
          <QrCodeIcon className="h-3 w-3" />
          My Library QR Code
        </div>
        <div className="mt-2 flex gap-3">
          <QrCode value={currentStudent.lrn} className="h-[72px] w-[72px] shrink-0 rounded-md ring-1 ring-ink/10" />
          <div className="min-w-0 text-[9px] leading-[1.5]">
            <p className="font-semibold text-ink">{currentStudent.name}</p>
            <p className="text-ink/55">LRN: {currentStudent.lrn}</p>
          </div>
        </div>
      </div>
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
    </>);

}

export function UnreadBadgeScreen() {
  return (
    <MiniFrame active="home" unread={1} spot="bell">
      <DashboardBody />
    </MiniFrame>);

}

export function BellPanelScreen() {
  return (
    <MiniFrame
      active="home"
      unread={1}
      spot="bell"
      overlay={
      <Spot className="absolute inset-x-2.5 top-10 overflow-hidden bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-ink/[0.07] px-2.5 py-1.5">
            <div>
              <p className="text-[9.5px] font-bold text-ink">Notifications</p>
              <p className="text-[7.5px] text-ink/50">1 unread</p>
            </div>
            <span className="flex items-center gap-0.5 text-[8px] font-semibold text-brand-ember">
              <CheckCheckIcon className="h-2.5 w-2.5" />
              Mark all as read
            </span>
          </div>
          <ul className="divide-y divide-ink/[0.06]">
            {notifications.slice(0, 3).map((item, index) =>
          <li key={item.id} className={cn('flex gap-1.5 px-2.5 py-1.5', index === 0 && 'bg-brand-amber/[0.08]')}>
                <NotificationIcon kind={item.kind} className="h-5 w-5 [&>svg]:h-2.5 [&>svg]:w-2.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn('text-[8.5px] text-ink', index === 0 ? 'font-bold' : 'font-semibold')}>{item.title}</p>
                    {index === 0 ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-amber" /> : null}
                  </div>
                  <p className="text-[7.5px] leading-[1.4] text-ink/60">{item.body}</p>
                  <p className="mt-0.5 text-[6.5px] text-ink/40">
                    {item.time} · by {item.actor}
                  </p>
                </div>
              </li>
          )}
          </ul>
        </Spot>
      }>
      
      <DashboardBody />
    </MiniFrame>);

}

export function UpdateLogsMenuScreen() {
  return (
    <MiniFrame
      active="home"
      spot="avatar"
      overlay={
      <Spot className="absolute right-2.5 top-10 w-[148px] bg-white p-1 shadow-card">
          <div className="border-b border-ink/[0.06] px-2 pb-1.5 pt-1">
            <p className="text-[9.5px] font-bold text-ink">{currentStudent.name}</p>
            <p className="text-[8px] text-ink/50">{currentStudent.email}</p>
          </div>
          <p className="mt-1 flex items-center gap-1.5 px-2 py-1.5 text-[9px] text-ink">
            <SettingsIcon className="h-3 w-3 text-ink/55" />
            Settings
          </p>
          <p className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] text-ink">
            <LifeBuoyIcon className="h-3 w-3 text-ink/55" />
            Help center
          </p>
          <p className="flex items-center gap-1.5 rounded-md bg-ink/[0.05] px-2 py-1.5 text-[9px] font-semibold text-ink">
            <SparklesIcon className="h-3 w-3 text-ink/55" />
            Update Logs
          </p>
        </Spot>
      }>
      
      <DashboardBody />
    </MiniFrame>);

}

export const notificationsDemoScreens = [UnreadBadgeScreen, BellPanelScreen, UpdateLogsMenuScreen];