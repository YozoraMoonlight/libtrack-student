import React from 'react';
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import { motion } from 'framer-motion';

interface FormMessageProps {
  type: 'error' | 'success';
  children: React.ReactNode;
}

export function FormMessage({ type, children }: FormMessageProps) {
  const isError = type === 'error';
  return (
    <motion.div
      role={isError ? 'alert' : 'status'}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={
      isError ?
      'flex gap-3 rounded-xl bg-red-50 p-3.5 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300' :
      'flex gap-3 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
      }>
      
      {isError ? <AlertCircleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </motion.div>);

}