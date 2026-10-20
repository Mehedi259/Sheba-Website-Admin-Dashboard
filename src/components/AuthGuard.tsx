'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Match both /login, /login/ and any subpaths
  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    if (!token && !isLoginPage) {
      setIsAuthenticated(false);
      router.push('/login');
    } else if (token && isLoginPage) {
      setIsAuthenticated(true);
      router.push('/');
    } else {
      setIsAuthenticated(!!token);
    }
    
    setLoading(false);
  }, [pathname, isLoginPage, router]);

  // If on login page, render only the login screen without any sidebar or header
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  // If not authenticated and not on login page, don't flash the dashboard
  if (!isAuthenticated) {
    return null;
  }

  // Render the dashboard layout ONLY for authenticated users
  return (
    <div className="h-full flex overflow-hidden w-full relative">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
