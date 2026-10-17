import React from 'react';
import { Link } from 'react-router-dom';
import { FileTextIcon, ListChecksIcon, PrinterIcon } from 'lucide-react';
import { startGuides } from '../../data/helpCenter';

export function StartGuides() {
  return (
    <div className="mt-1">
      <p className="text-sm text-ink/55">Print these, or save them as a PDF to keep on your phone.</p>
      <ul className="mt-3 space-y-3">
        {startGuides.map((guide) => {
          const Icon = guide.kind === 'checklist' ? ListChecksIcon : FileTextIcon;
          return (
            <li key={guide.id} className="rounded-2xl p-4 ring-1 ring-ink/[0.07]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-amber/15 text-brand-ember">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-[15px] font-bold tracking-[-0.01em] text-ink">{guide.title}</p>
              <p className="mt-0.5 text-[13px] leading-5 text-ink/60">{guide.summary}</p>
              <Link
                to={`/guides/${guide.id}`}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[14px] font-semibold text-ink ring-1 ring-ink/15 transition-colors duration-150 hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                
                <PrinterIcon className="h-4 w-4" aria-hidden="true" />
                Open to print or save as PDF
              </Link>
            </li>);

        })}
      </ul>
    </div>);

}