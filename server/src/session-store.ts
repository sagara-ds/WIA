import session from 'express-session'
import type { Database } from 'better-sqlite3'

const SWEEP_INTERVAL_MS = 10 * 60 * 1000

export class SqliteSessionStore extends session.Store {
  private db: Database

  constructor(db: Database) {
    super()
    this.db = db
    db.exec(
      `CREATE TABLE IF NOT EXISTS user_sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expires TEXT NOT NULL
      )`,
    )
    setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref()
  }

  private sweep(): void {
    try {
      this.db.prepare('DELETE FROM user_sessions WHERE expires < ?').run(new Date().toISOString())
    } catch {
      /* abaikan — sweep bersifat housekeeping */
    }
  }

  set(sid: string, sess: session.SessionData, cb?: (err?: unknown) => void): void {
    try {
      const maxAge = typeof sess.cookie?.maxAge === 'number' ? sess.cookie.maxAge : 8 * 60 * 60 * 1000
      const expires = new Date(Date.now() + maxAge).toISOString()
      this.db
        .prepare(
          `INSERT INTO user_sessions (sid, sess, expires) VALUES (?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`,
        )
        .run(sid, JSON.stringify(sess), expires)
      cb?.()
    } catch (err) {
      cb?.(err)
    }
  }

  get(sid: string, cb?: (err: unknown, sess?: session.SessionData | null) => void): void {
    try {
      const row = this.db.prepare('SELECT sess, expires FROM user_sessions WHERE sid = ?').get(sid) as
        | { sess: string; expires: string }
        | undefined
      if (!row) {
        cb?.(undefined, null)
        return
      }
      if (new Date(row.expires) < new Date()) {
        this.destroy(sid)
        cb?.(undefined, null)
        return
      }
      cb?.(undefined, JSON.parse(row.sess) as session.SessionData)
    } catch (err) {
      cb?.(err, null)
    }
  }

  destroy(sid: string, cb?: (err?: unknown) => void): void {
    try {
      this.db.prepare('DELETE FROM user_sessions WHERE sid = ?').run(sid)
      cb?.()
    } catch (err) {
      cb?.(err)
    }
  }
}
