-- ============================================
-- PROMOVER PRIMEIRO USUÁRIO A ADMIN
-- ============================================
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);

-- ============================================
-- CRIAR POLÍTICAS DE RLS PARA CONTROLAR ACESSO
-- ============================================

-- USER_PROFILES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admins_full_access_profiles" ON user_profiles
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
  );

-- COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_all_companies" ON companies
  FOR SELECT USING (true);

CREATE POLICY "admins_edit_companies" ON companies
  FOR INSERT, UPDATE, DELETE USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
  );

-- REVENUES
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_all_revenues" ON revenues
  FOR SELECT USING (true);

CREATE POLICY "admins_edit_revenues" ON revenues
  FOR INSERT, UPDATE, DELETE USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
  );

-- EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_all_expenses" ON expenses
  FOR SELECT USING (true);

CREATE POLICY "admins_edit_expenses" ON expenses
  FOR INSERT, UPDATE, DELETE USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
  );

-- CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "admins_edit_categories" ON categories
  FOR INSERT, UPDATE, DELETE USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
  );

-- ============================================
-- VERIFICAR SE FOI PROMOVIDO
-- ============================================
SELECT id, email, role FROM auth.users 
LEFT JOIN user_profiles ON auth.users.id = user_profiles.id
ORDER BY auth.users.created_at ASC;
