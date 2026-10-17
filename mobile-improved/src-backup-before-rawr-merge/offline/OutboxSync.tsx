import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { flushReturns } from './outbox';
import { subscribeRetry } from './connection';

export function OutboxSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const sync = async () => {
      const result = await flushReturns(userId);
      if (result.sent > 0 || result.failed > 0) {
        window.dispatchEvent(new CustomEvent('libtrack:returns-synced'));
      }
    };
    const onOnline = () => void sync();
    const interval = window.setInterval(() => void sync(), 30_000);
    const unsubscribe = subscribeRetry(() => void sync());

    window.addEventListener('online', onOnline);
    void sync();

    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [user?.id]);

  return null;
}
