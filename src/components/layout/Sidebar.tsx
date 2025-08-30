'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: JSX.Element;
}

const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      name: 'Discover',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: 'Player',
      href: '/player',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12 6.5M9 19l-3 1.5V6l3-1.5z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-luxury-dark border-r border-silver/20 z-50">
      {/* Logo */}
      <div className="p-8 border-b border-silver/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-luxgreen to-luxviolet rounded-xl flex items-center justify-center shadow-luxury">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-luxury text-xl font-bold natural-shimmer-silver">
              MoodTunes
            </h1>
            <p className="text-xs text-silver-dark font-medium tracking-wide">
              AI CURATED
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-6">
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 luxury-hover ${
                  isActive
                    ? 'bg-luxury-card border border-silver/30 text-platinum shadow-green-glow'
                    : 'text-silver hover:text-platinum hover:bg-luxury-card/50'
                }`}
              >
                <div className={`transition-colors duration-300 ${
                  isActive ? 'text-luxgreen' : 'text-silver group-hover:text-luxgreen'
                }`}>
                  {item.icon}
                </div>
                <span className="font-medium tracking-wide">
                  {item.name}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-luxgreen animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

    </aside>
  );
};

export default Sidebar;