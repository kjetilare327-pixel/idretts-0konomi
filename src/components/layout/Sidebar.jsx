import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard,
  Users, FileText, Settings, X, ChevronLeft,
  Bot, Bell, BarChart3, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transaksjoner', icon: ArrowLeftRight },
  { path: '/payments', label: 'Betalinger', icon: CreditCard },
  { path: '/members', label: 'Medlemmer', icon: Users },
  { path: '/reports', label: 'Rapporter', icon: FileText },
  { path: '/liquidity', label: 'Likviditet', icon: BarChart3 },
  { path: '/automation', label: 'Automatisering', icon: Bell },
  { path: '/ai-assistant', label: 'AI Assistent', icon: Bot },
  { path: '/bank-integration', label: 'Bank-integrasjon', icon: Building2 },
  { path: '/settings', label: 'Innstillinger', icon: Settings },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
          "lg:translate-x-0 lg:relative lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[68px]" : "lg:w-64",
          "w-64"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border", collapsed && "lg:justify-center lg:px-2")}>
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-sm">KF</span>
              </div>
              <span className="font-semibold text-base tracking-tight">KlubbFinans</span>
            </div>
          )}
          {collapsed && (
            <div className="hidden lg:flex w-8 h-8 rounded-lg bg-sidebar-primary items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">KF</span>
            </div>
          )}
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-sidebar-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "lg:justify-center lg:px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex p-3 border-t border-sidebar-border">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground/60"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  );
}