import { useState, useEffect, memo, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ArrowLeftRight, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DailyData {
  date: string;
  revenues: number;
  expenses: number;
  balance: number;
}

const StatsCards = memo(({ totalRevenues, totalExpenses, balance, formatCurrency }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
    <Card className="border-l-4 border-l-success">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Total de Entradas
        </CardTitle>
        <TrendingUp className="h-5 w-5 text-success" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenues)}</p>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-destructive">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Total de Saídas
        </CardTitle>
        <TrendingDown className="h-5 w-5 text-destructive" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
      </CardContent>
    </Card>

    <Card className={`border-l-4 ${balance >= 0 ? 'border-l-success' : 'border-l-destructive'}`}> 
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Saldo do Período
        </CardTitle>
        <ArrowLeftRight className={`h-5 w-5 ${balance >= 0 ? 'text-success' : 'text-destructive'}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}> 
          {formatCurrency(balance)}
        </p>
      </CardContent>
    </Card>
  </div>
));
StatsCards.displayName = 'StatsCards';

export default memo(function CashFlow() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [basis, setBasis] = useState<'cash' | 'accrual'>('cash');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [totalRevenues, setTotalRevenues] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  const monthOptions = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
      };
    }),
    []
  );

  useEffect(() => {
    if (user && selectedCompany) {
      fetchCashFlowData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedCompany, selectedMonth, basis]);

  const fetchCashFlowData = async () => {
    if (!selectedCompany) return;

    setLoading(true);

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const start = format(startDate, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');

    try {
      // Construir consultas e, se o regime for 'cash', filtrar por status realizado
      let revenueQuery = supabase
        .from('revenues')
        .select('amount, date')
        .eq('company_id', selectedCompany.id)
        .gte('date', start)
        .lte('date', end);

      let expenseQuery = supabase
        .from('expenses')
        .select('amount, date')
        .eq('company_id', selectedCompany.id)
        .gte('date', start)
        .lte('date', end);

      if (basis === 'cash') {
        revenueQuery = (revenueQuery as any).eq('status', 'recebido');
        expenseQuery = (expenseQuery as any).eq('status', 'pago');
      }

      const [revenuesResult, expensesResult] = await Promise.all([revenueQuery, expenseQuery]);

      const revenues = (revenuesResult as any).data || [];
      const expenses = (expensesResult as any).data || [];

      const revTotal = revenues.reduce((sum: number, r: any) => sum + Number(r.amount), 0) || 0;
      const expTotal = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0;
      setTotalRevenues(revTotal);
      setTotalExpenses(expTotal);

      const dailyMap = new Map<string, { revenues: number; expenses: number }>();
      
      const daysInMonth = endDate.getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = format(new Date(year, month - 1, day), 'dd/MM');
        dailyMap.set(dayStr, { revenues: 0, expenses: 0 });
      }

      revenues.forEach((r: any) => {
        const dayStr = format(new Date(r.date), 'dd/MM');
        const current = dailyMap.get(dayStr) || { revenues: 0, expenses: 0 };
        current.revenues += Number(r.amount);
        dailyMap.set(dayStr, current);
      });

      expenses.forEach((e: any) => {
        const dayStr = format(new Date(e.date), 'dd/MM');
        const current = dailyMap.get(dayStr) || { revenues: 0, expenses: 0 };
        current.expenses += Number(e.amount);
        dailyMap.set(dayStr, current);
      });

      let runningBalance = 0;
      const dailyArray: DailyData[] = [];
      
      dailyMap.forEach((value, date) => {
        runningBalance += value.revenues - value.expenses;
        dailyArray.push({
          date,
          revenues: value.revenues,
          expenses: value.expenses,
          balance: runningBalance,
        });
      });

      setDailyData(dailyArray);
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = useMemo(() => (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }, []);

  const balance = totalRevenues - totalExpenses;

  if (!selectedCompany) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma empresa selecionada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Fluxo de Caixa</h1>
            <p className="text-muted-foreground">{selectedCompany.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Regime</span>
              <Select value={basis} onValueChange={(v) => setBasis(v as 'cash' | 'accrual')}> 
                <SelectTrigger className="w-40">
                  <SelectValue>{basis === 'cash' ? 'Caixa' : 'Competência'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Caixa</SelectItem>
                  <SelectItem value="accrual">Competência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth(format(subMonths(parseISO(selectedMonth + '-01'), 1), 'yyyy-MM'))}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth(format(addMonths(parseISO(selectedMonth + '-01'), 1), 'yyyy-MM'))}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <StatsCards
        totalRevenues={totalRevenues}
        totalExpenses={totalExpenses}
        balance={balance}
        formatCurrency={formatCurrency}
      />

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Fluxo Diário</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <div className="w-full h-72 md:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={dailyData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tick={{ fontSize: 10 }}
                    width={40}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenues" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="balance" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});