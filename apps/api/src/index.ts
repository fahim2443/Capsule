import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables } from './types';

import authRoutes from './routes/auth';
import universityRoutes from './routes/universities';
import structureRoutes from './routes/structure';
import materialRoutes from './routes/materials';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors({
  origin: (origin) => {
    // Allow localhost and the configured frontend URL
    if (!origin) return '*';
    if (origin.includes('localhost')) return origin;
    return origin;
  },
  credentials: true,
}));

app.get('/', (c) => c.json({ message: 'Capsule API' }));

app.route('/auth', authRoutes);
app.route('/universities', universityRoutes);
app.route('/', structureRoutes);
app.route('/materials', materialRoutes);

app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

export default app;
