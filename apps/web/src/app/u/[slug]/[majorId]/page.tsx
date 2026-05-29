'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Major, Semester } from '@/types';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export default function MajorPage() {
  const { slug, majorId } = useParams() as { slug: string; majorId: string };
  const [major, setMajor] = useState<Major | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      apiFetch(`/universities/${encodeURIComponent(slug)}`).then((d) => {
        const m = d.majors.find((x: Major) => x.id === majorId);
        setMajor(m || null);
      }),
      apiFetch(`/semesters/${encodeURIComponent(majorId)}`).then((d) => setSemesters(d.semesters)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, majorId]);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-200 dark:bg-surface-800" />;
  if (!major) return <p className="text-center text-surface-500">Major not found</p>;

  return (
    <div className="space-y-6">
      <BreadcrumbNav crumbs={[
        { label: 'University', href: `/u/${slug}` },
        { label: major.name },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{major.name}</h1>
        {user?.verified && (
          <AddSemesterButton majorId={majorId} onAdded={(s) => setSemesters((prev) => [...prev, s])} />
        )}
      </div>

      {semesters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 p-12 text-center dark:border-surface-700">
          <Calendar className="mx-auto h-10 w-10 text-surface-400" />
          <p className="mt-3 text-lg font-medium">No semesters yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {semesters.map((s) => (
            <Link
              key={s.id}
              href={`/u/${slug}/${majorId}/${s.id}`}
              className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-surface-800 dark:bg-surface-900"
            >
              <h2 className="text-lg font-semibold">Semester {s.number}</h2>
              {s.label && <p className="text-sm text-surface-500">{s.label}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddSemesterButton({ majorId, onAdded }: { majorId: string; onAdded: (s: Semester) => void }) {
  const { idToken } = useAuth();
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ major_id: majorId, number: Number(number), label }),
    });
    const data = await res.json();
    if (res.ok) {
      onAdded(data.semester);
      setOpen(false);
      setNumber('');
      setLabel('');
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add Semester
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        className="h-9 w-20 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="#"
        type="number"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        required
      />
      <input
        className="h-9 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="Label (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Button size="sm" type="submit">Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}
