'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Subject } from '@/types';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export default function SemesterPage() {
  const { slug, majorId, semId } = useParams() as { slug: string; majorId: string; semId: string };
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    apiFetch(`/subjects/${encodeURIComponent(semId)}`)
      .then((d) => setSubjects(d.subjects))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [semId]);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-200 dark:bg-surface-800" />;

  return (
    <div className="space-y-6">
      <BreadcrumbNav crumbs={[
        { label: 'University', href: `/u/${slug}` },
        { label: 'Major', href: `/u/${slug}/${majorId}` },
        { label: `Semester` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subjects</h1>
        {user?.verified && (
          <AddSubjectButton semesterId={semId} onAdded={(s) => setSubjects((prev) => [...prev, s])} />
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 p-12 text-center dark:border-surface-700">
          <BookOpen className="mx-auto h-10 w-10 text-surface-400" />
          <p className="mt-3 text-lg font-medium">No subjects yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/u/${slug}/${majorId}/${semId}/${s.id}`}
              className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-surface-800 dark:bg-surface-900"
            >
              <h2 className="text-lg font-semibold">{s.name}</h2>
              {s.code && <p className="text-sm text-surface-500">{s.code}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddSubjectButton({ semesterId, onAdded }: { semesterId: string; onAdded: (s: Subject) => void }) {
  const { idToken } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ semester_id: semesterId, name, code }),
    });
    const data = await res.json();
    if (res.ok) {
      onAdded(data.subject);
      setOpen(false);
      setName('');
      setCode('');
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add Subject
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        className="h-9 rounded border border-surface-300 px-2 text-sm dark:border-surface-700 dark:bg-surface-900"
        placeholder="Subject name"
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
