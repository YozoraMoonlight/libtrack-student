import { useEffect, useState } from 'react';

const NIGHT_START = 18;
const NIGHT_END = 6;

/** True between 6pm and 6am local time. Re-checks every minute. */
export function useIsNight() {
  const [night, setNight] = useState(checkNight);

  useEffect(() => {
    const interval = window.setInterval(() => setNight(checkNight()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return night;
}

function checkNight() {
  const hour = new Date().getHours();
  return hour >= NIGHT_START || hour < NIGHT_END;
}