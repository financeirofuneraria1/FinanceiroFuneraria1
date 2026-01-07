-- ============================================
-- SEED DEFAULT CATEGORIES
-- ============================================
-- Este script popula categorias padrão para TODOS os usuários
-- Você pode rodar isso após criar suas contas

-- Nota: Você precisa substituir 'seu_user_id_aqui' pelo ID real do seu usuário
-- Para pegar seu user_id, execute: SELECT id, email FROM auth.users;

-- Exemplo: Se seu user_id é '123e4567-e89b-12d3-a456-426614174000'
-- Substitua em todos os places abaixo

-- ============================================
-- RECEITAS (REVENUE)
-- ============================================
INSERT INTO categories (user_id, name, type, color, icon) 
VALUES 
  ('seu_user_id_aqui', 'Serviços de Velório', 'revenue', '#10b981', 'Briefcase'),
  ('seu_user_id_aqui', 'Caixão', 'revenue', '#10b981', 'Box'),
  ('seu_user_id_aqui', 'Flores', 'revenue', '#10b981', 'Flower2'),
  ('seu_user_id_aqui', 'Urna', 'revenue', '#10b981', 'Package'),
  ('seu_user_id_aqui', 'Velas', 'revenue', '#10b981', 'Flame'),
  ('seu_user_id_aqui', 'Transporte', 'revenue', '#10b981', 'Truck'),
  ('seu_user_id_aqui', 'Documentação', 'revenue', '#10b981', 'FileText'),
  ('seu_user_id_aqui', 'Outros', 'revenue', '#10b981', 'MoreHorizontal')
ON CONFLICT (user_id, name, type) DO NOTHING;

-- ============================================
-- DESPESAS (EXPENSE)
-- ============================================
INSERT INTO categories (user_id, name, type, color, icon) 
VALUES 
  ('seu_user_id_aqui', 'Aluguel', 'expense', '#ef4444', 'Home'),
  ('seu_user_id_aqui', 'Energia Elétrica', 'expense', '#ef4444', 'Zap'),
  ('seu_user_id_aqui', 'Água e Saneamento', 'expense', '#ef4444', 'Droplets'),
  ('seu_user_id_aqui', 'Funcionários', 'expense', '#ef4444', 'Users'),
  ('seu_user_id_aqui', 'Limpeza e Higiene', 'expense', '#ef4444', 'Trash2'),
  ('seu_user_id_aqui', 'Manutenção', 'expense', '#ef4444', 'Wrench'),
  ('seu_user_id_aqui', 'Fornecedores', 'expense', '#ef4444', 'ShoppingCart'),
  ('seu_user_id_aqui', 'Impostos e Taxas', 'expense', '#ef4444', 'DollarSign'),
  ('seu_user_id_aqui', 'Seguros', 'expense', '#ef4444', 'Shield'),
  ('seu_user_id_aqui', 'Combustível', 'expense', '#ef4444', 'Fuel'),
  ('seu_user_id_aqui', 'Telefone e Internet', 'expense', '#ef4444', 'Wifi'),
  ('seu_user_id_aqui', 'Outros', 'expense', '#ef4444', 'MoreHorizontal')
ON CONFLICT (user_id, name, type) DO NOTHING;
