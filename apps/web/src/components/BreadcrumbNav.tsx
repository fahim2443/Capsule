'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

export default function BreadcrumbNav({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-surface-500">
      <Link href="/" className="flex items-center hover:text-primary-600">
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-primary-600">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-surface-900 dark:text-surface-100">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
