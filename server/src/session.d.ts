import 'express-session'

declare module 'express-session' {
  interface SessionData {
    admin?: { email: string; role: 'verifikator' | 'super_admin'; name: string }
    ticket?: { number: string; checkedAt: number }
  }
}
