-- Verificar se users da auth existem
SELECT COUNT(*) as user_count FROM auth.users;

-- Se houver erro de RLS em auth.users, você pode executar:
-- Note: auth.users é gerenciado pelo Supabase, não precisa de RLS manual

-- Adicionar função para auto-criar profile quando usuário se registra (OPCIONAL)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Você pode adicionar lógica aqui para criar dados quando novo user se registra
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para novos usuários (OPCIONAL)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
