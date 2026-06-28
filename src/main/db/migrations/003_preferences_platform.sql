CREATE TABLE IF NOT EXISTS job_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_positions JSON NOT NULL DEFAULT '[]',
  target_cities JSON NOT NULL DEFAULT '[]',
  salary_min INTEGER,
  salary_max INTEGER,
  industries JSON NOT NULL DEFAULT '[]',
  company_sizes JSON NOT NULL DEFAULT '[]',
  require_insurance INTEGER NOT NULL DEFAULT 1,
  require_weekend_off INTEGER NOT NULL DEFAULT 0,
  exclude_outsource INTEGER NOT NULL DEFAULT 0,
  blacklist_companies JSON NOT NULL DEFAULT '[]',
  exclude_keywords JSON NOT NULL DEFAULT '[]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_preferences_user_id ON job_preferences(user_id);

CREATE TABLE IF NOT EXISTS platform_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, platform)
);
