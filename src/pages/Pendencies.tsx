import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Check, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { differenceInDays } from 'date-fns';

interface PendingItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'revenue' | 'expense';
  status: 'pendente' | 'pago' | 'recebido' | 'cancelado';
  daysOverdue: number;
}

export default function Pendencies() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { canEdit } = usePermissions();
  const { toast } = useToast();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');

  useEffect(() => {
    if (user && selectedCompany) {
      fetchPendingItems();
    }
  }, [user, selectedCompany, filterType]);

  const fetchPendingItems = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      // Fetch pendentes receitas
      const { data: revenues } = await supabase
        .from('revenues')
        .select('id, description, amount, date, status')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'pendente')
        .order('date', { ascending: true });

      // Fetch pendentes despesas
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, description, amount, date, status')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'pendente')
        .order('date', { ascending: true });

      const items: PendingItem[] = [];

      // Processar receitas
      if (revenues && filterType !== 'expense') {
        revenues.forEach(r => {
          const daysOverdue = differenceInDays(new Date(), new Date(r.date));
          items.push({
            id: r.id,
            description: r.description,
            amount: Number(r.amount),
            date: r.date,
            type: 'revenue',
            status: 'pendente',
            daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          });
        });
      }

      // Processar despesas
      if (expenses && filterType !== 'revenue') {
        expenses.forEach(e => {
          const daysOverdue = differenceInDays(new Date(), new Date(e.date));
          items.push({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            date: e.date,
            type: 'expense',
            status: 'pendente',
            daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          });
        });
      }

      setPendingItems(items.sort((a, b) => b.daysOverdue - a.daysOverdue));
    } catch (error) {
      console.error('Error fetching pending items:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as pendências',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: string, type: 'revenue' | 'expense') => {
    const status = type === 'revenue' ? 'recebido' : 'pago';
    const table = type === 'revenue' ? 'revenues' : 'expenses';

    try {
      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `${type === 'revenue' ? 'Receita' : 'Despesa'} marcada como ${status}`,
      });

      fetchPendingItems();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, type: 'revenue' | 'expense') => {
    if (!window.confirm('Tem certeza que deseja deletar?')) return;

    const table = type === 'revenue' ? 'revenues' : 'expenses';

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deletado!',
        description: `${type === 'revenue' ? 'Receita' : 'Despesa'} removida`,
      });

      fetchPendingItems();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalRevenuePending = pendingItems
    .filter(item => item.type === 'revenue')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpensePending = pendingItems
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const overdueDays = pendingItems.filter(item => item.daysOverdue > 0).length;

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
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Pendências</h1>
        <p className="text-muted-foreground">{selectedCompany.name}</p>
      </div>

      {/* Resumo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingItems.length}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{overdueDays}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-success">{formatCurrency(totalRevenuePending)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totalExpensePending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterType('all')}
        >
          Todas
        </Button>
        <Button
          variant={filterType === 'revenue' ? 'default' : 'outline'}
          onClick={() => setFilterType('revenue')}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Receitas
        </Button>
        <Button
          variant={filterType === 'expense' ? 'default' : 'outline'}
          onClick={() => setFilterType('expense')}
          className="gap-2"
        >
          <TrendingDown className="h-4 w-4" />
          Despesas
        </Button>
      </div>

      {/* Lista de Pendências */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : pendingItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma pendência! 🎉</p>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    item.daysOverdue > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium">{item.description}</p>
                      {item.daysOverdue > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {item.daysOverdue} dias
                        </Badge>
                      )}
                      <Badge variant={item.type === 'revenue' ? 'default' : 'secondary'}>
                        {item.type === 'revenue' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.date), 'dd/MM/yyyy')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <p
                      className={`font-bold text-lg ${
                        item.type === 'revenue' ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(item.amount)}
                    </p>

                    {canEdit && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsPaid(item.id, item.type)}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          {item.type === 'revenue' ? 'Recebido' : 'Pago'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id, item.type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
