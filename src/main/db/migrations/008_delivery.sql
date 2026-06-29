-- Phase 1c: 投递记录与岗位星标

CREATE TABLE IF NOT EXISTS delivery_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT,
  platform TEXT NOT NULL,
  batch_id TEXT REFERENCES job_fetch_batches(id) ON DELETE SET NULL,
  external_job_id TEXT NOT NULL,
  job_title TEXT,
  company_name TEXT,
  salary_range TEXT,
  job_url TEXT,
  match_score REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_records_user_sent
  ON delivery_records(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_records_user_status
  ON delivery_records(user_id, status);

CREATE INDEX IF NOT EXISTS idx_delivery_records_user_job
  ON delivery_records(user_id, platform, external_job_id);

CREATE TABLE IF NOT EXISTS job_starred (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'boss',
  external_job_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, platform, external_job_id)
);
