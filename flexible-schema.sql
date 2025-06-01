-- Flexible database schema for changing questions
-- Run this in Supabase SQL Editor

-- Drop old specific columns and use flexible JSON storage
-- Keep only essential structured fields
DROP TABLE IF EXISTS applications CASCADE;

CREATE TABLE applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    photo_url TEXT,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Flexible JSON field for all form responses
    form_responses JSONB NOT NULL,
    
    -- Constraints
    UNIQUE(email, week_number, year)
);

-- Keep weekly_questions table as is (unchanged)
-- applications table will store responses in flexible JSON format

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_week_year ON applications(week_number, year);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at);

-- Add GIN index for JSON queries
CREATE INDEX IF NOT EXISTS idx_applications_form_responses ON applications USING GIN (form_responses);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Applications policies
-- Allow anyone to insert applications (public submissions)
DROP POLICY IF EXISTS "Anyone can submit applications" ON applications;
CREATE POLICY "Anyone can submit applications" ON applications
    FOR INSERT WITH CHECK (true);

-- Allow anyone to read their own applications
DROP POLICY IF EXISTS "Users can read their own applications" ON applications;
CREATE POLICY "Users can read their own applications" ON applications
    FOR SELECT USING (auth.email() = email);

-- Create view for current week applications
CREATE OR REPLACE VIEW current_week_applications AS
SELECT a.*, wq.question1, wq.question2, wq.question3
FROM applications a
LEFT JOIN weekly_questions wq ON a.week_number = wq.week_number AND a.year = wq.year
WHERE a.week_number = EXTRACT(WEEK FROM CURRENT_DATE)
AND a.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Create view for application statistics
CREATE OR REPLACE VIEW application_stats AS
SELECT 
    week_number,
    year,
    COUNT(*) as total_applications,
    COUNT(DISTINCT email) as unique_applicants,
    MIN(submitted_at) as first_submission,
    MAX(submitted_at) as last_submission
FROM applications
GROUP BY week_number, year
ORDER BY year DESC, week_number DESC;

-- Example queries for JSON data:
-- Get all applications with specific gender:
-- SELECT * FROM applications WHERE form_responses->>'gender' = 'woman';

-- Get applications by location:
-- SELECT * FROM applications WHERE form_responses->>'location' = 'SF';

-- Get applications by age range (assuming dateOfBirth is stored):
-- SELECT *, 
--        EXTRACT(year FROM age(CURRENT_DATE, (form_responses->>'dateOfBirth')::date)) as age
-- FROM applications 
-- WHERE EXTRACT(year FROM age(CURRENT_DATE, (form_responses->>'dateOfBirth')::date)) BETWEEN 25 AND 35;