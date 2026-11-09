import type { EvidenceMeta } from '../lib/types'
import { formatBytes } from '../lib/format'

interface FileChipProps {
  item: EvidenceMeta
  onRemove?: () => void
}

export function FileChip({ item, onRemove }: FileChipProps) {
  return (
    <div className="filechip">
      <span>
        <strong>{item.name}</strong> · {formatBytes(item.size)}
        {item.kind === 'reply' ? ' · bukti tambahan' : ''}
      </span>
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Hapus ${item.name}`}>
          Hapus
        </button>
      ) : null}
    </div>
  )
}
