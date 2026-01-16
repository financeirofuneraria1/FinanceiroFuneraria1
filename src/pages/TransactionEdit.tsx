import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useAutoSaldoAnterior } from '@/hooks/useAutoSaldoAnterior';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit2, Plus, Loader2, Zap } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'revenue' | 'expense';
  status: string;
}

export default function TransactionEdit() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { generateSaldoAnterior } = useAutoSaldoAnterior();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [revenues, setRevenues] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAutoSaldo, setGeneratingAutoSaldo] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'revenue' as const,
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  useEffect(() => {
    if (user && selectedCompany) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedCompany, selectedMonth]);

  const fetchTransactions = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1)).toISOString().split('T')[0];
    const endDate = endOfMonth(new Date(year, month - 1)).toISOString().split('T')[0];

    try {
      const [revenuesResult, expensesResult] = await Promise.all([
        supabase
          .from('revenues')
          .select('id, description, amount, date, status')
          .eq('company_id', selectedCompany.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        supabase
          .from('expenses')
          .select('id, description, amount, date, status')
          .eq('company_id', selectedCompany.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
      ]);

      setRevenues(
        revenuesResult.data?.map(r => ({
          ...r,
          amount: Number(r.amount),
          type: 'revenue' as const,
        })) || []
      );
      setExpenses(
        expensesResult.data?.map(e => ({
          ...e,
          amount: Number(e.amount),
          type: 'expense' as const,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingId || !editData.amount) return;

    const table = editData.type === 'revenue' ? 'revenues' : 'expenses';
    
    try {
      await supabase
        .from(table)
        .update({
          description: editData.description,
          amount: editData.amount,
          date: editData.date,
        })
        .eq('id', editingId);

      setEditingId(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleDelete = async (id: string, type: 'revenue' | 'expense') => {
    if (!confirm('Tem certeza que deseja deletar este lançamento?')) return;

    const table = type === 'revenue' ? 'revenues' : 'expenses';
    
    try {
      await supabase.from(table).delete().eq('id', id);
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedCompany || !newTransaction.description || !newTransaction.amount) return;

    const amount = parseFloat(newTransaction.amount);
    if (amount <= 0) {
      console.error('Amount must be greater than 0');
      return;
    }

    const table = newTransaction.type === 'revenue' ? 'revenues' : 'expenses';
    
    try {
      await supabase.from(table).insert({
        company_id: selectedCompany.id,
        user_id: user?.id,
        description: newTransaction.description,
        amount: amount,
        date: newTransaction.date,
        status: 'pendente',
      });

      setNewTransaction({
        type: 'revenue',
        description: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setShowAddDialog(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleGenerateAutoSaldo = async () => {
    if (!selectedCompany || !confirm('Deseja gerar saldos anteriores automaticamente para os próximos meses?')) return;

    setGeneratingAutoSaldo(true);
    const result = await generateSaldoAnterior(selectedCompany.id, selectedMonth, user?.id);
    
    if (result.success) {
      alert('✓ Saldos anteriores gerados com sucesso!');
      fetchTransactions();
    } else {
      alert('✗ Erro ao gerar saldos anteriores');
    }
    
    setGeneratingAutoSaldo(false);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Editar Lançamentos</h1>
          <p className="text-muted-foreground">{selectedCompany.name}</p>
        </div>
        <div className="flex gap-4 flex-wrap">
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
          <Button
            onClick={handleGenerateAutoSaldo}
            disabled={generatingAutoSaldo}
            variant="outline"
            className="gap-2"
            title="Gera automaticamente 'Saldo anterior' para os próximos meses"
          >
            {generatingAutoSaldo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Auto Saldo
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Lançamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <Select
                    value={newTransaction.type}
                    onValueChange={(value: any) =>
                      setNewTransaction({ ...newTransaction, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Data</label>
                  <Input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    value={newTransaction.description}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descrição do lançamento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Valor</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newTransaction.amount}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, amount: e.target.value })
                    }
                    placeholder="0,00"
                  />
                </div>
                <Button onClick={handleAddTransaction} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Receitas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-success">
                Receitas ({revenues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {revenues.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma receita neste período.</p>
                ) : (
                  revenues.map((rev) => (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition"
                    >
                      <div className="flex-1">
                        {editingId === rev.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editData.description || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, description: e.target.value })
                              }
                              placeholder="Descrição"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={editData.date || ''}
                                onChange={(e) =>
                                  setEditData({ ...editData, date: e.target.value })
                                }
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={editData.amount || ''}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    amount: parseFloat(e.target.value),
                                  })
                                }
                                placeholder="Valor"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm">{rev.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(rev.date), 'dd/MM/yyyy')}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="font-semibold text-success min-w-[100px] text-right">
                          {formatCurrency(rev.amount)}
                        </span>
                        {editingId === rev.id ? (
                          <Button
                            size="sm"
                            onClick={handleEdit}
                            className="gap-1"
                          >
                            Salvar
                          </Button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(rev.id);
                                setEditData(rev);
                              }}
                              className="p-2 hover:bg-background rounded transition"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rev.id, 'revenue')}
                              className="p-2 hover:bg-destructive/10 rounded transition"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">
                Despesas ({expenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expenses.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma despesa neste período.</p>
                ) : (
                  expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition"
                    >
                      <div className="flex-1">
                        {editingId === exp.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editData.description || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, description: e.target.value })
                              }
                              placeholder="Descrição"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={editData.date || ''}
                                onChange={(e) =>
                                  setEditData({ ...editData, date: e.target.value })
                                }
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={editData.amount || ''}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    amount: parseFloat(e.target.value),
                                  })
                                }
                                placeholder="Valor"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm">{exp.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(exp.date), 'dd/MM/yyyy')}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="font-semibold text-destructive min-w-[100px] text-right">
                          {formatCurrency(exp.amount)}
                        </span>
                        {editingId === exp.id ? (
                          <Button
                            size="sm"
                            onClick={handleEdit}
                            className="gap-1"
                          >
                            Salvar
                          </Button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(exp.id);
                                setEditData(exp);
                              }}
                              className="p-2 hover:bg-background rounded transition"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id, 'expense')}
                              className="p-2 hover:bg-destructive/10 rounded transition"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
