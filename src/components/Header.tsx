'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  
  if (pathname === '/login') return null;

  return (
    <header className="flex h-16 items-center justify-end gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              AD
            </div>
            <span className="hidden lg:flex lg:items-center">
              <span className="ml-2 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                Admin User
              </span>
            </span>
          </div>
    </header>
  );
}
