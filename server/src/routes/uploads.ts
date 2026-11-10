import multer from 'multer'
import crypto from 'crypto'
import { mkdirSync } from 'fs'
import { join } from 'path'

export const MAX_FILES = 5
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']

export const uploadsDir = join(__dirname, '../../uploads')

mkdirSync(uploadsDir, { recursive: true })

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
}

function safeExt(originalName: string, mimetype: string): string {
  const dot = originalName.lastIndexOf('.')
  const raw = dot >= 0 ? originalName.slice(dot).toLowerCase() : ''
  if (/^\.[a-z0-9]{1,8}$/.test(raw)) return raw
  return EXT_BY_MIME[mimetype] ?? ''
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${safeExt(file.originalname, file.mimetype)}`),
})

export const evidenceUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    // Fase 3 (T3.3): blob terenkripsi dikirim sebagai octet-stream, tetapi hanya
    // diterima bila request membawa penanda enkripsi (enc/encBody) yang valid.
    const body = req.body as Record<string, unknown> | undefined
    const hasEncMarker =
      (typeof body?.enc === 'string' && body.enc.length > 0) ||
      (typeof body?.encBody === 'string' && body.encBody === '1')
    if (file.mimetype === 'application/octet-stream') {
      if (hasEncMarker) {
        cb(null, true)
        return
      }
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
      return
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
      return
    }
    cb(null, true)
  },
})
