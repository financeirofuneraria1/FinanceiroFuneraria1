import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'revenue' | 'expense';
}

interface MonthlyData {
  month: string;
  revenues: number;
  expenses: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [totalRevenues, setTotalRevenues] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString().split('T')[0];
    const monthEnd = endOfMonth(now).toISOString().split('T')[0];

    try {
      // Fetch current month revenues
      const { data: revenues } = await supabase
        .from('revenues')
        .select('amount')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      const revenueTotal = revenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      setTotalRevenues(revenueTotal);

      // Fetch current month expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      const expenseTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      setTotalExpenses(expenseTotal);

      // Fetch recent transactions (last 5 of each type)
      const { data: recentRevenues } = await supabase
        .from('revenues')
        .select('id, description, amount, date')
        .order('date', { ascending: false })
        .limit(5);

      const { data: recentExpenses } = await supabase
        .from('expenses')
        .select('id, description, amount, date')
        .order('date', { ascending: false })
        .limit(5);

      const combined: Transaction[] = [
        ...(recentRevenues?.map(r => ({ ...r, amount: Number(r.amount), type: 'revenue' as const })) || []),
        ...(recentExpenses?.map(e => ({ ...e, amount: Number(e.amount), type: 'expense' as const })) || []),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
      
      setRecentTransactions(combined);

      // Fetch last 6 months data for chart
      const monthlyDataArray: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = startOfMonth(date).toISOString().split('T')[0];
        const end = endOfMonth(date).toISOString().split('T')[0];

        const { data: monthRevs } = await supabase
          .from('revenues')
          .select('amount')
          .gte('date', start)
          .lte('date', end);

        const { data: monthExps } = await supabase
          .from('expenses')
          .select('amount')
          .gte('date', start)
          .lte('date', end);

        monthlyDataArray.push({
          month: format(date, 'MMM', { locale: ptBR }),
          revenues: monthRevs?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
          expenses: monthExps?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
        });
      }
      setMonthlyData(monthlyDataArray);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const balance = totalRevenues - totalExpenses;
  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-muted rounded-lg" />
          <div className="h-80 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground capitalize">{currentMonth}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas do Mês
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenues)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas do Mês
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${balance >= 0 ? 'border-l-success' : 'border-l-destructive'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo do Mês
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

      {/* Charts and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value)]}
                  />
                  <Bar dataKey="revenues" fill="hsl(var(--chart-1))" name="Receitas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              {recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                recentTransactions.map((transaction) => (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${transaction.type === 'revenue' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                        {transaction.type === 'revenue' ? (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground truncate max-w-[150px]">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${transaction.type === 'revenue' ? 'text-success' : 'text-destructive'}`}>
                      {transaction.type === 'revenue' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
