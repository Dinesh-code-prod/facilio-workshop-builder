-- Speed: lookups the app makes on every request or every project list.
CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members(user_id);
CREATE INDEX IF NOT EXISTS projects_active_idx ON projects(archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS app_sessions_expires_idx ON app_sessions(expires_at);
