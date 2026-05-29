import type { D1Database } from '@cloudflare/workers-types';

export class D1Client {
  constructor(private db: D1Database) {}

  async first<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await this.db.prepare(sql).bind(...(params ?? [])).first<T>();
    return result ?? null;
  }

  async all<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.db.prepare(sql).bind(...(params ?? [])).all<T>();
    return result.results ?? [];
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    await this.db.prepare(sql).bind(...(params ?? [])).run();
  }
}
