'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, apiFetchWithAuth } from '@/lib/api';
import type { University } from '@/types';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, idToken } = useAuth();

  useEffect(() => {
    apiFetch('/universities')
      .then((data) => setUniversities(data.universities))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Universities</h1>
        {user?.role === 'ADMIN' && (
          <AddUniversityButton idToken={idToken} onAdded={(u) => setUniversities((prev) => [...prev, u])} />
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-200 dark:bg-surface-800" />
          ))}
        </div>
      ) : universities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 p-12 text-center dark:border-surface-700">
          <Building2 className="mx-auto h-10 w-10 text-surface-400" />
          <p className="mt-3 text-lg font-medium">No universities yet</p>
          <p className="text-sm text-surface-500">Be the first to add one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <Link
              key={u.id}
              href={`/u/${u.slug}`}
              className="group rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-surface-800 dark:bg-surface-900"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold group-hover:text-primary-600">{u.name}</h2>
                {u.view_access === 'UNIVERSITY_ONLY' && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    Private
                  </span>
                )}
              </div>
              {u.domain && <p className="mt-1 text-sm text-surface-500">{u.domain}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddUniversityButton({ idToken, onAdded }: { idToken: string | null; onAdded: (u: University) => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/universities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ name, slug, domain }),
    });
    const data = await res.json();
    if (res.ok) {
      onAdded(data.university);
      setOpen(false);
      setName('');
      setSlug('');
      setDomain('');
    } else {
      alert(data.error || 'Failed to create university');
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add University
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        className="h-9 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="h-9 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        required
      />
      <input
        className="h-9 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="Domain"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />
      <Button size="sm" type="submit">Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}
