'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { X, Upload } from 'lucide-react';

export default function UploadModal({
  subjectId,
  onClose,
  onUploaded,
}: {
  subjectId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const { idToken } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('OTHER');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/materials`);
    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        onUploaded();
        onClose();
      } else {
        alert('Upload failed: ' + xhr.responseText);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert('Upload failed');
    };

    xhr.send(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-surface-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Upload Material</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-surface-100 dark:hover:bg-surface-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="LECTURE_NOTE">Lecture Note</option>
              <option value="SLIDE">Slide</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="QUESTION_PAPER">Question Paper</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <Label>File</Label>
            <div
              className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-surface-300 p-6 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-surface-400" />
              <p className="mt-2 text-sm text-surface-500">
                {file ? file.name : 'Click to select a file'}
              </p>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full bg-surface-200 dark:bg-surface-800">
                <div
                  className="h-2 rounded-full bg-primary-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-surface-500">{progress}% uploaded</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={uploading || !file}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
