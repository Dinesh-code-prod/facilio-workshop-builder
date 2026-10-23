-- People the platform owner has given admin-panel access to, by email. Roles: 'admin' (manage everything except access) and 'sub' (read-only view).
CREATE TABLE IF NOT EXISTS admin_grants (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sub')),
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
