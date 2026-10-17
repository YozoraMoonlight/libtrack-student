import { useCallback, useState } from 'react';
import { ApiError, lookupLrn } from '../api/laravel';
import type { Student } from '../types/auth';

export type LrnLookupStatus = 'idle' | 'loading' | 'found' | 'not-found';

export function useLrnLookup() {
  const [status, setStatus] = useState<LrnLookupStatus>('idle');
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (lrn: string) => {
    setStatus('loading');
    setError(null);
    try {
      const result = await lookupLrn(lrn);
      setStudent({
        lrn: result.lrn,
        name: result.name,
        gradeSection: [result.grade_level, result.section].filter(Boolean).join(' - '),
        schoolName: result.school_name,
        schoolCode: result.school_code,
        gradeLevel: result.grade_level,
        section: result.section,
      });
      setStatus('found');
    } catch (reason: unknown) {
      setStudent(null);
      setStatus('not-found');
      setError(reason instanceof ApiError ? reason.message : 'No active student record matches that LRN.');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setStudent(null);
    setError(null);
  }, []);

  return { status, student, error, lookup, reset };
}
