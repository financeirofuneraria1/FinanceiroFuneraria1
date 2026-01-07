import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
}

interface MonthlyComparison {
  month: string;
  revenues: number;
  expenses: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [totalRevenues, setTotalRevenues] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [revenuesByCategory, setRevenuesByCategory] = useState<CategoryData[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryData[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison[]>([]);

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--primary))',
  ];

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, period]);

  const getDateRange = () => {
    const now = new Date();
    if (period === 'month') {
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    } else {
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Fetch revenues with categories
      const { data: revenues } = await supabase
        .from('revenues')
        .select('amount, categories(name)')
        .gte('date', start)
        .lte('date', end);

      // Fetch expenses with categories
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, categories(name)')
        .gte('date', start)
        .lte('date', end);

      // Calculate totals
      const revTotal = revenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const expTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      setTotalRevenues(revTotal);
      setTotalExpenses(expTotal);

      // Group revenues by category
      const revByCat = new Map<string, number>();
      revenues?.forEach((r) => {
        const catName = r.categories?.name || 'Sem categoria';
        revByCat.set(catName, (revByCat.get(catName) || 0) + Number(r.amount));
      });
      setRevenuesByCategory(
        Array.from(revByCat.entries()).map(([name, value]) => ({ name, value }))
      );

      // Group expenses by category
      const expByCat = new Map<string, number>();
      expenses?.forEach((e) => {
        const catName = e.categories?.name || 'Sem categoria';
        expByCat.set(catName, (expByCat.get(catName) || 0) + Number(e.amount));
      });
      setExpensesByCategory(
        Array.from(expByCat.entries()).map(([name, value]) => ({ name, value }))
      );

      // Fetch monthly comparison (last 6 months)
      const monthlyData: MonthlyComparison[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = format(startOfMonth(date), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(date), 'yyyy-MM-dd');

        const { data: monthRevs } = await supabase
          .from('revenues')
          .select('amount')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        const { data: monthExps } = await supabase
          .from('expenses')
          .select('amount')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        monthlyData.push({
          month: format(date, 'MMM', { locale: ptBR }),
          revenues: monthRevs?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
          expenses: monthExps?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
        });
      }
      setMonthlyComparison(monthlyData);
    } catch (error) {
      console.error('Error fetching report data:', error);
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
  const periodLabel = period === 'month' ? format(new Date(), 'MMMM yyyy', { locale: ptBR }) : format(new Date(), 'yyyy');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground capitalize">{periodLabel}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <Card className="border-l-4 border-l-success">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Receitas
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
                  Total de Despesas
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
                  Resultado
                </CardTitle>
                <Wallet className={`h-5 w-5 ${balance >= 0 ? 'text-success' : 'text-destructive'}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenues by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Receitas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenuesByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma receita no período
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenuesByCategory}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {revenuesByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa no período
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {expensesByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Comparativo Mensal (Últimos 6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'revenues' ? 'Receitas' : 'Despesas',
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend formatter={(value) => (value === 'revenues' ? 'Receitas' : 'Despesas')} />
                    <Bar dataKey="revenues" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
