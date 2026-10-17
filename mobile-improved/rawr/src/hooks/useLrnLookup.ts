import { useCallback, useState } from 'react';
import { mockStudents } from '../data/students';
import type { Student } from '../types/auth';

export type LrnLookupStatus = 'idle' | 'loading' | 'found' | 'not-found';

export function useLrnLookup() {
  const [status, setStatus] = useState<LrnLookupStatus>('idle');
  const [student, setStudent] = useState<Student | null>(null);

  const lookup = useCallback(async (lrn: string) => {
    setStatus('loading');
    await new Promise((resolve) => setTimeout(resolve, 900));
    const match = mockStudents.find((s) => s.lrn === lrn);
    if (match) {
      setStudent(match);
      setStatus('found');
    } else {
      setStudent(null);
      setStatus('not-found');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setStudent(null);
  }, []);

  return { status, student, lookup, reset };
}