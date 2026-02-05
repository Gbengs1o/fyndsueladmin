-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to insert their OWN profile
-- This is critical for new users signing up (Google or Email)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. Allow users to view their OWN profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 3. Allow users to update their OWN profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- 4. Allow public read access to basic profile info (optional but often needed for social features)
-- Uncomment if you want other users to see names/avatars
-- CREATE POLICY "Public profiles are viewable by everyone" ON profiles
--   FOR SELECT
--   USING (true);
