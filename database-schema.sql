-- Supabase Database Schema for Weekly Application Portal

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    photo_url TEXT,
    question1_answer TEXT NOT NULL,
    question2_answer TEXT NOT NULL,
    question3_answer TEXT,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create weekly_questions table
CREATE TABLE IF NOT EXISTS weekly_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    question1 TEXT NOT NULL DEFAULT 'Why are you interested in this program?',
    question2 TEXT NOT NULL DEFAULT 'What unique skills or experiences do you bring?',
    question3 TEXT DEFAULT 'How do you plan to contribute to our community?',
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_number, year)
);

-- Create admin_users table (for managing weekly questions)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_week_year ON applications(week_number, year);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_weekly_questions_week_year ON weekly_questions(week_number, year);
CREATE INDEX IF NOT EXISTS idx_weekly_questions_is_active ON weekly_questions(is_active);

-- Add constraints
ALTER TABLE applications ADD CONSTRAINT unique_application_per_week_email UNIQUE(email, week_number, year);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_questions_updated_at BEFORE UPDATE ON weekly_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Applications policies
-- Allow anyone to insert applications (public submissions)
CREATE POLICY "Anyone can submit applications" ON applications
    FOR INSERT WITH CHECK (true);

-- Allow anyone to read their own applications
CREATE POLICY "Users can read their own applications" ON applications
    FOR SELECT USING (auth.email() = email);

-- Admin users can read all applications
CREATE POLICY "Admins can read all applications" ON applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.email() 
            AND is_active = true
        )
    );

-- Weekly questions policies
-- Allow anyone to read active weekly questions
CREATE POLICY "Anyone can read active weekly questions" ON weekly_questions
    FOR SELECT USING (is_active = true);

-- Only admins can manage weekly questions
CREATE POLICY "Admins can manage weekly questions" ON weekly_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.email() 
            AND is_active = true
        )
    );

-- Admin users policies
-- Only existing admins can read admin user data
CREATE POLICY "Admins can read admin users" ON admin_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.email() 
            AND is_active = true
        )
    );

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('application-photos', 'application-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos
CREATE POLICY "Anyone can upload photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'application-photos');

CREATE POLICY "Anyone can view photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'application-photos');

-- Create some sample weekly questions for the current week
DO $$
DECLARE
    current_week INTEGER;
    current_year INTEGER;
    next_sunday TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate current week number and year
    current_week := EXTRACT(WEEK FROM CURRENT_DATE);
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Calculate next Sunday 11:59:59 PM
    next_sunday := DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes 59 seconds';
    
    -- Insert sample questions for current week if they don't exist
    INSERT INTO weekly_questions (week_number, year, question1, question2, question3, deadline, is_active)
    VALUES (
        current_week,
        current_year,
        'Why are you interested in joining our exclusive program this week?',
        'What unique perspective or skill would you bring to our community?',
        'Describe a challenge you''ve overcome and what you learned from it.',
        next_sunday,
        true
    )
    ON CONFLICT (week_number, year) DO NOTHING;
END
$$;

-- Create a function to automatically create next week's questions
CREATE OR REPLACE FUNCTION create_next_week_questions()
RETURNS TRIGGER AS $$
DECLARE
    next_week INTEGER;
    next_year INTEGER;
    next_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate next week
    next_week := NEW.week_number + 1;
    next_year := NEW.year;
    
    -- Handle year rollover
    IF next_week > 53 THEN
        next_week := 1;
        next_year := next_year + 1;
    END IF;
    
    -- Calculate next week's deadline
    next_deadline := NEW.deadline + INTERVAL '7 days';
    
    -- Insert next week's questions with default values
    INSERT INTO weekly_questions (week_number, year, deadline, is_active)
    VALUES (next_week, next_year, next_deadline, true)
    ON CONFLICT (week_number, year) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create views for easier data access

-- View for current week applications
CREATE OR REPLACE VIEW current_week_applications AS
SELECT a.*, wq.question1, wq.question2, wq.question3
FROM applications a
JOIN weekly_questions wq ON a.week_number = wq.week_number AND a.year = wq.year
WHERE a.week_number = EXTRACT(WEEK FROM CURRENT_DATE)
AND a.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- View for application statistics
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;