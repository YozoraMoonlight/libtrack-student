import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronRightIcon, ClipboardListIcon, MonitorPlayIcon, TabletSmartphoneIcon, BoxIcon, type LucideIcon } from "lucide-react";
import { BottomSheet } from "../components/app/BottomSheet";
import { PageHeader } from "../components/app/PageHeader";
import { KnowledgeBase } from "../components/helpCenter/KnowledgeBase";
import { StillNeedHelp } from "../components/helpCenter/StillNeedHelp";
import { ProductDemos } from "../components/helpCenter/ProductDemos";
import { StartGuides } from "../components/helpCenter/StartGuides";
type SheetId = 'knowledge' | 'demos' | 'guides';
const topics: Array<{
  id: SheetId;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}> = [{
  id: 'knowledge',
  title: 'Knowledge base',
  description: 'Browse help articles or search for specific topics.',
  icon: TabletSmartphoneIcon,
  color: '#1f9e93'
}, {
  id: 'demos',
  title: 'Product demos',
  description: 'Demonstrations that provide step-by-step guidance.',
  icon: MonitorPlayIcon,
  color: '#2f5fd0'
}, {
  id: 'guides',
  title: 'Getting started guides',
  description: 'Download or print guides to help you get started.',
  icon: ClipboardListIcon,
  color: '#2f9e6a'
}];
const sheetTitles: Record<SheetId, string> = {
  knowledge: 'Knowledge base',
  demos: 'Product demos',
  guides: 'Getting started guides'
};
export function HelpCenter() {
  const location = useLocation();
  const returnSheet = (location.state as {
    sheet?: SheetId;
  } | null)?.sheet;
  const [sheet, setSheet] = useState<SheetId | null>(returnSheet ?? null);
  const close = () => setSheet(null);
  return <>
      <PageHeader title="Help center" subtitle="How can we help you with LIBTRACK?" />

      <div className="px-5">
        <ul className="grid gap-3">
          {topics.map((topic) => {
          const Icon = topic.icon;
          return <li key={topic.id}>
                <button type="button" onClick={() => setSheet(topic.id)} className="flex h-full w-full items-center gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-ink/[0.07] transition-colors duration-150 hover:ring-ink/15 active:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{
                backgroundColor: `${topic.color}1f`,
                color: topic.color
              }}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold tracking-[-0.02em] text-ink">{topic.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-ink/60">{topic.description}</span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink/30" aria-hidden="true" />
                </button>
              </li>;
        })}
        </ul>

        <StillNeedHelp />
      </div>

      <BottomSheet open={sheet !== null} title={sheet ? sheetTitles[sheet] : ''} onClose={close}>
        <div className="-mx-6 max-h-[70vh] overflow-y-auto px-6 pb-2">
          {sheet === 'knowledge' ? <KnowledgeBase /> : null}
          {sheet === 'demos' ? <ProductDemos /> : null}
          {sheet === 'guides' ? <StartGuides /> : null}
        </div>
      </BottomSheet>
    </>;
}