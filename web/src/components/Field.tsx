import type { ReactNode } from 'react'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : <span aria-hidden="true"> (opsional)</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}

export function CheckField({
  id,
  checked,
  onChange,
  label,
  text,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  text: string
}) {
  return (
    <div className="field">
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label htmlFor={id}>
        {label}
        <span aria-hidden="true"> *</span>
      </label>
      <div className="check">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={checked ? undefined : 'true'}
        />
        <span>
          <span className="check-label">{label}.</span> {text}
        </span>
      </div>
    </div>
  )
}
