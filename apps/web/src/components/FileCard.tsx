'use client';

import type { Material } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Trash2 } from 'lucide-react';

export default function FileCard({ material, onDelete }: { material: Material; onDelete: () => void }) {
  const { user, idToken } = useAuth();
  const canDelete = user && (user.role === 'CLASS_REP' || user.role === 'ADMIN' || user.id === material.uploader_id);

  const handleDelete = async () => {
    if (!confirm('Delete this material?')) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/materials/${material.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) onDelete();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
          <FileText className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <p className="font-medium">{material.title}</p>
          <p className="text-xs text-surface-500">
            {material.file_name} • {formatSize(material.file_size)} • {material.type}
            {material.uploader_name && ` • by ${material.uploader_name}`}
          </p>
          {material.description && <p className="text-xs text-surface-400">{material.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/materials/${material.id}/download`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline">
            <Download className="mr-1 h-4 w-4" /> Download
          </Button>
        </a>
        {canDelete && (
          <Button size="sm" variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
