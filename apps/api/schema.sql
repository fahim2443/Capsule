CREATE TABLE IF NOT EXISTS universities (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  slug      TEXT UNIQUE NOT NULL,
  domain    TEXT UNIQUE,
  view_access TEXT DEFAULT 'PUBLIC'
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  role          TEXT DEFAULT 'STUDENT',
  university_id TEXT REFERENCES universities(id),
  verified      INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS majors (
  id            TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id),
  name          TEXT NOT NULL,
  code          TEXT,
  UNIQUE(university_id, code)
);

CREATE TABLE IF NOT EXISTS semesters (
  id        TEXT PRIMARY KEY,
  major_id  TEXT NOT NULL REFERENCES majors(id),
  number    INTEGER NOT NULL,
  label     TEXT,
  UNIQUE(major_id, number)
);

CREATE TABLE IF NOT EXISTS subjects (
  id          TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES semesters(id),
  name        TEXT NOT NULL,
  code        TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  id           TEXT PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(id),
  uploader_id  TEXT NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT DEFAULT 'OTHER',
  r2_key       TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    INTEGER,
  mime_type    TEXT,
  deleted      INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);
