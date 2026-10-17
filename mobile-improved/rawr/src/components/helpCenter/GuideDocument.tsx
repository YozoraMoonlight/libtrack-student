import React, { useState } from 'react';
import { BookOpenIcon, CheckIcon } from 'lucide-react';
import { schoolContact } from '../../data/helpCenter';
import type { StartGuide } from '../../types/helpCenter';

interface GuideDocumentProps {
  guide: StartGuide;
}

/**
 * The printable sheet. Colors are fixed (not theme tokens) on purpose:
 * a printed / saved PDF should always be dark ink on white paper.
 */
export function GuideDocument({ guide }: GuideDocumentProps) {
  const printedOn = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <article className="rounded-2xl bg-[#ffffff] px-5 pb-6 pt-6 text-[#1c1917] ring-1 ring-[#1c1917]/[0.06] print:rounded-none print:p-0 print:ring-0">
      <header className="border-b border-[#1c1917] pb-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c2570c]">LIBTRACK · Student guide</p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1c1917] text-[#f6b93d]" aria-hidden="true">
            <BookOpenIcon className="h-[18px] w-[18px]" />
          </span>
        </div>
        <h1 className="mt-2 text-[24px] font-bold leading-[1.15] tracking-[-0.025em] print:text-[28px]">{guide.title}</h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-[#57534e]">{guide.summary}</p>
      </header>

      {guide.kind === 'guide' ? <GuideSections guide={guide} /> : <ChecklistSections guide={guide} />}

      <footer className="mt-7 border-t border-[#e7e5e4] pt-4 text-[11px] leading-5 text-[#78716c]">
        <p>{schoolContact.name} Library · LIBTRACK</p>
        <p>Printed {printedOn} · Rules and amounts are the library’s current settings.</p>
      </footer>
    </article>);

}

function GuideSections({ guide }: GuideDocumentProps) {
  return (
    <div className="mt-5 grid gap-6 print:grid-cols-2 print:gap-x-12">
      {guide.sections.map((section, index) =>
      <section key={section.heading} className="break-inside-avoid">
          <h2 className="text-[16px] font-bold tracking-[-0.01em]">
            {index + 1}. {section.heading}
          </h2>
          <ul className="mt-2.5 space-y-2.5">
            {section.items.map((item) =>
          <li key={item} className="flex gap-3 text-[14px] leading-[1.55] text-[#292524] print:text-[13px]">
                <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" aria-hidden="true" />
                <span>{item}</span>
              </li>
          )}
          </ul>
        </section>
      )}
    </div>);

}

function ChecklistSections({ guide }: GuideDocumentProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="mt-5 space-y-6">
      {guide.sections.map((section) =>
      <section key={section.heading} className="break-inside-avoid">
          <h2 className="text-[16px] font-bold tracking-[-0.01em]">{section.heading}</h2>
          <ul className="mt-1.5">
            {section.items.map((item) => {
            const key = `${section.heading}:${item}`;
            const isChecked = !!checked[key];
            return (
              <li key={key}>
                  <label className="-mx-2 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 text-[14px] leading-[1.5] text-[#292524] active:bg-[#1c1917]/[0.04] print:min-h-0 print:py-1 print:text-[13px]">
                    <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="peer sr-only" />
                  
                    <span
                    aria-hidden="true"
                    className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-amber ${
                    isChecked ? 'border-[#1c1917] bg-[#1c1917] text-[#ffffff]' : 'border-[#a8a29e] bg-[#ffffff]'}`
                    }>
                    
                      {isChecked ? <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                    </span>
                    <span className={isChecked ? 'text-[#78716c] line-through decoration-[#a8a29e]' : ''}>{item}</span>
                  </label>
                </li>);

          })}
          </ul>
        </section>
      )}
    </div>);

}