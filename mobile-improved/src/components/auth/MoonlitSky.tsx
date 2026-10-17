import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MoonIcon } from 'lucide-react';
import { sparklePath } from '../../utils/sparkle';

const stars = [
{ top: '6%', left: '58%', size: 5 },
{ top: '46%', left: '70%', size: 3.5 },
{ top: '2%', left: '84%', size: 3 },
{ top: '64%', left: '94%', size: 4.5 },
{ top: '78%', left: '62%', size: 3 },
{ top: '30%', left: '52%', size: 2.5 }];


/** Decorative night sky: twinkling stars and a crescent moon on the right side. */
export function MoonlitSky() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-4 bottom-0"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}>
      
      {stars.map((star, index) =>
      <motion.svg
        key={index}
        viewBox="-10 -10 20 20"
        className="absolute text-brand-amberDark dark:text-[#c9c4ff]"
        style={{ top: star.top, left: star.left, width: star.size * 2.6, height: star.size * 2.6 }}
        animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.4, ease: 'easeInOut' }}>
        
          <path d={sparklePath(star.size * 1.6)} fill="currentColor" />
        </motion.svg>
      )}
      <MoonIcon className="absolute right-1 top-1 h-9 w-9 -rotate-12 fill-brand-amber text-brand-amber" />
    </motion.div>);

}