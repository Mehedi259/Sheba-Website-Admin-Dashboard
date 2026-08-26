'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  UserSearch
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

const serviceCategories = [
  { name: 'Specialist Doctor', label: 'স্পেশালিস্ট ডক্টর' },
  { name: 'Hospital', label: 'হসপিটাল' },
  { name: 'Ambulance', label: 'অ্যাম্বুলেন্স' },
  { name: 'Police Station', label: 'পুলিশ স্টেশন' },
  { name: 'Embassy', label: 'এম্বাসি' },
  { name: 'Travel Agency', label: 'ট্রাভেল এজেন্সি' },
  { name: 'Hotel', label: 'হোটেল' },
  { name: 'Maktab Sanad', label: 'মক্তব সনদ' },
  { name: 'Money Exchange', label: 'মানি এক্সচেঞ্জ' },
  { name: 'Lawyer', label: 'লইয়ার' },
  { name: 'Tourist Place', label: 'ট্যুরিস্ট প্লেস' },
  { name: 'Medical Services', label: 'মেডিকেল সার্ভিস' },
  { name: 'Educational Institutions', label: 'শিক্ষা প্রতিষ্ঠান' },
  { name: 'Visa Services', label: 'ভিসা সার্ভিস' },
  { name: 'Cleaning', label: 'ক্লিনিং' },
  { name: 'Plumbing', label: 'প্লাম্বিং' },
  { name: 'Other', label: 'অন্যান্য' },
];

const navigation = [
  { name: 'ড্যাশবোর্ড', href: '/', icon: LayoutDashboard },
  { name: 'ব্যবহারকারী', href: '/users', icon: Users },
  { name: 'স্লাইডার', href: '/sliders', icon: ImageIcon },
  { name: 'চাকরি', href: '/jobs', icon: Briefcase },
  { name: 'চাকরিপ্রার্থী', href: '/job-seekers', icon: UserSearch },
  { name: 'প্রপার্টি', href: '/properties', icon: Home },
  { name: 'যানবাহন', href: '/vehicles', icon: Car },
  { name: 'সার্ভিস', href: '/services', icon: Wrench, subItems: serviceCategories.map(cat => ({ name: cat.label, href: `/services?category=${encodeURIComponent(cat.name)}`, queryValue: cat.name })) },
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
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'সার্ভিস': pathname.startsWith('/services')
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

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
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isSubMenuOpen = openMenus[item.name];

                return (
                  <li key={item.name}>
                    {hasSubItems ? (
                      <div>
                        <button
                          onClick={() => toggleMenu(item.name)}
                          className={clsx(
                            isActive || isSubMenuOpen
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'group flex w-full justify-between items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors'
                          )}
                        >
                          <div className="flex items-center gap-x-3">
                            <item.icon
                              className={clsx(
                                isActive || isSubMenuOpen ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </div>
                          {isSubMenuOpen ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                        {isSubMenuOpen && (
                          <ul className="mt-1 space-y-1 pl-10">
                            {item.subItems!.map((subItem) => {
                              const isSubActive = searchParams.get('category') === subItem.queryValue;
                              return (
                                <li key={subItem.name}>
                                  <Link
                                    href={subItem.href}
                                    className={clsx(
                                      isSubActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                      'block rounded-md px-3 py-2 text-sm transition-colors'
                                    )}
                                  >
                                    {subItem.name}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : (
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
                    )}
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
