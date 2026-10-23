-- Answers customer stakeholders and consultants give in the Customer User Guide's module learning sections:
-- requirement questions, standard-field decisions, custom field requests, preparation checklist and watched clips.
CREATE TABLE guide_responses (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  author_name TEXT NOT NULL,
  author_kind TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, key)
);
