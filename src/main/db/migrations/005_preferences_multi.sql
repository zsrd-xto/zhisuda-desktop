-- 求职偏好：支持多条单组合配置
CREATE TABLE IF NOT EXISTS job_preferences_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_position TEXT NOT NULL,
  target_city TEXT NOT NULL,
  salary_min INTEGER NOT NULL,
  salary_max INTEGER NOT NULL,
  industries JSON NOT NULL DEFAULT '[]',
  company_sizes JSON NOT NULL DEFAULT '[]',
  require_insurance INTEGER NOT NULL DEFAULT 1,
  require_weekend_off INTEGER NOT NULL DEFAULT 0,
  exclude_outsource INTEGER NOT NULL DEFAULT 0,
  blacklist_companies JSON NOT NULL DEFAULT '[]',
  exclude_keywords JSON NOT NULL DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO job_preferences_new (
  id, user_id, name, target_position, target_city, salary_min, salary_max,
  industries, company_sizes, require_insurance, require_weekend_off,
  exclude_outsource, blacklist_companies, exclude_keywords, created_at, updated_at
)
SELECT
  id,
  user_id,
  COALESCE(
    NULLIF(
      TRIM(
        COALESCE(json_extract(target_positions, '$[0]'), '') || '·' ||
        COALESCE(json_extract(target_cities, '$[0]'), '') || '·' ||
        COALESCE(CAST(salary_min AS TEXT), '') || '-' ||
        COALESCE(CAST(salary_max AS TEXT), '') || 'K'
      ),
      ''
    ),
    '默认偏好'
  ),
  COALESCE(json_extract(target_positions, '$[0]'), ''),
  COALESCE(json_extract(target_cities, '$[0]'), ''),
  COALESCE(salary_min, 0),
  COALESCE(salary_max, 0),
  industries,
  company_sizes,
  require_insurance,
  require_weekend_off,
  exclude_outsource,
  blacklist_companies,
  exclude_keywords,
  updated_at,
  updated_at
FROM job_preferences;

DROP TABLE job_preferences;
ALTER TABLE job_preferences_new RENAME TO job_preferences;

CREATE INDEX IF NOT EXISTS idx_job_preferences_user ON job_preferences(user_id);

-- 抓取批次
CREATE TABLE IF NOT EXISTS job_fetch_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_id TEXT REFERENCES job_preferences(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  conditions_json TEXT NOT NULL,
  conditions_label TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  job_count INTEGER NOT NULL DEFAULT 0,
  channel TEXT,
  profile_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_fetch_batches_user_fetched
  ON job_fetch_batches(user_id, fetched_at DESC);

-- job_listings 归属批次
CREATE TABLE IF NOT EXISTS job_listings_new (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES job_fetch_batches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_job_id TEXT NOT NULL,
  title TEXT,
  company_name TEXT,
  salary TEXT,
  city TEXT,
  job_url TEXT,
  detail_json TEXT,
  fetched_at TEXT,
  profile_version TEXT,
  UNIQUE(batch_id, external_job_id)
);

DROP TABLE job_listings;
ALTER TABLE job_listings_new RENAME TO job_listings;

CREATE INDEX IF NOT EXISTS idx_job_listings_batch ON job_listings(batch_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_user_fetched ON job_listings(user_id, fetched_at);
