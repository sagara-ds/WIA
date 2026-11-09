import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { AdminRole } from '../lib/types'

export function RequireAdmin({ roles, children }: { roles?: AdminRole[]; children: ReactNode }) {
  const raw = sessionStorage.getItem('siap.admin-session.v1')
  let session: { email: string; role: AdminRole; name: string } | null = null
  try { session = raw ? JSON.parse(raw) : null } catch { session = null }
  if (!session) return <Navigate to="/petugas" replace />
  if (roles && !roles.includes(session.role)) return <Navigate to="/petugas/antrean" replace />
  return <>{children}</>
}
