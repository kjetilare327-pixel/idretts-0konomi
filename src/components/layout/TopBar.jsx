import React from 'react';
import { Menu, Bell, LogOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TopBar({ onMenuClick, user, pageTitle, canGoBack, onBack }) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-2 md:px-6">
      <div className="flex items-center gap-1">
        {/* Back button on mobile when not on root */}
        {canGoBack ? (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Mobile: show page title; Desktop: show welcome message */}
        <span className="text-base font-semibold text-foreground lg:hidden">{pageTitle}</span>
        <span className="text-lg font-semibold text-foreground hidden lg:block">
          Velkommen tilbake{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-semibold">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
              {user?.email}
            </div>
            <DropdownMenuItem onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logg ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}