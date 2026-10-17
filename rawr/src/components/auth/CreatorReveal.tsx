import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLinkIcon, MoonIcon, StarIcon } from 'lucide-react';
import { BottomSheet } from '../app/BottomSheet';
import { creator } from '../../data/creator';

interface CreatorRevealProps {
  open: boolean;
  onClose: () => void;
}

const stars = [
{ top: '18%', left: '12%', size: 10 },
{ top: '30%', left: '78%', size: 8 },
{ top: '62%', left: '88%', size: 12 },
{ top: '70%', left: '20%', size: 7 },
{ top: '14%', left: '55%', size: 6 }];


export function CreatorReveal({ open, onClose }: CreatorRevealProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <BottomSheet open={open} title="You found the developer" onClose={onClose}>
      <div className="pt-4">
        <div className="relative overflow-hidden rounded-3xl bg-[#0b0d1a] px-5 pb-5 pt-6 text-[#f4f1ff]">
          {stars.map((star, index) =>
          <motion.span
            key={index}
            aria-hidden="true"
            className="absolute text-[#c9c4ff]"
            style={{ top: star.top, left: star.left }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.35, ease: 'easeInOut' }}>
            
              <StarIcon className="fill-current" style={{ width: star.size, height: star.size }} />
            </motion.span>
          )}
          <MoonIcon aria-hidden="true" className="absolute right-5 top-5 h-7 w-7 fill-[#f6b93d] text-[#f6b93d]" />

          <div className="relative flex items-center gap-4">
            {avatarFailed ?
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1d2140] text-xl font-extrabold ring-2 ring-[#f6b93d]">
                YM
              </div> :

            <img
              src={creator.avatarUrl}
              alt={`${creator.name}'s GitHub avatar`}
              onError={() => setAvatarFailed(true)}
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[#f6b93d]" />

            }
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold tracking-[-0.03em]">{creator.name}</p>
              <p className="truncate text-sm text-[#f4f1ff]/60">@{creator.handle}</p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-[#f6b93d] px-2 py-0.5 text-xs font-bold text-[#121212]">
                <MoonIcon aria-hidden="true" className="h-3 w-3" />
                {creator.tagline}
              </p>
            </div>
          </div>

          <dl className="relative mt-5 divide-y divide-[#f4f1ff]/10 border-t border-[#f4f1ff]/10">
            {creator.facts.map((fact) =>
            <div key={fact.label} className="flex gap-4 py-2.5 text-sm">
                <dt className="w-20 shrink-0 text-[#f4f1ff]/50">{fact.label}</dt>
                <dd className="font-medium text-[#f4f1ff]">{fact.value}</dd>
              </div>
            )}
          </dl>
        </div>

        <a
          href={creator.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-bold text-white transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/40">
          
          View GitHub
          <ExternalLinkIcon aria-hidden="true" className="h-4 w-4" />
        </a>
        <p className="mt-3 text-center text-xs text-ink/45">Thanks for poking around. Good night.</p>
      </div>
    </BottomSheet>);

}