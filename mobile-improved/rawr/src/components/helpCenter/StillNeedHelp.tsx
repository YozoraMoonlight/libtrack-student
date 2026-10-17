import React from 'react';
import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { schoolContact } from '../../data/helpCenter';

export function StillNeedHelp() {
  const rows = [
  { icon: MapPinIcon, label: schoolContact.address, href: undefined },
  { icon: PhoneIcon, label: schoolContact.phone, href: `tel:${schoolContact.phone.replace(/\s/g, '')}` },
  { icon: MailIcon, label: schoolContact.email, href: `mailto:${schoolContact.email}` }];


  return (
    <section aria-labelledby="still-need-help" className="mt-6 rounded-2xl bg-cream p-5 ring-1 ring-brand-amber/30">
      <h2 id="still-need-help" className="text-[17px] font-bold tracking-[-0.02em] text-ink">
        Still need help?
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-ink/65">
        Your school library can fix anything LIBTRACK can’t — a missing mobile number, a disabled account, or a fine you
        disagree with.
      </p>

      <p className="mt-4 text-[15px] font-bold text-ink">{schoolContact.name}</p>
      <ul className="mt-2 space-y-1">
        {rows.map(({ icon: Icon, label, href }) =>
        <li key={label}>
            {href ?
          <a
            href={href}
            className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-brand-ember underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </a> :

          <span className="flex items-center gap-3 py-1.5 text-sm text-ink/70">
                <Icon className="h-4 w-4 shrink-0 text-brand-ember" aria-hidden="true" />
                {label}
              </span>
          }
          </li>
        )}
      </ul>
    </section>);

}