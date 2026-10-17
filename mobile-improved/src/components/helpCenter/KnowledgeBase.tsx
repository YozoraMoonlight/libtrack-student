import React, { useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { ArticleItem } from './ArticleItem';
import { articles, articleTopics, type ArticleTopicId } from '../../data/helpCenter';
import type { ArticleBlock } from '../../types/helpCenter';
import { cn } from '../../utils/cn';

function blockText(block: ArticleBlock) {
  if (block.type === 'steps' || block.type === 'bullets') return block.items.join(' ');
  if (block.type === 'link') return block.label;
  return block.text;
}

export function KnowledgeBase() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<ArticleTopicId | 'all'>('all');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articleTopics.
    filter((t) => topic === 'all' || t.id === topic).
    map((t) => ({
      ...t,
      items: articles.filter(
        (a) =>
        a.topic === t.id && (
        !q || [a.title, a.summary, ...a.body.map(blockText)].join(' ').toLowerCase().includes(q))
      )
    })).
    filter((g) => g.items.length > 0);
  }, [query, topic]);

  const chips: Array<{id: ArticleTopicId | 'all';label: string;}> = [{ id: 'all', label: 'All topics' }, ...articleTopics];

  return (
    <div className="mt-3">
      <label className="relative block">
        <span className="sr-only">Search help articles</span>
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles"
          className="h-11 w-full rounded-xl bg-ink/[0.04] pl-10 pr-3 text-[15px] text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-brand-amber" />
        
      </label>

      <div role="tablist" aria-label="Topics" className="-mx-6 mt-3 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
        {chips.map((chip) => {
          const active = topic === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTopic(chip.id)}
              className={cn(
                'h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
                active ? 'bg-ink text-white' : 'bg-ink/[0.05] text-ink/70 hover:bg-ink/[0.09]'
              )}>
              
              {chip.label}
            </button>);

        })}
      </div>

      {groups.length === 0 ?
      <p className="py-10 text-center text-sm text-ink/55">
          No articles match “{query}”. Try another word, or ask the library desk.
        </p> :

      groups.map((group) =>
      <section key={group.id} className="mt-5">
            <h3 className="px-1 text-[13px] font-semibold text-ink/50">{group.label}</h3>
            <ul className="mt-2 divide-y divide-ink/[0.07] overflow-hidden rounded-2xl ring-1 ring-ink/[0.07]">
              {group.items.map((a) =>
          <ArticleItem key={a.id} title={a.title} summary={a.summary} body={a.body} />
          )}
            </ul>
          </section>
      )
      }
    </div>);

}