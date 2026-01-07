import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, ArrowLeftRight, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DailyData {
  date: string;
  revenues: number;
  expenses: number;
  balance: number;
}

export default function CashFlow() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [totalRevenues, setTotalRevenues] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  useEffect(() => {
    if (user) {
      fetchCashFlowData();
    }
  }, [user, selectedMonth]);

  const fetchCashFlowData = async () => {
    setLoading(true);
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    const start = format(startDate, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');

    try {
      const { data: revenues } = await supabase
        .from('revenues')
        .select('amount, date')
        .gte('date', start)
        .lte('date', end);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, date')
        .gte('date', start)
        .lte('date', end);

      // Calculate totals
      const revTotal = revenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const expTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      setTotalRevenues(revTotal);
      setTotalExpenses(expTotal);

      // Group by day
      const dailyMap = new Map<string, { revenues: number; expenses: number }>();
      
      // Initialize all days of the month
      const daysInMonth = endDate.getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = format(new Date(year, month - 1, day), 'dd/MM');
        dailyMap.set(dayStr, { revenues: 0, expenses: 0 });
      }

      revenues?.forEach((r) => {
        const dayStr = format(new Date(r.date), 'dd/MM');
        const current = dailyMap.get(dayStr) || { revenues: 0, expenses: 0 };
        current.revenues += Number(r.amount);
        dailyMap.set(dayStr, current);
      });

      expenses?.forEach((e) => {
        const dayStr = format(new Date(e.date), 'dd/MM');
        const current = dailyMap.get(dayStr) || { revenues: 0, expenses: 0 };
        current.expenses += Number(e.amount);
        dailyMap.set(dayStr, current);
      });

      // Convert to array with running balance
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const balance = totalRevenues - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Acompanhe suas entradas e saídas</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="capitalize">{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
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

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Diária</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'revenues' ? 'Receitas' : name === 'expenses' ? 'Despesas' : 'Saldo',
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'revenues' ? 'Receitas' : value === 'expenses' ? 'Despesas' : 'Saldo Acumulado'
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenues"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
