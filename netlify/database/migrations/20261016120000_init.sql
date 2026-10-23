-- Facilio Requirement Workshop Builder — initial schema.
CREATE TABLE app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE app_sessions (
  token_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('consultant', 'customer')),
  user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
  project_id TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX app_sessions_user_idx ON app_sessions(user_id);
CREATE TABLE auth_failures (
  id BIGSERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_failures_subject_idx ON auth_failures(subject, at);
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  customer TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  customer_access_enabled BOOLEAN NOT NULL DEFAULT false,
  customer_access_hash TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE TABLE project_docs (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, section)
);
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL,
  chunks INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploading',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  replaces TEXT,
  superseded_by TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX project_files_project_idx ON project_files(project_id, category);
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module TEXT,
  topic TEXT,
  kind TEXT NOT NULL DEFAULT 'question',
  priority TEXT NOT NULL DEFAULT 'normal',
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_kind TEXT NOT NULL,
  session_ref TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX feedback_project_idx ON feedback(project_id);
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT,
  actor TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_project_idx ON audit_log(project_id, at);
