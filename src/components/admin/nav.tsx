'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/shared/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  Settings,
  Bug,
} from 'lucide-react';

export function AdminNav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
      exact: true,
    },
    {
      label: 'Users',
      href: '/admin?tab=users',
      icon: <Users className="h-4 w-4 mr-2" />,
    },
    {
      label: 'Analytics',
      href: '/admin?tab=analytics',
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
    },
    {
      label: 'Debug',
      href: '/admin/debug',
      icon: <Bug className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <nav className="border-b bg-gradient-to-r from-pink-50 to-white dark:from-pink-950 dark:to-background backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-2">
          <Icons.logo className="h-8 w-8" />
          <span className="text-xl font-semibold">Admin Dashboard</span>
        </div>
        
        <div className="ml-8 flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                (item.exact 
                  ? pathname === item.href
                  : pathname.includes(item.href.split('?')[0]) && item.href.includes(pathname.split('?')[0])
                )
                  ? "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/admin/settings">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden md:inline-block">Settings</span>
            </Link>
          </Button>
          
          <div className="flex items-center gap-2 text-sm">
            <Avatar className="h-8 w-8 border-2 border-pink-200 dark:border-pink-800">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback>
                {session?.user?.name?.[0]?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline-block font-medium">
              {session?.user?.name}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="text-destructive hover:text-destructive/80"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden md:inline-block">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>
  );
} 