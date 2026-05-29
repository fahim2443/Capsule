'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetchWithAuth } from '@/lib/api';
import type { Material } from '@/types';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import FileCard from '@/components/FileCard';
import UploadModal from '@/components/UploadModal';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export default function SubjectPage() {
  const { slug, majorId, semId, subjectId } = useParams() as {
    slug: string;
    majorId: string;
    semId: string;
    subjectId: string;
  };
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { user, idToken } = useAuth();

  const load = () => {
    apiFetchWithAuth(`/materials/${encodeURIComponent(subjectId)}`, idToken)
      .then((d) => setMaterials(d.materials))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, idToken]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav crumbs={[
        { label: 'University', href: `/u/${slug}` },
        { label: 'Major', href: `/u/${slug}/${majorId}` },
        { label: 'Semester', href: `/u/${slug}/${majorId}/${semId}` },
        { label: 'Subject' },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Materials</h1>
        {user?.verified && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Upload
          </Button>
        )}
      </div>

      {uploadOpen && (
        <UploadModal
          subjectId={subjectId}
          onClose={() => setUploadOpen(false)}
          onUploaded={load}
        />
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-200 dark:bg-surface-800" />
      ) : materials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 p-12 text-center dark:border-surface-700">
          <FileText className="mx-auto h-10 w-10 text-surface-400" />
          <p className="mt-3 text-lg font-medium">No materials yet</p>
          {user?.verified && (
            <Button className="mt-4" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1 h-4 w-4" /> Upload first material
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => (
            <FileCard key={m.id} material={m} onDelete={load} />
          ))}
        </div>
      )}
    </div>
  );
}
