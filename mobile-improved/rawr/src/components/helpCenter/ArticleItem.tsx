import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangleIcon, ArrowRightIcon, ChevronDownIcon, LightbulbIcon } from 'lucide-react';
import type { ArticleBlock } from '../../types/helpCenter';
import { cn } from '../../utils/cn';

interface ArticleItemProps {
  title: string;
  summary: string;
  body: ArticleBlock[];
}

export function ArticleItem({ title, summary, body }: ArticleItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left focus-visible:bg-ink/[0.03] focus-visible:outline-none">
        
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-snug text-ink">{title}</span>
          <span className="mt-0.5 block text-[13px] leading-5 text-ink/55">{summary}</span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn('h-4 w-4 shrink-0 text-ink/45 transition-transform duration-200 ease-out', open && 'rotate-180')} />
        
      </button>
      <AnimatePresence initial={false}>
        {open ?
        <motion.div
          id={panelId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden">
          
            <div className="space-y-3 px-4 pb-4">
              {body.map((block, i) =>
            <Block key={i} block={block} />
            )}
            </div>
          </motion.div> :
        null}
      </AnimatePresence>
    </li>);

}

function Block({ block }: {block: ArticleBlock;}) {
  switch (block.type) {
    case 'p':
      return <p className="text-sm leading-6 text-ink/70">{block.text}</p>;
    case 'steps':
      return (
        <ol className="space-y-2">
          {block.items.map((item, i) =>
          <li key={item} className="flex gap-3 text-sm leading-6 text-ink/75">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-amber/25 text-[11px] font-bold tabular-nums text-brand-ember">
                {i + 1}
              </span>
              <span className="min-w-0">{item}</span>
            </li>
          )}
        </ol>);

    case 'bullets':
      return (
        <ul className="space-y-1.5">
          {block.items.map((item) =>
          <li key={item} className="flex gap-3 text-sm leading-6 text-ink/75">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-amber" aria-hidden="true" />
              <span className="min-w-0">{item}</span>
            </li>
          )}
        </ul>);

    case 'warning':
      return (
        <p className="flex gap-2.5 rounded-xl bg-brand-amber/10 p-3 text-[13px] leading-5 text-ink/80 ring-1 ring-brand-amber/40">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-ember" aria-hidden="true" />
          {block.text}
        </p>);

    case 'tip':
      return (
        <p className="flex gap-2.5 rounded-xl bg-[#2f9e6a]/10 p-3 text-[13px] leading-5 text-ink/80 ring-1 ring-[#2f9e6a]/35">
          <LightbulbIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#2f9e6a]" aria-hidden="true" />
          {block.text}
        </p>);

    case 'link':
      return (
        <Link
          to={block.to}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-[14px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber focus-visible:ring-offset-2">
          
          {block.label}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>);

  }
}