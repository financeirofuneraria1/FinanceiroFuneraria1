-- ============================================
-- CREATE FUNCTION TO AUTO-SEED CATEGORIES
-- ============================================
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default REVENUE categories for new user
  INSERT INTO categories (user_id, name, type, color, icon)
  VALUES 
    (NEW.id, 'Serviços de Velório', 'revenue', '#10b981', 'Briefcase'),
    (NEW.id, 'Caixão', 'revenue', '#10b981', 'Box'),
    (NEW.id, 'Flores', 'revenue', '#10b981', 'Flower2'),
    (NEW.id, 'Urna', 'revenue', '#10b981', 'Package'),
    (NEW.id, 'Velas', 'revenue', '#10b981', 'Flame'),
    (NEW.id, 'Transporte', 'revenue', '#10b981', 'Truck'),
    (NEW.id, 'Documentação', 'revenue', '#10b981', 'FileText'),
    (NEW.id, 'Outros Serviços', 'revenue', '#10b981', 'MoreHorizontal')
  ON CONFLICT DO NOTHING;

  -- Insert default EXPENSE categories for new user
  INSERT INTO categories (user_id, name, type, color, icon)
  VALUES 
    (NEW.id, 'Aluguel', 'expense', '#ef4444', 'Home'),
    (NEW.id, 'Energia Elétrica', 'expense', '#ef4444', 'Zap'),
    (NEW.id, 'Água e Saneamento', 'expense', '#ef4444', 'Droplets'),
    (NEW.id, 'Funcionários', 'expense', '#ef4444', 'Users'),
    (NEW.id, 'Limpeza e Higiene', 'expense', '#ef4444', 'Trash2'),
    (NEW.id, 'Manutenção', 'expense', '#ef4444', 'Wrench'),
    (NEW.id, 'Fornecedores', 'expense', '#ef4444', 'ShoppingCart'),
    (NEW.id, 'Impostos e Taxas', 'expense', '#ef4444', 'DollarSign'),
    (NEW.id, 'Seguros', 'expense', '#ef4444', 'Shield'),
    (NEW.id, 'Combustível', 'expense', '#ef4444', 'Fuel'),
    (NEW.id, 'Telefone e Internet', 'expense', '#ef4444', 'Wifi'),
    (NEW.id, 'Outros', 'expense', '#ef4444', 'MoreHorizontal')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- CREATE TRIGGER ON NEW USER SIGNUP
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

-- ============================================
-- POPULATE CATEGORIES FOR EXISTING USERS (RUN ONCE)
-- ============================================
-- Uncomment and run this ONCE to populate categories for users that already exist
/*
DO $$
DECLARE
  user_record auth.users;
BEGIN
  FOR user_record IN SELECT * FROM auth.users LOOP
    INSERT INTO categories (user_id, name, type, color, icon)
    VALUES 
      (user_record.id, 'Serviços de Velório', 'revenue', '#10b981', 'Briefcase'),
      (user_record.id, 'Caixão', 'revenue', '#10b981', 'Box'),
      (user_record.id, 'Flores', 'revenue', '#10b981', 'Flower2'),
      (user_record.id, 'Urna', 'revenue', '#10b981', 'Package'),
      (user_record.id, 'Velas', 'revenue', '#10b981', 'Flame'),
      (user_record.id, 'Transporte', 'revenue', '#10b981', 'Truck'),
      (user_record.id, 'Documentação', 'revenue', '#10b981', 'FileText'),
      (user_record.id, 'Outros Serviços', 'revenue', '#10b981', 'MoreHorizontal'),
      (user_record.id, 'Aluguel', 'expense', '#ef4444', 'Home'),
      (user_record.id, 'Energia Elétrica', 'expense', '#ef4444', 'Zap'),
      (user_record.id, 'Água e Saneamento', 'expense', '#ef4444', 'Droplets'),
      (user_record.id, 'Funcionários', 'expense', '#ef4444', 'Users'),
      (user_record.id, 'Limpeza e Higiene', 'expense', '#ef4444', 'Trash2'),
      (user_record.id, 'Manutenção', 'expense', '#ef4444', 'Wrench'),
      (user_record.id, 'Fornecedores', 'expense', '#ef4444', 'ShoppingCart'),
      (user_record.id, 'Impostos e Taxas', 'expense', '#ef4444', 'DollarSign'),
      (user_record.id, 'Seguros', 'expense', '#ef4444', 'Shield'),
      (user_record.id, 'Combustível', 'expense', '#ef4444', 'Fuel'),
      (user_record.id, 'Telefone e Internet', 'expense', '#ef4444', 'Wifi'),
      (user_record.id, 'Outros', 'expense', '#ef4444', 'MoreHorizontal')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
*/
