export const ACCEPT_MIME = ['image/jpeg', 'image/png', 'application/pdf'] as const

export const ACCEPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'] as const

export const ACCEPT_ATTR = [...ACCEPT_MIME, ...ACCEPT_EXTENSIONS].join(',')

export function describeIssueCount(n: number): string {
  return n === 1 ? '1 berkas' : `${n} berkas`
}
