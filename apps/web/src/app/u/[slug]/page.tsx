'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { University, Major } from '@/types';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export default function UniversityPage() {
  const { slug } = useParams() as { slug: string };
  const [university, setUniversity] = useState<University | null>(null);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    apiFetch(`/universities/${encodeURIComponent(slug)}`)
      .then((data) => {
        setUniversity(data.university);
        setMajors(data.majors);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-200 dark:bg-surface-800" />;
  if (!university) return <p className="text-center text-surface-500">University not found</p>;

  return (
    <div className="space-y-6">
      <BreadcrumbNav crumbs={[{ label: university.name }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{university.name}</h1>
          {university.domain && <p className="text-sm text-surface-500">{university.domain}</p>}
        </div>
        {user?.verified && (
          <AddMajorButton universityId={university.id} onAdded={(m) => setMajors((prev) => [...prev, m])} />
        )}
      </div>

      {majors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 p-12 text-center dark:border-surface-700">
          <BookOpen className="mx-auto h-10 w-10 text-surface-400" />
          <p className="mt-3 text-lg font-medium">No majors yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {majors.map((m) => (
            <Link
              key={m.id}
              href={`/u/${slug}/${m.id}`}
              className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-surface-800 dark:bg-surface-900"
            >
              <h2 className="text-lg font-semibold">{m.name}</h2>
              {m.code && <p className="text-sm text-surface-500">{m.code}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMajorButton({ universityId, onAdded }: { universityId: string; onAdded: (m: Major) => void }) {
  const { idToken } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/majors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ university_id: universityId, name, code }),
    });
    const data = await res.json();
    if (res.ok) {
      onAdded(data.major);
      setOpen(false);
      setName('');
      setCode('');
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add Major
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        className="h-9 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="Major name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="h-9 w-24 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <Button size="sm" type="submit">Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}
export const runtime = 'edge';
