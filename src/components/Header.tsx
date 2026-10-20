'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Settings } from 'lucide-react';

interface HeaderProps {
  setSidebarOpen?: (isOpen: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const pathname = usePathname();
  
  if (pathname === '/login' || pathname?.startsWith('/login')) return null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen?.(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
        <Link
          href="/settings"
          className="flex items-center gap-x-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="অ্যাকাউন্ট সেটিংস ও পাসওয়ার্ড পরিবর্তন"
        >
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            AD
          </div>
          <span className="hidden lg:flex lg:items-center">
            <span className="text-sm font-semibold leading-6 text-gray-900">
              অ্যাডমিন
            </span>
          </span>
          <Settings className="h-4 w-4 text-gray-400 hover:text-gray-600 ml-1" />
        </Link>
      </div>
    </header>
  );
}
