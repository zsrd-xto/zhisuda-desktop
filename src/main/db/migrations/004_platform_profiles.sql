CREATE TABLE IF NOT EXISTS platform_page_profiles (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  page_type TEXT NOT NULL,
  version TEXT NOT NULL,
  url_pattern TEXT NOT NULL,
  dom_fingerprint TEXT,
  api_fingerprint TEXT,
  recipe_json TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  captured_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS platform_extract_runs (
  id TEXT PRIMARY KEY,
  profile_id TEXT,
  channel TEXT,
  status TEXT,
  error_code TEXT,
  job_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_listings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
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
  UNIQUE(user_id, platform, external_job_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_page_profiles_active
  ON platform_page_profiles(platform, page_type, is_active);

CREATE INDEX IF NOT EXISTS idx_job_listings_user_platform
  ON job_listings(user_id, platform, fetched_at);
