import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useAutoSaldoAnterior = () => {
  const generateSaldoAnterior = async (companyId: string, startMonth: string, userId?: string) => {
    /**
     * Gera "Saldo anterior" automaticamente começando no mês selecionado
     * Se você seleciona Novembro, ele:
     * 1. Calcula saldo de NOVEMBRO e cria em 1º de DEZEMBRO
     * 2. Calcula saldo de DEZEMBRO e cria em 1º de JANEIRO
     * 3. E assim por diante...
     * @param companyId - ID da empresa
     * @param startMonth - Mês selecionado no formato 'yyyy-MM' (ex: '2025-11')
     * @param userId - ID do usuário (opcional, obtém do context se não fornecido)
     */

    try {
      const [year, month] = startMonth.split('-').map(Number);
      
      // Começar no mês selecionado
      let processingMonth = new Date(year, month - 1, 1); // Mês selecionado
      let creationMonth = new Date(year, month, 1); // Próximo mês

      console.log(`🔄 Iniciando geração de saldos anteriores a partir de ${format(processingMonth, 'MMMM yyyy', { locale: ptBR })}`);

      // Gerar para os próximos 12 meses
      for (let i = 0; i < 12; i++) {
        const monthStart = startOfMonth(processingMonth).toISOString().split('T')[0];
        const monthEnd = endOfMonth(processingMonth).toISOString().split('T')[0];
        const creationDate = format(creationMonth, 'yyyy-MM-01');

        console.log(`\n📅 Mês de processamento: ${format(processingMonth, 'MMMM yyyy', { locale: ptBR })}`);
        console.log(`   Data de criação do saldo anterior: ${format(creationMonth, 'MMMM yyyy', { locale: ptBR })}`);

        // Buscar TODAS as receitas do mês de processamento
        const { data: allRevenues, error: revenuesError } = await supabase
          .from('revenues')
          .select('amount, description')
          .eq('company_id', companyId)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        if (revenuesError) console.error(`❌ Erro ao buscar receitas: ${revenuesError.message}`);

        // Buscar despesas do mês de processamento
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('company_id', companyId)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        if (expensesError) console.error(`❌ Erro ao buscar despesas: ${expensesError.message}`);

        // Filtrar receitas EXCLUINDO "Saldo anterior" (em JavaScript)
        const normalRevenues = (allRevenues || []).filter(
          r => !r.description.toLowerCase().includes('saldo anterior')
        );

        // Calcular saldo (receitas normais - despesas)
        const totalRevenues = normalRevenues.reduce((sum, r) => sum + Number(r.amount), 0);
        const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
        const saldo = totalRevenues - totalExpenses;

        console.log(`   Receitas: R$ ${totalRevenues.toFixed(2)}, Despesas: R$ ${totalExpenses.toFixed(2)}, Saldo: R$ ${saldo.toFixed(2)}`);

        // Verificar se já existe "Saldo anterior" no dia de criação
        const { data: existingSaldo } = await supabase
          .from('revenues')
          .select('id')
          .eq('company_id', companyId)
          .eq('date', creationDate);

        const hasSaldoAnterior = existingSaldo && existingSaldo.length > 0;

        // Se saldo for diferente de zero, criar
        if (saldo !== 0) {
          if (hasSaldoAnterior) {
            console.log(`   ⏭️  Saldo anterior já existe em ${format(creationMonth, 'MMMM yyyy', { locale: ptBR })}`);
          } else {
            const { error: insertError } = await supabase.from('revenues').insert({
              company_id: companyId,
              user_id: userId,
              description: `Saldo anterior conta`,
              amount: saldo,
              date: creationDate,
              status: 'recebido',
            });

            if (insertError) {
              console.error(`   ❌ Erro ao criar saldo anterior: ${insertError.message}`);
            } else {
              console.log(`   ✅ Saldo anterior de R$ ${saldo.toFixed(2)} criado para ${format(creationMonth, 'MMMM yyyy', { locale: ptBR })}`);
            }
          }
        } else {
          console.log(`   ⏭️  Saldo é zero, não criando lançamento`);
        }

        // Avançar para o próximo mês
        processingMonth = addMonths(processingMonth, 1);
        creationMonth = addMonths(creationMonth, 1);
      }

      console.log(`\n✅ Saldos anteriores gerados com sucesso!`);
      return { success: true, message: 'Saldos anteriores gerados com sucesso!' };
    } catch (error) {
      console.error('❌ Erro ao gerar saldos anteriores:', error);
      return { success: false, message: 'Erro ao gerar saldos anteriores' };
    }
  };

  return { generateSaldoAnterior };
};
