import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useAutoSaldoAnterior = () => {
  const generateSaldoAnterior = async (companyId: string, startMonth: string) => {
    /**
     * Gera "Saldo anterior" automaticamente para meses subsequentes
     * @param companyId - ID da empresa
     * @param startMonth - Mês inicial no formato 'yyyy-MM' (ex: '2025-11')
     */

    try {
      const [year, month] = startMonth.split('-').map(Number);
      let currentDate = new Date(year, month - 1, 1); // Primeiro dia do mês inicial

      // Gerar para os próximos 12 meses
      for (let i = 0; i < 12; i++) {
        const monthStart = startOfMonth(currentDate).toISOString().split('T')[0];
        const monthEnd = endOfMonth(currentDate).toISOString().split('T')[0];
        const currentMonthStart = format(currentDate, 'yyyy-MM-01');

        // Buscar receitas do mês (EXCLUINDO "Saldo anterior")
        const revenuesResult = await supabase
          .from('revenues')
          .select('amount')
          .eq('company_id', companyId)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .not('description', 'ilike', '%saldo anterior%');

        // Buscar despesas do mês
        const expensesResult = await supabase
          .from('expenses')
          .select('amount')
          .eq('company_id', companyId)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // Calcular saldo (receitas normais - despesas)
        const totalRevenues = revenuesResult.data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const saldo = totalRevenues - totalExpenses;

        // Verificar se já existe "Saldo anterior" no mês atual (dia 1)
        const { data: existingSaldo } = await supabase
          .from('revenues')
          .select('id')
          .eq('company_id', companyId)
          .eq('date', currentMonthStart)
          .ilike('description', '%saldo anterior%')
          .limit(1);

        // Se não existir e saldo for diferente de zero, criar
        if ((!existingSaldo || existingSaldo.length === 0) && saldo !== 0) {
          await supabase.from('revenues').insert({
            company_id: companyId,
            description: `Saldo anterior conta`,
            amount: saldo,
            date: currentMonthStart,
            status: 'recebido',
          });

          console.log(
            `✓ Saldo anterior de R$ ${saldo.toFixed(2)} criado para ${format(new Date(currentMonthStart), 'MMMM yyyy', {
              locale: ptBR,
            })}`
          );
        }

        // Avançar para o próximo mês
        currentDate = addMonths(currentDate, 1);
      }

      return { success: true, message: 'Saldos anteriores gerados com sucesso!' };
    } catch (error) {
      console.error('Erro ao gerar saldos anteriores:', error);
      return { success: false, message: 'Erro ao gerar saldos anteriores' };
    }
  };

  return { generateSaldoAnterior };
};
