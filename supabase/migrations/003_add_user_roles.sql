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
-- DROP old policies
DROP POLICY IF EXISTS "Revenues: Users can delete their own revenues" ON revenues;

-- CREATE new delete policy (only admins can delete)
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
-- DROP old policies
DROP POLICY IF EXISTS "Expenses: Users can delete their own expenses" ON expenses;

-- CREATE new delete policy (only admins can delete)
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
-- CREATE FUNCTION TO AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CREATE TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_profile_created ON auth.users;
CREATE TRIGGER on_auth_user_profile_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

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
