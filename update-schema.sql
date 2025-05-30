-- Update database schema to add new form fields
-- Run this in Supabase SQL Editor

-- Add new columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS sexual_orientation TEXT,
ADD COLUMN IF NOT EXISTS favorite_color VARCHAR(100),
ADD COLUMN IF NOT EXISTS location VARCHAR(50),
ADD COLUMN IF NOT EXISTS are_you_happy TEXT,
ADD COLUMN IF NOT EXISTS greatest_fear TEXT,
ADD COLUMN IF NOT EXISTS fun_to_be_around TEXT,
ADD COLUMN IF NOT EXISTS life_without_partner TEXT,
ADD COLUMN IF NOT EXISTS looking_for_here TEXT;

-- Remove old question columns (optional - you can keep them for historical data)
-- ALTER TABLE applications DROP COLUMN IF EXISTS question1_answer;
-- ALTER TABLE applications DROP COLUMN IF EXISTS question2_answer;
-- ALTER TABLE applications DROP COLUMN IF EXISTS question3_answer;

-- Update the current_week_applications view
CREATE OR REPLACE VIEW current_week_applications AS
SELECT a.*, wq.question1, wq.question2, wq.question3
FROM applications a
LEFT JOIN weekly_questions wq ON a.week_number = wq.week_number AND a.year = wq.year
WHERE a.week_number = EXTRACT(WEEK FROM CURRENT_DATE)
AND a.year = EXTRACT(YEAR FROM CURRENT_DATE);