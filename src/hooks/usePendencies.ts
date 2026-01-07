import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

export interface PendencyStats {
  total: number;
  overdue: number;
  revenuePending: number;
  expensePending: number;
  totalRevenue: number;
  totalExpense: number;
}

export function usePendencies(companyId?: string) {
  const [stats, setStats] = useState<PendencyStats>({
    total: 0,
    overdue: 0,
    revenuePending: 0,
    expensePending: 0,
    totalRevenue: 0,
    totalExpense: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      // Fetch revenues
      const { data: revenues } = await supabase
        .from('revenues')
        .select('amount, date, status')
        .eq('company_id', companyId)
        .eq('status', 'pendente');

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, date, status')
        .eq('company_id', companyId)
        .eq('status', 'pendente');

      let overdue = 0;
      let totalRevenue = 0;
      let totalExpense = 0;

      if (revenues) {
        revenues.forEach(r => {
          totalRevenue += Number(r.amount);
          const daysOverdue = differenceInDays(new Date(), new Date(r.date));
          if (daysOverdue > 0) overdue++;
        });
      }

      if (expenses) {
        expenses.forEach(e => {
          totalExpense += Number(e.amount);
          const daysOverdue = differenceInDays(new Date(), new Date(e.date));
          if (daysOverdue > 0) overdue++;
        });
      }

      setStats({
        total: (revenues?.length || 0) + (expenses?.length || 0),
        overdue,
        revenuePending: revenues?.length || 0,
        expensePending: expenses?.length || 0,
        totalRevenue,
        totalExpense,
      });
    } catch (error) {
      console.error('Error fetching pendencies stats:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
