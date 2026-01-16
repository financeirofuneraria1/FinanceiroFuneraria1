import React, { createContext, useState, useEffect, useContext, ReactNode, createElement } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Company {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  user_id?: string;
  created_at?: string;
}

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (c: Company | null) => void;
  loading: boolean;
  error: string | null;
  createCompany: (data: Omit<Company, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCompanies();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem('selectedCompanyId', selectedCompany.id);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      setCompanies(data || []);

      const savedCompanyId = localStorage.getItem('selectedCompanyId');
      const companyToSelect = savedCompanyId
        ? data?.find((c) => c.id === savedCompanyId)
        : data && data.length > 0
        ? data[0]
        : null;

      // Sempre atualizar se houver empresa para selecionar
      if (companyToSelect) {
        setSelectedCompany(companyToSelect);
      } else if (!selectedCompany && data && data.length > 0) {
        // Fallback: selecionar primeira se nenhuma estiver selecionada
        setSelectedCompany(data[0]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar empresas';
      setError(message);
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (data: Omit<Company, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const { data: newCompany, error: err } = await supabase
        .from('companies')
        .insert([
          {
            name: data.name,
            cnpj: data.cnpj,
            phone: data.phone,
            email: data.email,
            address: data.address,
            city: data.city,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (err) throw err;

      setCompanies((prev) => [newCompany, ...prev]);

      // Atualiza selectedCompany apenas se for diferente
      if (!selectedCompany || selectedCompany.id !== newCompany.id) {
        setSelectedCompany(newCompany);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar empresa';
      setError(message);
      throw err;
    }
  };

  const refreshCompanies = async () => {
    await fetchCompanies();
  };

  const value: CompanyContextType = {
    companies,
    selectedCompany,
    setSelectedCompany,
    loading,
    error,
    createCompany,
    refreshCompanies,
  };

  return createElement(
    CompanyContext.Provider,
    { value },
    children
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany deve ser usado dentro de CompanyProvider');
  }
  return context;
}
