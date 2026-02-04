'use client';

import { motion } from 'framer-motion';
import { BarChart3, Bell, CreditCard, Home, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Expenses', href: '/expenses', icon: CreditCard },
  { name: 'Groups', href: '/groups', icon: Users },
  { name: 'Insights', href: '/insights', icon: BarChart3 },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-slate-200 md:top-0 md:bottom-auto md:border-t-0 md:border-b md:bg-white/90">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-around md:justify-center md:gap-6 px-2 md:px-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center p-1.5 md:p-4 group min-w-0 flex-1 md:flex-none ${
                  isActive ? 'text-blue-600' : 'text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-blue-500'
                  }`} />
                  
                  {isActive && (
                    <motion.div
                      layoutId="navigation-indicator"
                      className="hidden md:block absolute -bottom-4 left-1/2 w-12 h-1 bg-blue-600 rounded-full transform -translate-x-1/2"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                
                <span className={`text-xs md:text-sm transition-colors truncate max-w-full ${
                  isActive ? 'font-medium text-blue-600' : 'font-normal text-slate-600 group-hover:text-blue-500'
                }`}>
                  {item.name}
                </span>
                
                {isActive && (
                  <motion.div
                    layoutId="navigation-indicator-mobile"
                    className="md:hidden absolute -top-1 left-1/2 w-1 h-1 bg-blue-600 rounded-full transform -translate-x-1/2"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
