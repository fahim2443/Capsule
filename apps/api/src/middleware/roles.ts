import type { MiddlewareHandler } from 'hono';
import type { Bindings, Variables, UserRole } from '../types';

const ROLE_RANK: Record<UserRole, number> = {
  STUDENT: 0,
  CLASS_REP: 1,
  ADMIN: 2,
};

export const requireAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

export const requireRole = (minRole: UserRole): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> => {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
};

export const requireVerified: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  if (!user.verified) {
    return c.json({ error: 'Account not verified' }, 403);
  }
  await next();
};
