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
        const nextMonthStart = format(addMonths(currentDate, 1), 'yyyy-MM-01');

        console.log(`Processando mês: ${format(currentDate, 'MMMM yyyy', { locale: ptBR })}`);

        // Buscar TODAS as receitas do mês
        const { data: allRevenues } = await supabase
          .from('revenues')
          .select('amount, description')
          .eq('company_id', companyId)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // Buscar despesas do mês
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('company_id', companyId)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // Filtrar receitas EXCLUINDO "Saldo anterior" (em JavaScript)
        const normalRevenues = (allRevenues || []).filter(
          r => !r.description.toLowerCase().includes('saldo anterior')
        );

        // Calcular saldo (receitas normais - despesas)
        const totalRevenues = normalRevenues.reduce((sum, r) => sum + Number(r.amount), 0);
        const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
        const saldo = totalRevenues - totalExpenses;

        console.log(`  Receitas: R$ ${totalRevenues.toFixed(2)}, Despesas: R$ ${totalExpenses.toFixed(2)}, Saldo: R$ ${saldo.toFixed(2)}`);

        // Verificar se já existe "Saldo anterior" no próximo mês (dia 1)
        const { data: existingSaldo } = await supabase
          .from('revenues')
          .select('id')
          .eq('company_id', companyId)
          .eq('date', nextMonthStart)
          .order('description')
          .limit(1);

        const hasSaldoAnterior = existingSaldo?.some(r => {
          return r.id; // Apenas verificar se existe algo no dia 1
        });

        // Se saldo for diferente de zero, criar ou atualizar
        if (saldo !== 0) {
          if (hasSaldoAnterior && existingSaldo && existingSaldo.length > 0) {
            console.log(`  ⏭️ Saldo anterior já existe em ${format(new Date(nextMonthStart), 'MMMM yyyy', { locale: ptBR })}`);
          } else {
            const { error } = await supabase.from('revenues').insert({
              company_id: companyId,
              description: `Saldo anterior conta`,
              amount: saldo,
              date: nextMonthStart,
              status: 'recebido',
            });

            if (error) {
              console.error(`✗ Erro ao criar saldo anterior: ${error.message}`);
            } else {
              console.log(
                `✓ Saldo anterior de R$ ${saldo.toFixed(2)} criado para ${format(new Date(nextMonthStart), 'MMMM yyyy', {
                  locale: ptBR,
                })}`
              );
            }
          }
        } else {
          console.log(`  ⏭️ Saldo é zero, não criando lançamento`);
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
