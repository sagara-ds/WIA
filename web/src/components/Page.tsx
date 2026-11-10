import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { SideRail } from './SideRail'

interface PageProps {
  eyebrow: string
  title: string
  lead?: string
  home?: boolean
  reportStep?: 1 | 2 | 3
  badge?: ReactNode
  children: ReactNode
}

export function Page({
  eyebrow,
  title,
  lead,
  home,
  reportStep,
  badge,
  children,
}: PageProps) {
  const { pathname } = useLocation()
  const staff = pathname.startsWith('/petugas/')
  const route = pathname.split('/').filter(Boolean).join('-') || 'home'
  const body = children
  return (
    <div className={`container page-${route}${home ? ' home' : ''}`}>
      {!home && (
        <nav className="crumb" aria-label="Jejak halaman">
          <Link to={staff ? '/petugas/antrean' : '/'}>
            {staff ? 'Ruang kerja' : 'Beranda'}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{eyebrow.toLowerCase()}</span>
        </nav>
      )}
      <div className="page-heading">
        {badge ? (
          <div className="title-row">
            <h1>{title}</h1>
            {badge}
          </div>
        ) : (
          <h1>{title}</h1>
        )}
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {reportStep && (
        <ol
          className="report-progress"
          aria-label={`Langkah ${reportStep} dari 3`}
        >
          {['Kejadian', 'Bukti', 'Tinjau'].map((label, index) => (
            <li
              key={label}
              className={reportStep >= index + 1 ? 'active' : ''}
              aria-current={reportStep === index + 1 ? 'step' : undefined}
            >
              <span className="progress-number">{index + 1}</span>
              <span>{label}</span>
              {reportStep > index + 1 && (
                <span className="sr-only"> — selesai</span>
              )}
            </li>
          ))}
        </ol>
      )}
      {home ? (
        body
      ) : (
        <div className="layout">
          <div className="main-card">{body}</div>
          {!staff && <SideRail />}
        </div>
      )}
    </div>
  )
}

export function Card({
  title,
  children,
}: {
  title: ReactNode
  children: ReactNode
}) {
  return (
    <article className="card">
      <h2>{title}</h2>
      {children}
    </article>
  )
}

export function Notice({
  variant,
  children,
}: {
  variant?: 'error' | undefined
  children: ReactNode
}) {
  return (
    <div className={variant === 'error' ? 'notice error' : 'notice'}>
      {children}
    </div>
  )
}

export function StatGrid({
  items,
}: {
  items: { value: string; label: string }[]
}) {
  return (
    <div className="stats">
      {items.map((s) => (
        <div className="stat" key={s.label}>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

export function ActionsRow({ children }: { children: ReactNode }) {
  return <div className="actions">{children}</div>
}

export function CtaLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to}>{children}</Link>
}

export function Timeline({
  entries,
}: {
  entries: { at: string; label: string; waiter?: boolean; note?: string }[]
}) {
  return (
    <ol className="timeline">
      {entries.map((e) => (
        <li key={`${e.at}-${e.label}`} className={e.waiter ? 'is-waiting' : ''}>
          {!e.waiter && <span className="timeline-at">{e.at}</span>}
          <strong>{e.label}</strong>
          {e.note && <p>{e.note}</p>}
        </li>
      ))}
    </ol>
  )
}
