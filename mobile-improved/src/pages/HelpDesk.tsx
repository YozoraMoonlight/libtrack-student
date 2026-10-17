import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon, SparklesIcon } from 'lucide-react';
import { FaqItem } from '../components/app/FaqItem';
import { PageHeader } from '../components/app/PageHeader';
import { faqs, helpContacts, libraryDesk } from '../data/helpDesk';
import { updateLogs } from '../data/updateLogs';
import { cn } from '../utils/cn';

const contactIcons = { email: MailIcon, phone: PhoneIcon, facebook: MessageCircleIcon } as const;

export function HelpDesk() {
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const today = libraryDesk.hours.find((entry) => entry.day === todayName);
  const latest = updateLogs[0];

  return (
    <>
      <PageHeader title="Help Desk" subtitle="Library hours, contacts, and answers to common questions." />

      <div className="px-5">
        <section aria-labelledby="desk-heading" className="rounded-3xl bg-cream p-5 ring-1 ring-brand-amber/30">
          <h2 id="desk-heading" className="text-[13px] font-semibold text-brand-ember">
            Library desk today
          </h2>
          <p className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.04em] text-ink">
            {today?.open ? `${today.open} – ${today.close}` : 'Closed today'}
          </p>
          <p className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-ink/65">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-ember" aria-hidden="true" />
            {libraryDesk.location}
          </p>
        </section>

        <section aria-labelledby="hours-heading" className="mt-7">
          <h2 id="hours-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
            Weekly hours
          </h2>
          <dl className="mt-3 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
            {libraryDesk.hours.map((entry) => {
              const isToday = entry.day === todayName;
              return (
                <div key={entry.day} className="flex items-center justify-between px-4 py-3 text-sm">
                  <dt className={cn(isToday ? 'font-bold text-ink' : 'text-ink/60')}>
                    {entry.day}
                    {isToday ? <span className="sr-only"> (today)</span> : null}
                  </dt>
                  <dd className={cn('tabular-nums', isToday ? 'font-bold text-ink' : 'text-ink/60', !entry.open && 'text-ink/40')}>
                    {entry.open ? `${entry.open} – ${entry.close}` : 'Closed'}
                  </dd>
                </div>);

            })}
          </dl>
        </section>

        <section aria-labelledby="faq-heading" className="mt-7">
          <h2 id="faq-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
            Common questions
          </h2>
          <ul className="mt-3 divide-y divide-ink/[0.07] overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.06]">
            {faqs.map((faq) =>
            <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
            )}
          </ul>
        </section>

        <section aria-labelledby="contact-heading" className="mt-7">
          <h2 id="contact-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
            Still need help?
          </h2>
          <ul className="mt-3 divide-y divide-ink/[0.07] overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.06]">
            {helpContacts.map((contact) => {
              const Icon = contactIcons[contact.id as keyof typeof contactIcons] ?? MailIcon;
              return (
                <li key={contact.id}>
                  <a
                    href={contact.href}
                    target={contact.href.startsWith('http') ? '_blank' : undefined}
                    rel={contact.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 active:bg-ink/[0.04] focus-visible:bg-ink/[0.04] focus-visible:outline-none">
                    
                    <Icon className="h-[18px] w-[18px] shrink-0 text-ink/50" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink">{contact.label}</span>
                      <span className="block truncate text-[13px] text-ink/55">{contact.value}</span>
                    </span>
                    <ChevronRightIcon className="h-4 w-4 text-ink/30" aria-hidden="true" />
                  </a>
                </li>);

            })}
          </ul>
        </section>

        <Link
          to="/app/updates"
          className="mt-7 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-ink/[0.06] transition-colors duration-150 active:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
          
          <SparklesIcon className="h-[18px] w-[18px] shrink-0 text-brand-ember" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">What’s new in v{latest.version}</span>
            <span className="block truncate text-[13px] text-ink/55">{latest.title}</span>
          </span>
          <ChevronRightIcon className="h-4 w-4 text-ink/30" aria-hidden="true" />
        </Link>
      </div>
    </>);

}