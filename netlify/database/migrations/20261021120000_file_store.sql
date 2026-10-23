-- Optional: project files kept in the database (FWB_FILE_STORE=db) instead of Netlify Blobs.
CREATE TABLE IF NOT EXISTS fwb_files (
  key text PRIMARY KEY,
  bytes bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
