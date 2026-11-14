import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpenIcon, LayoutGridIcon, ReceiptIcon, SearchIcon, ShoppingCartIcon } from 'lucide-react';
import { useBorrowCart } from '../../api/borrowCart';
import { cn } from '../../utils/cn';

const tabs = [
{ to: '/app', label: 'Home', icon: LayoutGridIcon, end: true },
{ to: '/app/browse', label: 'Browse', icon: SearchIcon, end: false },
{ to: '/app/cart', label: 'Cart', icon: ShoppingCartIcon, end: false },
{ to: '/app/borrowings', label: 'Borrowings', icon: BookOpenIcon, end: false },
{ to: '/app/fines', label: 'Fines', icon: ReceiptIcon, end: false }];


export function BottomNav() {
  const { count } = useBorrowCart();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-ink/[0.07] bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end }) =>
        <li key={to}>
            <NavLink
            to={to}
            end={end}
            aria-label={to === '/app/cart' && count > 0 ? `Borrow Cart, ${count} ${count === 1 ? 'book' : 'books'}` : undefined}
            className="group flex flex-col items-center gap-1 py-1 focus-visible:outline-none">
            
              {({ isActive }) =>
            <>
                  <span
                className={cn(
                  'relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-150 ease-out group-focus-visible:ring-2 group-focus-visible:ring-brand-amber',
                  isActive ? 'bg-brand-amber text-[#121212]' : 'text-ink/45'
                )}>
                
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                    {to === '/app/cart' && count > 0 ?
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  
                        {count > 9 ? '9+' : count}
                      </span> :
                null}
                  </span>
                  <span className={cn('whitespace-nowrap text-[11px] font-semibold', isActive ? 'text-ink' : 'text-ink/50')}>
                    {label}
                 
                  </span>
                </>
            }
            </NavLink>
          </li>
        )}
      </ul>
    </nav>);

}
