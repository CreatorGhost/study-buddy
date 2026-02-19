-- PYQ (Previous Year Questions) Tables for StudyBuddy AI
-- Run this in the Supabase SQL Editor

-- Table: pyq_papers — One row per paper
CREATE TABLE IF NOT EXISTS pyq_papers (
  id TEXT PRIMARY KEY,                -- e.g. "physics_2024"
  subject TEXT NOT NULL,              -- "Physics", "Chemistry", etc.
  year INTEGER NOT NULL,
  set_code TEXT,                      -- e.g. "55/1/1"
  total_marks INTEGER NOT NULL,       -- 70 or 100
  duration INTEGER NOT NULL,          -- minutes
  source_file TEXT,                   -- original PDF filename
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: pyq_questions — One row per question
CREATE TABLE IF NOT EXISTS pyq_questions (
  id TEXT PRIMARY KEY,                   -- e.g. "physics_2024_q1"
  paper_id TEXT REFERENCES pyq_papers(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  year INTEGER NOT NULL,
  section TEXT NOT NULL,                 -- "A", "B", "C", "D"
  question_number INTEGER NOT NULL,
  type TEXT NOT NULL,                    -- "mcq", "short-answer", "long-answer", etc.
  question TEXT NOT NULL,                -- full question text (markdown/LaTeX)
  options JSONB,                         -- ["(a) ...", "(b) ..."] or null
  correct_answer TEXT NOT NULL,
  solution TEXT NOT NULL,                -- full solution text
  marks INTEGER NOT NULL,
  topic TEXT,                            -- chapter/topic name
  has_alternative BOOLEAN DEFAULT FALSE,
  alternative_question JSONB,            -- alternative "Or" question if exists
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pyq_questions_subject ON pyq_questions(subject);
CREATE INDEX IF NOT EXISTS idx_pyq_questions_marks ON pyq_questions(marks);
CREATE INDEX IF NOT EXISTS idx_pyq_questions_subject_marks ON pyq_questions(subject, marks);
CREATE INDEX IF NOT EXISTS idx_pyq_questions_year ON pyq_questions(year);
CREATE INDEX IF NOT EXISTS idx_pyq_questions_paper_id ON pyq_questions(paper_id);

-- Table: pyq_results — Student practice results
CREATE TABLE IF NOT EXISTS pyq_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  marks_category INTEGER NOT NULL,       -- 1, 2, 3, 4, 5, or 6
  year INTEGER,                          -- null if mixed years
  questions_attempted INTEGER NOT NULL,
  questions_correct INTEGER NOT NULL,
  score_percentage NUMERIC NOT NULL,
  weak_topics JSONB,                     -- ["Electromagnetic Induction", "Optics"]
  answers JSONB,                         -- { "question_id": "user_answer", ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pyq_results_subject ON pyq_results(subject);
CREATE INDEX IF NOT EXISTS idx_pyq_results_created_at ON pyq_results(created_at);

-- Enable Row Level Security (optional — disable if not using auth)
-- ALTER TABLE pyq_papers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pyq_questions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pyq_results ENABLE ROW LEVEL SECURITY;

-- Public read access policies (if RLS enabled)
-- CREATE POLICY "Public read pyq_papers" ON pyq_papers FOR SELECT USING (true);
-- CREATE POLICY "Public read pyq_questions" ON pyq_questions FOR SELECT USING (true);
-- CREATE POLICY "Public insert pyq_results" ON pyq_results FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Public read pyq_results" ON pyq_results FOR SELECT USING (true);
