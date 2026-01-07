import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string;
  notes: string | null;
  category_id: string | null;
  categories?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function Revenues() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchRevenues();
      fetchCategories();
    }
  }, [user]);

  const fetchRevenues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('revenues')
      .select('*, categories(name)')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching revenues:', error);
    } else {
      setRevenues(data?.map(r => ({ ...r, amount: Number(r.amount) })) || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', 'revenue')
      .order('name');
    setCategories(data || []);
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      notes: '',
    });
    setEditingRevenue(null);
  };

  const openEditDialog = (revenue: Revenue) => {
    setEditingRevenue(revenue);
    setFormData({
      description: revenue.description,
      amount: revenue.amount.toString(),
      date: revenue.date,
      category_id: revenue.category_id || '',
      notes: revenue.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    const revenueData = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      category_id: formData.category_id || null,
      notes: formData.notes || null,
      user_id: user.id,
    };

    let error;
    if (editingRevenue) {
      const result = await supabase
        .from('revenues')
        .update(revenueData)
        .eq('id', editingRevenue.id);
      error = result.error;
    } else {
      const result = await supabase.from('revenues').insert(revenueData);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a receita.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: editingRevenue ? 'Receita atualizada!' : 'Receita adicionada!',
        description: `${formData.description} - R$ ${formData.amount}`,
      });
      setDialogOpen(false);
      resetForm();
      fetchRevenues();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;

    const { error } = await supabase.from('revenues').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a receita.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Receita excluída!' });
      fetchRevenues();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalRevenues = revenues.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas entradas financeiras</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRevenue ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Serviço de velório"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações adicionais (opcional)"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingRevenue ? 'Atualizar' : 'Adicionar'} Receita
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Card */}
      <Card className="border-l-4 border-l-success">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Receitas
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-success" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenues)}</p>
          <p className="text-xs text-muted-foreground">{revenues.length} registros</p>
        </CardContent>
      </Card>

      {/* Revenues List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : revenues.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma receita registrada. Clique em "Nova Receita" para começar.
            </p>
          ) : (
            <div className="space-y-3">
              {revenues.map((revenue) => (
                <div
                  key={revenue.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{revenue.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(revenue.date), 'dd/MM/yyyy')}</span>
                      {revenue.categories?.name && (
                        <>
                          <span>•</span>
                          <span>{revenue.categories.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-success whitespace-nowrap">
                      {formatCurrency(revenue.amount)}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(revenue)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(revenue.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
