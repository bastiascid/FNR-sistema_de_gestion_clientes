'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ArrowLeftRight, 
  FileSpreadsheet, 
  Layers,
  Printer
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Portal Principal', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Bitácora de Movimientos', href: '/movimientos', icon: ArrowLeftRight },
    { name: 'Integración SII', href: '/sii', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar: hidden on print */}
      <aside className="no-print w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 flex-shrink-0 md:fixed md:top-0 md:bottom-0 md:left-0 z-30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wider">FNR 2026</h1>
            <p className="text-xs text-slate-400">Control Administrativo</p>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
          <p>© 2026 FNR Contable</p>
          <p className="text-[10px] mt-0.5">Versión 2.0 (SQLite)</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        {/* Top Navigation: hidden on print */}
        <header className="no-print h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg text-slate-800">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-700">Administrador FNR</span>
              <span className="text-[10px] text-slate-400">Acceso Completo</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-between justify-center font-bold text-sm">
              <span className="w-full text-center">AD</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
