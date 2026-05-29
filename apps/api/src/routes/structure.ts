import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { firebaseAuth } from '../middleware/firebase-verify';
import { requireVerified } from '../middleware/roles';
import { D1Client } from '../db/d1-client';

const structure = new Hono<{ Bindings: Bindings; Variables: Variables }>();

structure.use('*', firebaseAuth);

// ─── Majors ───────────────────────────────────────────────

structure.get('/majors/:universityId', async (c) => {
  const universityId = c.req.param('universityId');
  const db = new D1Client(c.env.DB);
  const rows = await db.all('SELECT * FROM majors WHERE university_id = ? ORDER BY name', [universityId]);
  return c.json({ majors: rows });
});

structure.post('/majors', requireVerified, async (c) => {
  const body = await c.req.json<{ university_id: string; name: string; code?: string }>();
  const { university_id, name, code } = body;
  if (!university_id || !name) return c.json({ error: 'university_id and name required' }, 400);

  const id = crypto.randomUUID();
  const db = new D1Client(c.env.DB);
  await db.run(
    'INSERT INTO majors (id, university_id, name, code) VALUES (?, ?, ?, ?)',
    [id, university_id, name, code ?? null]
  );
  const row = await db.first('SELECT * FROM majors WHERE id = ?', [id]);
  return c.json({ major: row }, 201);
});

// ─── Semesters ────────────────────────────────────────────

structure.get('/semesters/:majorId', async (c) => {
  const majorId = c.req.param('majorId');
  const db = new D1Client(c.env.DB);
  const rows = await db.all('SELECT * FROM semesters WHERE major_id = ? ORDER BY number', [majorId]);
  return c.json({ semesters: rows });
});

structure.post('/semesters', requireVerified, async (c) => {
  const body = await c.req.json<{ major_id: string; number: number; label?: string }>();
  const { major_id, number, label } = body;
  if (!major_id || typeof number !== 'number') return c.json({ error: 'major_id and number required' }, 400);

  const id = crypto.randomUUID();
  const db = new D1Client(c.env.DB);
  await db.run(
    'INSERT INTO semesters (id, major_id, number, label) VALUES (?, ?, ?, ?)',
    [id, major_id, number, label ?? null]
  );
  const row = await db.first('SELECT * FROM semesters WHERE id = ?', [id]);
  return c.json({ semester: row }, 201);
});

// ─── Subjects ─────────────────────────────────────────────

structure.get('/subjects/:semesterId', async (c) => {
  const semesterId = c.req.param('semesterId');
  const db = new D1Client(c.env.DB);
  const rows = await db.all('SELECT * FROM subjects WHERE semester_id = ? ORDER BY name', [semesterId]);
  return c.json({ subjects: rows });
});

structure.post('/subjects', requireVerified, async (c) => {
  const body = await c.req.json<{ semester_id: string; name: string; code?: string }>();
  const { semester_id, name, code } = body;
  if (!semester_id || !name) return c.json({ error: 'semester_id and name required' }, 400);

  const id = crypto.randomUUID();
  const db = new D1Client(c.env.DB);
  await db.run(
    'INSERT INTO subjects (id, semester_id, name, code) VALUES (?, ?, ?, ?)',
    [id, semester_id, name, code ?? null]
  );
  const row = await db.first('SELECT * FROM subjects WHERE id = ?', [id]);
  return c.json({ subject: row }, 201);
});

export default structure;
