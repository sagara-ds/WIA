import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SideRail } from './SideRail'

interface PageProps {
  eyebrow: string
  title: string
  lead?: string
  home?: boolean
  badge?: ReactNode
  children: ReactNode
}

export function Page({ eyebrow, title, lead, home, badge, children }: PageProps) {
  const crumb = `SIAP / ${eyebrow.toLowerCase()}`
  const body = children
  return (
    <div className={`container${home ? ' home' : ''}`}>
      <div className="crumb">{crumb}</div>
      <div className="eyebrow">{eyebrow}</div>
      {badge ? (
        <div className="title-row">
          <h1>{title}</h1>
          {badge}
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      {lead ? <p className="lead">{lead}</p> : null}
      {home ? (
        body
      ) : (
        <div className="layout">
          <div className="main-card">{body}</div>
          <SideRail />
        </div>
      )}
    </div>
  )
}

export function Card({ title, children }: { title: ReactNode; children: ReactNode }) {
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
  return <div className={variant === 'error' ? 'notice error' : 'notice'}>{children}</div>
}

export function StatGrid({ items }: { items: { value: string; label: string }[] }) {
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

export function Timeline({ entries }: { entries: { at: string; label: string; waiter?: boolean; note?: string }[] }) {
  return (
    <p>
      {entries.map((e) => (
        <span key={`${e.at}-${e.label}-${e.waiter ? 'w' : 'o'}`}>
          {e.waiter ? (
            <span className="tl-waiting">{`${e.label}.`}</span>
          ) : (
            <>
              {e.at}
              {' · '}
              {e.label}
              {e.note ? ` — ${e.note}` : ''}
            </>
          )}
          {'\n'}
        </span>
      ))}
    </p>
  )
}
