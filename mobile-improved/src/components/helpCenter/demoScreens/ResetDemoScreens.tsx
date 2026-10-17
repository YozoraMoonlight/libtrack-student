import React from 'react';
import { ArrowLeftIcon, BookOpenIcon, CheckIcon, EyeIcon, KeyRoundIcon, MessageSquareTextIcon } from 'lucide-react';
import { Spot } from './Spot';
import { currentStudent } from '../../../data/currentStudent';
import { passwordRules } from '../../../utils/validation';

/** Miniature of the signed-out auth screens (no tabs, no account menu). */
function MiniAuth({ back = false, children }: {back?: boolean;children: React.ReactNode;}) {
  return (
    <div className="relative flex h-full flex-col bg-cream px-4 pt-3.5">
      <div className="flex items-center justify-between">
        {back ?
        <span className="flex items-center gap-1 text-[8.5px] text-ink/50">
            <ArrowLeftIcon className="h-2.5 w-2.5" />
            Back to sign in
          </span> :

        <span />
        }
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-amber text-[#1c1917]">
            <BookOpenIcon className="h-3 w-3" />
          </span>
          <span className="text-[10px] font-extrabold tracking-[-0.04em] text-ink">LIBTRACK</span>
        </div>
      </div>
      <div className="relative flex-1 pt-4">{children}</div>
    </div>);

}

function MiniInput({ label, value, placeholder, secret, center }: {label: string;value?: string;placeholder?: string;secret?: boolean;center?: boolean;}) {
  return (
    <div>
      <p className="text-[8px] font-semibold text-ink/70">{label}</p>
      <div className="mt-0.5 flex items-center justify-between rounded-md bg-white px-1.5 py-1.5 text-[8.5px] text-ink ring-1 ring-ink/10">
        <span className={center ? 'w-full text-center font-semibold tracking-[0.45em]' : secret ? 'tracking-[0.15em]' : value ? '' : 'text-ink/35'}>
          {secret ? '••••••••••' : value || placeholder}
        </span>
        {secret ? <EyeIcon className="h-2.5 w-2.5 shrink-0 text-ink/40" /> : null}
      </div>
    </div>);

}

function MiniButton({ children }: {children: React.ReactNode;}) {
  return <span className="block rounded-md bg-ink py-1.5 text-center text-[8.5px] font-semibold text-paper">{children}</span>;
}

function FlowMark({ icon: Icon }: {icon: typeof KeyRoundIcon;}) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-amber/20 text-brand-ember">
      <Icon className="h-3 w-3" />
    </span>);

}

export function PressForgotScreen() {
  return (
    <MiniAuth>
      <p className="text-[16px] font-extrabold leading-tight tracking-[-0.045em] text-ink">Welcome back</p>
      <p className="mt-0.5 text-[8.5px] leading-[1.45] text-ink/55">Sign in with your email or LRN to access your library account.</p>
      <div className="mt-4 space-y-2.5">
        <MiniInput label="Email or LRN" value={currentStudent.lrn} />
        <Spot className="bg-white p-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-semibold text-ink/70">Password</p>
            <p className="text-[8px] font-semibold text-brand-ember">Forgot password?</p>
          </div>
          <div className="mt-0.5 flex items-center justify-between rounded-md bg-white px-1.5 py-1.5 text-[8.5px] text-ink/35 ring-1 ring-ink/10">
            Enter your password
            <EyeIcon className="h-2.5 w-2.5 text-ink/40" />
          </div>
        </Spot>
        <MiniButton>Sign in</MiniButton>
        <p className="text-center text-[8px] text-ink/55">
          Don&apos;t have an account? <span className="font-bold text-brand-ember">Create one</span>
        </p>
      </div>
    </MiniAuth>);

}

export function SendCodeScreen() {
  return (
    <MiniAuth back>
      <FlowMark icon={KeyRoundIcon} />
      <p className="mt-2 text-[16px] font-extrabold leading-tight tracking-[-0.045em] text-ink">Reset your password</p>
      <p className="mt-1 text-[8.5px] leading-[1.45] text-ink/55">
        Enter the email or 12-digit LRN you sign in with. We&apos;ll text a 6-digit code to the mobile number on your account.
      </p>
      <Spot className="mt-3 space-y-2 bg-white p-2">
        <MiniInput label="Email or LRN" value={currentStudent.lrn} />
        <MiniButton>Send code</MiniButton>
      </Spot>
      <p className="mt-3 text-[7.5px] leading-[1.5] text-ink/45">No mobile number on your account? Ask your school library to set a new password for you.</p>
    </MiniAuth>);

}

export function EnterCodeScreen() {
  return (
    <MiniAuth back>
      <FlowMark icon={MessageSquareTextIcon} />
      <p className="mt-2 text-[16px] font-extrabold leading-tight tracking-[-0.045em] text-ink">Enter your code</p>
      <Spot className="mt-2.5 space-y-1.5 bg-white p-2">
        <div className="rounded-md bg-[#ecfdf5] px-1.5 py-1 text-[7.5px] leading-[1.45] text-[#065f46]">
          We texted a 6-digit code to the mobile number on file.
          <br />
          Account: <span className="font-bold">{currentStudent.lrn}</span> · valid for 10 minutes.
        </div>
        <MiniInput label="6-digit code" value="482913" center />
        <MiniInput label="New password" secret />
        <ul className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
          {passwordRules.map((rule) =>
          <li key={rule.label} className="flex items-center gap-0.5 text-[7px] text-[#2f9e6a]">
              <CheckIcon className="h-2 w-2 shrink-0" strokeWidth={3} />
              <span className="truncate">{rule.label}</span>
            </li>
          )}
        </ul>
        <MiniInput label="Confirm new password" secret />
        <MiniButton>Reset password</MiniButton>
      </Spot>
    </MiniAuth>);

}

export const resetDemoScreens = [PressForgotScreen, SendCodeScreen, EnterCodeScreen];