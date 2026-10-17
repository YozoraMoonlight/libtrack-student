import React from 'react';
import { CheckIcon, EyeIcon, QrCodeIcon } from 'lucide-react';
import { QrCode } from '../../app/QrCode';
import { MiniFrame } from './MiniFrame';
import { Spot } from './Spot';
import { currentStudent } from '../../../data/currentStudent';
import { cn } from '../../../utils/cn';

const [firstName, ...rest] = currentStudent.name.split(' ');
const lastName = rest.join(' ');

function MiniField({ label, value, muted, hint }: {label: string;value: string;muted?: boolean;hint?: string;}) {
  return (
    <div>
      <p className="text-[8px] font-semibold text-ink/70">{label}</p>
      <div className={cn('mt-0.5 rounded-md px-1.5 py-1 text-[8.5px] ring-1 ring-ink/10', muted ? 'bg-ink/[0.04] text-ink/40' : 'bg-white text-ink')}>
        {value || '\u00a0'}
      </div>
      {hint ? <p className="mt-0.5 text-[7px] text-ink/45">{hint}</p> : null}
    </div>);

}

function SecretField({ label }: {label: string;}) {
  return (
    <div>
      <p className="text-[8px] font-semibold text-ink/70">{label}</p>
      <div className="mt-0.5 flex items-center justify-between rounded-md bg-white px-1.5 py-1 text-[8.5px] tracking-[0.15em] text-ink ring-1 ring-ink/10">
        ••••••••••
        <EyeIcon className="h-2.5 w-2.5 text-ink/40" />
      </div>
    </div>);

}

function SettingsTabs({ tab }: {tab: 'profile' | 'password';}) {
  return (
    <div className="grid grid-cols-2 rounded-lg bg-ink/[0.05] p-0.5 text-center text-[8.5px] font-semibold">
      {(['profile', 'password'] as const).map((t) =>
      <span key={t} className={cn('rounded-md py-1 capitalize', t === tab ? 'bg-white text-ink shadow-sm' : 'text-ink/45')}>
          {t}
        </span>
      )}
    </div>);

}

function SettingsHeading() {
  return (
    <>
      <p className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">Settings</p>
      <p className="text-[9px] text-ink/50">Manage your account and change your password</p>
    </>);

}

export function OpenSettingsScreen() {
  return (
    <MiniFrame active="home" menuOpen>
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

export function EditProfileScreen() {
  return (
    <MiniFrame>
      <SettingsHeading />
      <Spot className="mt-2.5 bg-white p-2.5">
        <SettingsTabs tab="profile" />
        <p className="mt-2.5 text-[10px] font-bold text-ink">Profile Information</p>
        <p className="text-[8px] text-ink/50">Update your name, email address and mobile number.</p>
        <div className="mt-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <MiniField label="First name" value={firstName} />
            <MiniField label="Last name" value={lastName} />
          </div>
          <MiniField label="Email" value={currentStudent.email} />
          <MiniField label="Mobile number" value="09171234567" hint="Due-date reminders are texted to this number." />
          <MiniField label="Role" value="Student" muted />
        </div>
        <div className="mt-2 flex justify-end">
          <span className="rounded-md bg-ink px-2 py-1 text-[8.5px] font-semibold text-paper">Save Changes</span>
        </div>
      </Spot>
    </MiniFrame>);

}

const rules = ['At least 8 characters', 'One uppercase letter (A–Z)', 'One lowercase letter (a–z)', 'One number (0–9)', 'One special character', 'No spaces'];

export function ChangePasswordScreen() {
  return (
    <MiniFrame>
      <SettingsHeading />
      <Spot className="mt-2.5 bg-white p-2.5">
        <SettingsTabs tab="password" />
        <p className="mt-2.5 text-[10px] font-bold text-ink">Change Password</p>
        <p className="text-[8px] text-ink/50">Use a long, random password to stay secure.</p>
        <div className="mt-2 space-y-1.5">
          <SecretField label="Current Password" />
          <SecretField label="New Password" />
          <ul className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
            {rules.map((rule) =>
            <li key={rule} className="flex items-center gap-0.5 text-[7px] text-[#2f9e6a]">
                <CheckIcon className="h-2 w-2 shrink-0" strokeWidth={3} />
                <span className="truncate">{rule}</span>
              </li>
            )}
          </ul>
          <SecretField label="Confirm Password" />
        </div>
        <div className="mt-2 flex justify-end">
          <span className="rounded-md bg-ink px-2 py-1 text-[8.5px] font-semibold text-paper">Update Password</span>
        </div>
      </Spot>
    </MiniFrame>);

}

export const profileDemoScreens = [OpenSettingsScreen, EditProfileScreen, ChangePasswordScreen];