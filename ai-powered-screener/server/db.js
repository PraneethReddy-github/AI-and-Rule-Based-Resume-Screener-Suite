import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS job_descriptions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    ai_role_profile TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    resume_text TEXT,
    jd_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jd_id) REFERENCES job_descriptions(id)
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id TEXT NOT NULL,
    total_score INTEGER,
    tier TEXT,
    required_skill_score INTEGER,
    nice_to_have_score INTEGER,
    experience_score INTEGER,
    education_score INTEGER,
    ai_bonus INTEGER,
    matched_required TEXT, -- JSON array
    missing_required TEXT, -- JSON array
    matched_nice_to_have TEXT, -- JSON array
    extra_skills TEXT, -- JSON array
    high_points TEXT, -- JSON array
    low_points TEXT, -- JSON array
    placement_rationale TEXT,
    interview_questions TEXT, -- JSON array
    detected_years REAL,
    detected_education TEXT,
    gemini_raw_response TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    jd_id TEXT,
    history TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jd_id) REFERENCES job_descriptions(id)
  );
`);

export default db;
