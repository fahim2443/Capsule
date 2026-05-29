import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export type UserRole = 'STUDENT' | 'CLASS_REP' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  university_id: string | null;
  verified: number;
  created_at: string;
}

export interface Bindings {
  DB: D1Database;
  BUCKET: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY: string;
  FRONTEND_URL: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ENDPOINT?: string;
  BUCKET_NAME?: string;
}

export interface Variables {
  user: User | null;
}
