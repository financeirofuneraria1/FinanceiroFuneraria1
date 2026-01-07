-- ============================================
-- DROP ALL EXISTING TABLES (CLEAN START)
-- ============================================
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS revenues CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ============================================
-- 1. CREATE COMPANIES TABLE
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cnpj)
);

CREATE INDEX companies_user_id_idx ON companies(user_id);
CREATE INDEX companies_cnpj_idx ON companies(cnpj);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies: Users can view their own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Companies: Users can insert their own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Companies: Users can update their own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Companies: Users can delete their own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. CREATE CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'Tag',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

CREATE INDEX categories_user_id_idx ON categories(user_id);
CREATE INDEX categories_type_idx ON categories(type);
CREATE INDEX categories_user_type_idx ON categories(user_id, type);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories: Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Categories: Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Categories: Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Categories: Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. CREATE REVENUES TABLE
-- ============================================
CREATE TABLE revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX revenues_user_id_idx ON revenues(user_id);
CREATE INDEX revenues_company_id_idx ON revenues(company_id);
CREATE INDEX revenues_category_id_idx ON revenues(category_id);
CREATE INDEX revenues_date_idx ON revenues(date);
CREATE INDEX revenues_company_date_idx ON revenues(company_id, date);
CREATE INDEX revenues_user_company_date_idx ON revenues(user_id, company_id, date);

ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Revenues: Users can view their own revenues"
  ON revenues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Revenues: Users can insert their own revenues"
  ON revenues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Revenues: Users can update their own revenues"
  ON revenues FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Revenues: Users can delete their own revenues"
  ON revenues FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. CREATE EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX expenses_user_id_idx ON expenses(user_id);
CREATE INDEX expenses_company_id_idx ON expenses(company_id);
CREATE INDEX expenses_category_id_idx ON expenses(category_id);
CREATE INDEX expenses_date_idx ON expenses(date);
CREATE INDEX expenses_company_date_idx ON expenses(company_id, date);
CREATE INDEX expenses_user_company_date_idx ON expenses(user_id, company_id, date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expenses: Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Expenses: Users can insert their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Expenses: Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Expenses: Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. CREATE VIEWS FOR ANALYTICS
-- ============================================
CREATE OR REPLACE VIEW v_revenues_by_month AS
SELECT
  DATE_TRUNC('month', date)::DATE as month,
  company_id,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM revenues
GROUP BY DATE_TRUNC('month', date), company_id
ORDER BY month DESC;

CREATE OR REPLACE VIEW v_expenses_by_month AS
SELECT
  DATE_TRUNC('month', date)::DATE as month,
  company_id,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM expenses
GROUP BY DATE_TRUNC('month', date), company_id
ORDER BY month DESC;

CREATE OR REPLACE VIEW v_company_summary AS
SELECT
  c.id,
  c.name,
  c.cnpj,
  c.city,
  COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN r.amount ELSE 0 END), 0) as total_revenues,
  COALESCE(SUM(CASE WHEN e.id IS NOT NULL THEN e.amount ELSE 0 END), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN r.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN e.id IS NOT NULL THEN e.amount ELSE 0 END), 0) as balance
FROM companies c
LEFT JOIN revenues r ON c.id = r.company_id
LEFT JOIN expenses e ON c.id = e.company_id
GROUP BY c.id, c.name, c.cnpj, c.city;
