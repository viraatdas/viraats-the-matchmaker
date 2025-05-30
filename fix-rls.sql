-- Fix Row Level Security for anonymous application submissions
-- Run this in Supabase SQL Editor

-- Temporarily disable RLS on applications table for anonymous inserts
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

-- Or keep RLS but add a permissive policy for inserts
-- Uncomment these lines if you prefer to keep RLS enabled:

-- ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Allow anonymous application submissions" ON applications;
-- CREATE POLICY "Allow anonymous application submissions" ON applications
--     FOR INSERT TO anon WITH CHECK (true);
-- 
-- DROP POLICY IF EXISTS "Allow authenticated application submissions" ON applications;  
-- CREATE POLICY "Allow authenticated application submissions" ON applications
--     FOR INSERT TO authenticated WITH CHECK (true);

-- Also disable RLS on weekly_questions for reads
ALTER TABLE weekly_questions DISABLE ROW LEVEL SECURITY;

-- Keep admin_users protected
-- (admin_users RLS stays enabled)