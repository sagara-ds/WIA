CREATE TABLE IF NOT EXISTS tickets (
  number TEXT PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  chronology TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  incident_date_approx INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  involved_party TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Diterima', 'Perlu Dilengkapi', 'Diverifikasi', 'Ditolak', 'Diteruskan', 'Ditindaklanjuti', 'Selesai')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  result_summary TEXT,
  result_file_name TEXT,
  result_file_size INTEGER,
  seeded INTEGER NOT NULL DEFAULT 0,
  enc_json TEXT,
  wrapped_key TEXT,
  recovery_salt TEXT,
  admin_wrapped_key TEXT,
  shared INTEGER NOT NULL DEFAULT 0,
  encrypted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ticket_evidence (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('initial', 'reply')),
  at TEXT NOT NULL,
  enc INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  at TEXT NOT NULL,
  author TEXT NOT NULL CHECK (author IN ('admin', 'pelapor')),
  body TEXT NOT NULL,
  attachment_name TEXT,
  attachment_size INTEGER,
  is_enc INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ticket_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  at TEXT NOT NULL,
  label TEXT NOT NULL,
  waiter INTEGER NOT NULL DEFAULT 0,
  note TEXT
);

CREATE TABLE IF NOT EXISTS internal_notes (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  at TEXT NOT NULL,
  admin TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('verifikator', 'super_admin')),
  name TEXT NOT NULL,
  public_key TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS master_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_evidence_ticket ON ticket_evidence(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket ON ticket_timeline(ticket_number);
CREATE INDEX IF NOT EXISTS idx_internal_notes_ticket ON internal_notes(ticket_number);
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log(at);
