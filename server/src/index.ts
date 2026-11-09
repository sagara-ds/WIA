import express from 'express'
import { initDb } from './db'

initDb()

const app = express()

const PORT = Number(process.env.PORT ?? 3001)

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`SIAP server berjalan di http://localhost:${PORT}`)
})
