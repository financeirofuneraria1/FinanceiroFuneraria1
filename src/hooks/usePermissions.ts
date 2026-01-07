import { useAuth } from './useAuth';

export function usePermissions() {
  const { user, isAdmin } = useAuth();

  return {
    canView: true, // Todos podem visualizar
    canEdit: isAdmin, // Apenas admins podem editar
    canDelete: isAdmin, // Apenas admins podem deletar
    isAdmin,
    userId: user?.id || null,
  };
}
