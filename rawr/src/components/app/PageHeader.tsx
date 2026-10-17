import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="px-5 pb-4 pt-2">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.045em] text-ink">{title}</h1>
      {subtitle ? <p className="mt-1 text-[15px] text-ink/55">{subtitle}</p> : null}
    </div>);

}