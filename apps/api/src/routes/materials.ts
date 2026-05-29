import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { firebaseAuth } from '../middleware/firebase-verify';
import { requireVerified } from '../middleware/roles';
import { D1Client } from '../db/d1-client';
import { generatePresignedUrl } from '../storage/r2-client';

const materials = new Hono<{ Bindings: Bindings; Variables: Variables }>();

materials.use('*', firebaseAuth);

// Parse multipart form data manually for Workers
async function parseMultipart(req: Request): Promise<{
  fields: Record<string, string>;
  file: { name: string; type: string; data: Uint8Array } | null;
}> {
  const contentType = req.headers.get('content-type') || '';
  const match = contentType.match(/boundary=(.+)/);
  if (!match) throw new Error('No boundary found');
  const boundary = match[1].trim().replace(/^"|"$/g, '');
  const boundaryBytes = new TextEncoder().encode('--' + boundary);
  const body = new Uint8Array(await req.arrayBuffer());

  const fields: Record<string, string> = {};
  let file: { name: string; type: string; data: Uint8Array } | null = null;

  let i = 0;
  while (i < body.length) {
    const boundaryIdx = indexOf(body, boundaryBytes, i);
    if (boundaryIdx === -1) break;
    let start = boundaryIdx + boundaryBytes.length;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;
    const nextBoundary = indexOf(body, boundaryBytes, start);
    if (nextBoundary === -1) break;
    let end = nextBoundary - 2;
    if (end > start) {
      const part = body.slice(start, end);
      const headerEnd = indexOf(part, new TextEncoder().encode('\r\n\r\n'), 0);
      if (headerEnd !== -1) {
        const headers = new TextDecoder().decode(part.slice(0, headerEnd));
        const data = part.slice(headerEnd + 4);
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
        if (filenameMatch) {
          file = {
            name: filenameMatch[1],
            type: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
            data,
          };
        } else if (nameMatch) {
          fields[nameMatch[1]] = new TextDecoder().decode(data);
        }
      }
    }
    i = nextBoundary;
  }

  return { fields, file };
}

function indexOf(haystack: Uint8Array, needle: Uint8Array, fromIndex: number): number {
  for (let i = fromIndex; i <= haystack.length - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

// POST /materials — upload
materials.post('/', requireVerified, async (c) => {
  const user = c.get('user')!;
  const req = c.req.raw;

  let parsed;
  try {
    parsed = await parseMultipart(req);
  } catch (e: any) {
    return c.json({ error: 'Invalid multipart body: ' + e.message }, 400);
  }

  const { fields, file } = parsed;
  const subjectId = fields.subject_id;
  const title = fields.title;
  const description = fields.description || '';
  const type = fields.type || 'OTHER';

  if (!subjectId || !title) {
    return c.json({ error: 'subject_id and title required' }, 400);
  }
  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  const db = new D1Client(c.env.DB);
  const subject = await db.first<{ semester_id: string }>(
    'SELECT semester_id FROM subjects WHERE id = ?',
    [subjectId]
  );
  if (!subject) return c.json({ error: 'Subject not found' }, 404);

  const semester = await db.first<{ major_id: string }>(
    'SELECT major_id FROM semesters WHERE id = ?',
    [subject.semester_id]
  );
  if (!semester) return c.json({ error: 'Semester not found' }, 404);

  const major = await db.first<{ university_id: string }>(
    'SELECT university_id FROM majors WHERE id = ?',
    [semester.major_id]
  );
  if (!major) return c.json({ error: 'Major not found' }, 404);

  const universityId = major.university_id;
  const id = crypto.randomUUID();
  const r2Key = `materials/${universityId}/${subjectId}/${id}/${file.name}`;

  await c.env.BUCKET.put(r2Key, file.data, {
    httpMetadata: { contentType: file.type },
  });

  await db.run(
    `INSERT INTO materials (id, subject_id, uploader_id, title, description, type, r2_key, file_name, file_size, mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, subjectId, user.id, title, description, type, r2Key, file.name, file.data.length, file.type]
  );

  const material = await db.first('SELECT * FROM materials WHERE id = ?', [id]);
  return c.json({ material }, 201);
});

// GET /materials/:id/download
materials.get('/:id/download', async (c) => {
  const id = c.req.param('id');
  const db = new D1Client(c.env.DB);
  const material = await db.first<{ r2_key: string; deleted: number; file_name: string }>(
    'SELECT r2_key, deleted, file_name FROM materials WHERE id = ?',
    [id]
  );

  if (!material || material.deleted) {
    return c.json({ error: 'Material not found' }, 404);
  }

  const accessKey = c.env.R2_ACCESS_KEY_ID;
  const secretKey = c.env.R2_SECRET_ACCESS_KEY;
  const endpoint = c.env.R2_ENDPOINT;
  const bucketName = c.env.BUCKET_NAME;

  if (accessKey && secretKey && endpoint && bucketName) {
    const url = await generatePresignedUrl(accessKey, secretKey, endpoint, bucketName, material.r2_key, 3600);
    return c.redirect(url);
  }

  // Fallback: proxy through Worker
  const obj = await c.env.BUCKET.get(material.r2_key);
  if (!obj) return c.json({ error: 'File not found in storage' }, 404);

  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${material.file_name}"`);
  return new Response(obj.body as ReadableStream, { headers });
});

// GET /materials/:subjectId — list materials
materials.get('/:subjectId', async (c) => {
  const subjectId = c.req.param('subjectId');
  const db = new D1Client(c.env.DB);
  const rows = await db.all(
    `SELECT m.*, u.display_name as uploader_name
     FROM materials m
     JOIN users u ON m.uploader_id = u.id
     WHERE m.subject_id = ? AND m.deleted = 0
     ORDER BY m.created_at DESC`,
    [subjectId]
  );
  return c.json({ materials: rows });
});

// DELETE /materials/:id — soft delete
materials.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const db = new D1Client(c.env.DB);
  const material = await db.first<{ uploader_id: string }>('SELECT uploader_id FROM materials WHERE id = ?', [id]);

  if (!material) return c.json({ error: 'Not found' }, 404);

  const canDelete = user.role === 'CLASS_REP' || user.role === 'ADMIN' || material.uploader_id === user.id;
  if (!canDelete) return c.json({ error: 'Forbidden' }, 403);

  await db.run('UPDATE materials SET deleted = 1 WHERE id = ?', [id]);
  return c.json({ success: true });
});

export default materials;
