import React, { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, PrinterIcon } from 'lucide-react';
import { GuideDocument } from '../components/helpCenter/GuideDocument';
import { startGuides } from '../data/helpCenter';

const printStyles = `
@media print {
  @page { size: A4; margin: 16mm; }
  html, body { background: #ffffff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function StartGuide() {
  const { guideId } = useParams();
  const guide = startGuides.find((g) => g.id === guideId);

  // The tab title becomes the default PDF file name
  useEffect(() => {
    if (!guide) return;
    const previous = document.title;
    document.title = `${guide.title} — LIBTRACK`;
    return () => {
      document.title = previous;
    };
  }, [guide]);

  if (!guide) return <Navigate to="/app/help" replace />;

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-paper print:min-h-0 print:bg-[#ffffff]">
      <style>{printStyles}</style>

      <div className="relative flex min-h-[100dvh] w-full max-w-[430px] flex-col print:min-h-0 print:max-w-none">
        <header className="sticky top-0 z-20 flex items-center gap-1 bg-paper px-2 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))] print:hidden">
          <Link
            to="/app/help"
            state={{ sheet: 'guides' }}
            aria-label="Back to guides"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-150 active:scale-[0.92] active:bg-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
            <ChevronLeftIcon className="h-6 w-6" aria-hidden="true" />
          </Link>
          <p className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[-0.02em] text-ink">Guides</p>
        </header>

        <main className="flex-1 px-3 pb-36 pt-1 print:p-0">
          <GuideDocument guide={guide} />
        </main>

        <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center print:hidden">
          <div className="w-full max-w-[430px] border-t border-ink/[0.07] bg-paper px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-ink text-[15px] font-semibold text-paper transition-transform duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber focus-visible:ring-offset-2">
              
              <PrinterIcon className="h-[18px] w-[18px]" aria-hidden="true" />
              Print or save as PDF
            </button>
            <p className="mt-2 text-center text-[12px] text-ink/50">Choose “Save as PDF” to keep a copy on your phone.</p>
          </div>
        </div>
      </div>
    </div>);

}