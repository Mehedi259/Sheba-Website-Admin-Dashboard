'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Image as ImageIcon,
  Briefcase, 
  Home,
  Car,
  Wrench,
  AlertTriangle, 
  Newspaper, 
  MessageSquare,
  LogOut,
  ShoppingCart
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'ড্যাশবোর্ড', href: '/', icon: LayoutDashboard },
  { name: 'ব্যবহারকারী', href: '/users', icon: Users },
  { name: 'স্লাইডার', href: '/sliders', icon: ImageIcon },
  { name: 'চাকরি', href: '/jobs', icon: Briefcase },
  { name: 'প্রপার্টি', href: '/properties', icon: Home },
  { name: 'যানবাহন', href: '/vehicles', icon: Car },
  { name: 'সার্ভিস', href: '/services', icon: Wrench },
  { name: 'জরুরী অবস্থা', href: '/emergency', icon: AlertTriangle },
  { name: 'সংবাদ', href: '/news', icon: Newspaper },
  { name: 'কমিউনিটি', href: '/community', icon: MessageSquare },
  { name: 'মার্কেট', href: '/market', icon: ShoppingCart },
];

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 lg:hidden"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-white border-r border-gray-200 text-gray-900 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 shrink-0 items-center px-6 gap-3 border-b border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/main-logo.png" alt="Sheba Admin" className="h-14 w-auto object-contain bg-gray-50 border border-gray-100 p-1.5 rounded-lg" />
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">অ্যাডমিন</span>
        </div>
      <nav className="flex flex-1 flex-col px-4 py-4 overflow-y-auto">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={clsx(
                        isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600',
                          'h-6 w-6 shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <button
              onClick={handleLogout}
              className="group -mx-2 flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-gray-600" />
              লগআউট
            </button>
          </li>
        </ul>
      </nav>
    </div>
    </>
  );
}
