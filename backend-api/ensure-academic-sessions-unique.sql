DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'academic_sessions_year_term_key'
  ) THEN
    ALTER TABLE academic_sessions
      ADD CONSTRAINT academic_sessions_year_term_key UNIQUE (year, term);
  END IF;
END $$;
