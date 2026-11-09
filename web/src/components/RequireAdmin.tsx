import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { adminApi } from '../lib/api'
import type { AdminRole } from '../lib/types'

export function RequireAdmin({ roles, children }: { roles?: AdminRole[]; children: ReactNode }) {
  const session = adminApi.getSession()
  if (!session) return <Navigate to="/petugas" replace />
  if (roles && !roles.includes(session.role)) return <Navigate to="/petugas/antrean" replace />
  return <>{children}</>
}
