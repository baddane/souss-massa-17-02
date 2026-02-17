-- Supabase Policies for SoussMassa-RH
-- Security policies for all tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Read all offers" ON job_offers;
DROP POLICY IF EXISTS "Admin can manage offers" ON job_offers;

DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

DROP POLICY IF EXISTS "Users can read own applications" ON applications;
DROP POLICY IF EXISTS "Users can manage own applications" ON applications;

-- Job Offers Policies
-- Public can read all job offers
CREATE POLICY "Read all offers" ON job_offers
FOR SELECT USING (true);

-- Only service role (admin) can manage job offers
CREATE POLICY "Admin can manage offers" ON job_offers
FOR ALL TO service_role USING (true);

-- Users Policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (auth.uid() = id);

-- Applications Policies
-- Users can read their own applications
CREATE POLICY "Users can read own applications" ON applications
FOR SELECT USING (auth.uid() = user_id);

-- Users can create and update their own applications
CREATE POLICY "Users can manage own applications" ON applications
FOR ALL USING (auth.uid() = user_id);

-- Enable Row Level Security on tables
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;