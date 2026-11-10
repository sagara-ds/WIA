import type { NextFunction, Request, Response } from 'express'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function rateLimit(opts: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? 'tidak-diketahui'
    // Jalur ikut dalam key agar kuota per-jalur terpisah (mis. /api/admin vs
    // /tickets/check) — sebelumnya hanya windowMs:ip sehingga berbagi satu bucket.
    const key = `${opts.windowMs}:${req.baseUrl}:${ip}`
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
      next()
      return
    }
    bucket.count += 1
    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfter))
      res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' })
      return
    }
    next()
  }
}

export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
}
