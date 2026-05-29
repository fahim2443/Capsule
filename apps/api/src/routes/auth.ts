import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { firebaseAuth } from '../middleware/firebase-verify';
import { D1Client } from '../db/d1-client';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.use('*', firebaseAuth);

// POST /auth/sync — create or sync user after Firebase login
auth.post('/sync', async (c) => {
  const body = await c.req.json<{ idToken: string; displayName?: string }>();
  const token = body.idToken;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${c.env.FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    }
  );

  if (!res.ok) {
    return c.json({ error: 'Invalid Firebase token' }, 401);
  }

  const data = await res.json<{ users?: Array<{ localId: string; email: string; displayName?: string }> }>();
  const firebaseUser = data.users?.[0];

  if (!firebaseUser) {
    return c.json({ error: 'Invalid Firebase token' }, 401);
  }

  const db = new D1Client(c.env.DB);

  // Check if user exists
  const existing = await db.first('SELECT id FROM users WHERE id = ?', [firebaseUser.localId]);

  if (!existing) {
    await db.run(
      'INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)',
      [firebaseUser.localId, firebaseUser.email, body.displayName ?? firebaseUser.displayName ?? null]
    );
  } else if (body.displayName) {
    await db.run(
      'UPDATE users SET display_name = ? WHERE id = ?',
      [body.displayName, firebaseUser.localId]
    );
  }

  const user = await db.first('SELECT * FROM users WHERE id = ?', [firebaseUser.localId]);
  return c.json({ user });
});

// GET /auth/me
auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return c.json({ user });
});

export default auth;
