-- EduStream Pro - Complete Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. STUDENTS TABLE
-- ========================================
CREATE TABLE students (
  id TEXT PRIMARY KEY DEFAULT ('S' || substr(md5(random()::text), 1, 4)),
  name TEXT NOT NULL,
  grade TEXT,
  class_id TEXT,
  parent_id TEXT,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  dob DATE NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  email TEXT,
  attendance INTEGER DEFAULT 100 CHECK (attendance >= 0 AND attendance <= 100),
  performance INTEGER DEFAULT 0 CHECK (performance >= 0 AND performance <= 100),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Graduated')),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. TEACHERS TABLE
-- ========================================
CREATE TABLE teachers (
  id TEXT PRIMARY KEY DEFAULT ('T' || substr(md5(random()::text), 1, 4)),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT UNIQUE,
  experience INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave')),
  avatar TEXT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. PARENTS TABLE
-- ========================================
CREATE TABLE parents (
  id TEXT PRIMARY KEY DEFAULT ('P' || substr(md5(random()::text), 1, 4)),
  title TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  religion TEXT,
  occupation TEXT,
  state_of_origin TEXT,
  marital_status TEXT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. CLASSES TABLE
-- ========================================
CREATE TABLE classes (
  id TEXT PRIMARY KEY DEFAULT ('C' || substr(md5(random()::text), 1, 3)),
  name TEXT NOT NULL,
  arm TEXT NOT NULL,
  class_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, arm)
);

-- ========================================
-- 5. SUBJECTS TABLE
-- ========================================
CREATE TABLE subjects (
  id TEXT PRIMARY KEY DEFAULT ('SUB' || substr(md5(random()::text), 1, 3)),
  name TEXT NOT NULL UNIQUE,
  is_elective BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 6. CLASS_SUBJECTS (Many-to-Many relationship)
-- ========================================
CREATE TABLE class_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- ========================================
-- 7. ELECTIVE_ENROLLMENTS (For elective subjects)
-- ========================================
CREATE TABLE elective_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- ========================================
-- 8. ACADEMIC_SESSIONS TABLE
-- ========================================
CREATE TABLE academic_sessions (
  id TEXT PRIMARY KEY DEFAULT ('SES' || substr(md5(random()::text), 1, 4)),
  year TEXT NOT NULL,
  term TEXT NOT NULL CHECK (term IN ('1st Term', '2nd Term', '3rd Term')),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, term)
);

-- ========================================
-- 9. RESULTS TABLE
-- ========================================
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session TEXT NOT NULL,
  term TEXT NOT NULL,
  ca1 INTEGER NOT NULL CHECK (ca1 >= 0 AND ca1 <= 20),
  ca2 INTEGER NOT NULL CHECK (ca2 >= 0 AND ca2 <= 20),
  exam INTEGER NOT NULL CHECK (exam >= 0 AND exam <= 60),
  total INTEGER NOT NULL CHECK (total >= 0 AND total <= 100),
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, session, term)
);

-- ========================================
-- 10. AFFECTIVE_TRAITS TABLE
-- ========================================
CREATE TABLE affective_traits (
  id TEXT PRIMARY KEY DEFAULT ('A' || substr(md5(random()::text), 1, 3)),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 11. PSYCHOMOTOR_TRAITS TABLE
-- ========================================
CREATE TABLE psychomotor_traits (
  id TEXT PRIMARY KEY DEFAULT ('PS' || substr(md5(random()::text), 1, 3)),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 12. STUDENT_REPORTS TABLE
-- ========================================
CREATE TABLE student_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session TEXT NOT NULL,
  term TEXT NOT NULL,
  affective_scores JSONB DEFAULT '{}',
  psychomotor_scores JSONB DEFAULT '{}',
  teacher_comment TEXT,
  times_opened INTEGER DEFAULT 0,
  times_present INTEGER DEFAULT 0,
  times_absent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, session, term)
);

-- ========================================
-- 13. SCHOOL_SETTINGS TABLE (Single row)
-- ========================================
CREATE TABLE school_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Lincoln High School',
  logo TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  primary_color TEXT DEFAULT '#4f46e5',
  enable_ai BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_teachers_status ON teachers(status);
CREATE INDEX idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX idx_class_subjects_teacher ON class_subjects(teacher_id);
CREATE INDEX idx_results_student ON results(student_id);
CREATE INDEX idx_results_subject ON results(subject_id);
CREATE INDEX idx_results_class ON results(class_id);
CREATE INDEX idx_results_session_term ON results(session, term);
CREATE INDEX idx_student_reports_student ON student_reports(student_id);
CREATE INDEX idx_student_reports_session_term ON student_reports(session, term);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE elective_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE affective_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychomotor_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users to read all data
-- You can make this more restrictive based on roles later
CREATE POLICY "Allow authenticated read access" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON parents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON class_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON elective_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON academic_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON affective_traits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON psychomotor_traits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON student_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON school_settings FOR SELECT TO authenticated USING (true);

-- Allow service role (your backend) to do everything
CREATE POLICY "Allow service role all access" ON students FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON teachers FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON parents FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON classes FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON subjects FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON class_subjects FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON elective_enrollments FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON academic_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON results FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON affective_traits FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON psychomotor_traits FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON student_reports FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role all access" ON school_settings FOR ALL TO service_role USING (true);

-- ========================================
-- SEED DATA (Initial setup)
-- ========================================

-- Insert default school settings
INSERT INTO school_settings (name, logo, address, email, phone, primary_color, enable_ai, permissions)
VALUES (
  'Lincoln High School',
  '',
  '123 Education Way, Scholastic City',
  'admin@lincoln.edu',
  '+1 (555) 000-1234',
  '#4f46e5',
  TRUE,
  '{"teacher": {"canManageStudents": true, "canEnterResults": true, "canViewAllStudents": true, "canEditProfiles": false, "canViewBroadsheet": true}, "parent": {"canViewResults": true, "canViewAttendance": true, "canViewRemarks": true}}'::jsonb
);

-- Insert default academic session
INSERT INTO academic_sessions (id, year, term, is_active)
VALUES ('SES2024-1', '2024/2025', '1st Term', TRUE);

-- Insert some traits
INSERT INTO affective_traits (id, name) VALUES
  ('A1', 'Honesty'),
  ('A2', 'Neatness'),
  ('A3', 'Punctuality');

INSERT INTO psychomotor_traits (id, name) VALUES
  ('PS1', 'Handwriting'),
  ('PS2', 'Handling Tools');

COMMENT ON TABLE students IS 'Stores student information and profile data';
COMMENT ON TABLE teachers IS 'Stores teacher information with authentication credentials';
COMMENT ON TABLE parents IS 'Stores parent/guardian information';
COMMENT ON TABLE results IS 'Stores student academic results for each subject';
COMMENT ON TABLE student_reports IS 'Stores comprehensive terminal reports for students';
