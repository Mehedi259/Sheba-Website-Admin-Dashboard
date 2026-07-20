'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Image as ImageIcon,
  Briefcase, 
  AlertTriangle, 
  Newspaper, 
  MessageSquare,
  LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Sliders', href: '/sliders', icon: ImageIcon },
  { name: 'Classifieds', href: '/classifieds', icon: Briefcase },
  { name: 'Emergency', href: '/emergency', icon: AlertTriangle },
  { name: 'News', href: '/news', icon: Newspaper },
  { name: 'Community', href: '/community', icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white transition-all duration-300">
      <div className="flex h-16 shrink-0 items-center px-6">
        <h1 className="text-xl font-bold tracking-tight text-white">Sheba Admin</h1>
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
                          ? 'bg-gray-800 text-indigo-400'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-white',
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
              className="group -mx-2 flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-white" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
