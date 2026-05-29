import type { MiddlewareHandler } from 'hono';
import type { Bindings, Variables, User } from '../types';
import { D1Client } from '../db/d1-client';

interface FirebaseUser {
  localId: string;
  email: string;
  displayName?: string;
}

const tokenCache = new Map<string, { user: FirebaseUser; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function verifyFirebaseToken(token: string, apiKey: string): Promise<FirebaseUser | null> {
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) {
    return cached.user;
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json<{ users?: FirebaseUser[] }>();
  const user = data.users?.[0] ?? null;

  if (user) {
    tokenCache.set(token, { user, expires: Date.now() + CACHE_TTL_MS });
  }
  return user;
}

export const firebaseAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  let user: User | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const firebaseUser = await verifyFirebaseToken(token, c.env.FIREBASE_API_KEY);

    if (firebaseUser) {
      const db = new D1Client(c.env.DB);
      const dbUser = await db.first<User>(
        'SELECT * FROM users WHERE id = ?',
        [firebaseUser.localId]
      );
      user = dbUser ?? null;
    }
  }

  c.set('user', user);
  await next();
};
