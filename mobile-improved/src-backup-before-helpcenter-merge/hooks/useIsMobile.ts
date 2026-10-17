import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px), (hover: none) and (pointer: coarse)';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY).matches : false
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}