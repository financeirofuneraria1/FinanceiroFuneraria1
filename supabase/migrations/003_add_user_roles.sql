-- ============================================
-- CREATE USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- UPDATE RLS POLICIES FOR REVENUES
-- ============================================
DROP POLICY IF EXISTS "Revenues: Users can delete their own revenues" ON revenues;
DROP POLICY IF EXISTS "Revenues: Only admins can delete revenues" ON revenues;

CREATE POLICY "Revenues: Only admins can delete revenues"
  ON revenues FOR DELETE
  USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- UPDATE RLS POLICIES FOR EXPENSES
-- ============================================
DROP POLICY IF EXISTS "Expenses: Users can delete their own expenses" ON expenses;
DROP POLICY IF EXISTS "Expenses: Only admins can delete expenses" ON expenses;

CREATE POLICY "Expenses: Only admins can delete expenses"
  ON expenses FOR DELETE
  USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- DROP EXISTING FUNCTION IF EXISTS
-- ============================================
DROP FUNCTION IF EXISTS public.init_user_profile();

-- ============================================
-- CREATE FUNCTION TO INITIALIZE USER PROFILE
-- ============================================
CREATE FUNCTION public.init_user_profile()
RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (id, role)
  VALUES (auth.uid(), 'user')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- POPULATE EXISTING USERS AS NON-ADMIN
-- ============================================
INSERT INTO user_profiles (id, role)
SELECT id, 'user'
FROM auth.users
ON CONFLICT DO NOTHING;

-- ============================================
-- PROMOTE FIRST USER TO ADMIN (UNCOMMENT TO RUN)
-- ============================================
-- Descomente a linha abaixo APENAS UMA VEZ para promover o primeiro usuário a admin
-- UPDATE user_profiles 
-- SET role = 'admin' 
-- WHERE id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);
