'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GraduationCap, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="border-b border-surface-200 bg-white px-4 py-3 dark:border-surface-800 dark:bg-surface-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
          <GraduationCap className="h-7 w-7" />
          Capsule
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-surface-200 dark:bg-surface-800" />
          ) : user ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.display_name || user.email}</span>
                <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                  {user.role}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
