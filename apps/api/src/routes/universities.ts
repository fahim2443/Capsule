import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { firebaseAuth } from '../middleware/firebase-verify';
import { requireRole } from '../middleware/roles';
import { D1Client } from '../db/d1-client';

const universities = new Hono<{ Bindings: Bindings; Variables: Variables }>();

universities.use('*', firebaseAuth);

// GET /universities — list all
universities.get('/', async (c) => {
  const db = new D1Client(c.env.DB);
  const rows = await db.all('SELECT * FROM universities ORDER BY name');
  return c.json({ universities: rows });
});

// GET /universities/:slug — get university + majors
universities.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = new D1Client(c.env.DB);

  const university = await db.first<{id:string;name:string;slug:string;domain:string|null;view_access:string}>('SELECT * FROM universities WHERE slug = ?', [slug]);
  if (!university) {
    return c.json({ error: 'University not found' }, 404);
  }

  const majors = await db.all('SELECT * FROM majors WHERE university_id = ? ORDER BY name', [university.id]);
  return c.json({ university, majors });
});

// POST /universities — create (ADMIN only)
universities.post('/', requireRole('ADMIN'), async (c) => {
  const body = await c.req.json<{ name: string; slug: string; domain?: string; view_access?: string }>();
  const { name, slug, domain, view_access = 'PUBLIC' } = body;

  if (!name || !slug) {
    return c.json({ error: 'Name and slug required' }, 400);
  }

  const id = crypto.randomUUID();
  const db = new D1Client(c.env.DB);

  try {
    await db.run(
      'INSERT INTO universities (id, name, slug, domain, view_access) VALUES (?, ?, ?, ?, ?)',
      [id, name, slug, domain ?? null, view_access]
    );
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Slug or domain already exists' }, 409);
    }
    throw e;
  }

  const university = await db.first<Record<string,unknown>>('SELECT * FROM universities WHERE id = ?', [id]);
  return c.json({ university }, 201);
});

// POST /universities/join — join by email domain
universities.post('/join', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const domain = user.email.split('@')[1];
  if (!domain) return c.json({ error: 'Invalid email' }, 400);

  const db = new D1Client(c.env.DB);
  const university = await db.first<{id:string}>('SELECT * FROM universities WHERE domain = ?', [domain]);

  if (!university) {
    return c.json({ error: 'No university found for your email domain' }, 404);
  }

  // Auto-verify if domain matches
  await db.run(
    'UPDATE users SET university_id = ?, verified = 1 WHERE id = ?',
    [university.id, user.id]
  );

  const updated = await db.first<Record<string,unknown>>('SELECT * FROM users WHERE id = ?', [user.id]);
  return c.json({ university, user: updated });
});

export default universities;
