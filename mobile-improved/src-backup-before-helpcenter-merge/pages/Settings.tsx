import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/app/PageHeader';
import { PasswordForm } from '../components/settings/PasswordForm';
import { ProfileForm } from '../components/settings/ProfileForm';
import { cn } from '../utils/cn';

type Tab = 'profile' | 'password';

const tabs: Array<{id: Tab;label: string;}> = [
{ id: 'profile', label: 'Profile' },
{ id: 'password', label: 'Password' }];


export function Settings() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account and change your password." />
      <div className="px-5">
        <div role="tablist" aria-label="Settings sections" className="grid grid-cols-2 rounded-xl bg-ink/[0.05] p-1">
          {tabs.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={active}
                aria-controls={`panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={cn(
                  'relative h-10 rounded-lg text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
                  active ? 'text-ink' : 'text-ink/50'
                )}>
                
                {active ?
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-ink/[0.06]"
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} /> :

                null}
                <span className="relative">{item.label}</span>
              </button>);

          })}
        </div>

        <section
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-ink/[0.06]">
          
          {tab === 'profile' ? <ProfileForm /> : <PasswordForm />}
        </section>
      </div>
    </>);

}