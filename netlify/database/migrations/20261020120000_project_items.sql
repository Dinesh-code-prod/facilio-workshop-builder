-- Records several people edit at once (actions, decisions, RAID, sign-offs, change requests, onboarding status,
-- minutes, use cases, …). One row per record so two people never overwrite each other's work.
CREATE TABLE project_items (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_side TEXT NOT NULL,
  updated_by TEXT,
  updated_side TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, kind, id)
);
CREATE INDEX project_items_kind_idx ON project_items(project_id, kind, updated_at);
