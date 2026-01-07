import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Building2, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Companies() {
  const { companies, selectedCompany, setSelectedCompany, createCompany } = useCompany();
  const { canEdit } = usePermissions();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.cnpj) {
      toast({
        title: 'Erro',
        description: 'Nome e CNPJ são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await createCompany(formData);
      toast({
        title: 'Sucesso!',
        description: 'Empresa cadastrada com sucesso',
      });
      setDialogOpen(false);
      setFormData({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        city: '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao cadastrar empresa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta empresa? Todos os dados financeiros serão perdidos.')) {
      return;
    }

    try {
      // Deletar receitas e despesas associadas
      await supabase.from('revenues').delete().eq('company_id', companyId);
      await supabase.from('expenses').delete().eq('company_id', companyId);
      
      // Deletar empresa
      await supabase.from('companies').delete().eq('id', companyId);

      if (selectedCompany?.id === companyId) {
        const remainingCompanies = companies.filter(c => c.id !== companyId);
        if (remainingCompanies.length > 0) {
          setSelectedCompany(remainingCompanies[0]);
        }
      }

      toast({
        title: 'Empresa deletada',
        description: 'A empresa foi removida do sistema',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao deletar empresa',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground">Gerencie suas empresas</p>
        </div>
        {canEdit ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Funerária Garopaba"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="XX.XXX.XXX/0001-XX"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(48) 9999-9999"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua das Flores, 123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Garopaba"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Cadastrar Empresa
              </Button>
            </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled className="gap-2">
            <Lock className="h-4 w-4" />
            Apenas admins podem criar
          </Button>
        )}
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <Card 
            key={company.id}
            className={`cursor-pointer transition-all ${
              selectedCompany?.id === company.id 
                ? 'border-primary shadow-lg' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedCompany(company)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{company.cnpj}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {company.city && (
                <div>
                  <p className="text-xs text-muted-foreground">Cidade</p>
                  <p className="text-sm font-medium">{company.city}</p>
                </div>
              )}
              {company.email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium break-all">{company.email}</p>
                </div>
              )}
              {company.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">{company.phone}</p>
                </div>
              )}
              <div className="flex gap-2 pt-3">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(company.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Deletar
                  </Button>
                )}
              </div>
              {selectedCompany?.id === company.id && (
                <div className="text-center text-xs font-medium text-primary">
                  ✓ Empresa Selecionada
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma empresa cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira empresa para começar a gerenciar seu financeiro
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Empresa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
