# Mapeamento do Sistema de Pendências

## 📋 Resumo Executivo

O sistema lança pendências (receitas e despesas não pagas/recebidas) no Dashboard e Fluxo de Caixa porque:
1. **Toda transação (receita/despesa) começa como "pendente"** por padrão
2. O sistema busca registros com `status = 'pendente'` para exibir no Dashboard e Pendências
3. Apenas transações com status `'recebido'` (receitas) ou `'pago'` (despesas) saem da lista de pendências

---

## 🔄 Fluxo de Dados - Ciclo de Vida da Transação

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CRIAÇÃO DA TRANSAÇÃO                                         │
│    ├─ Receita/Despesa criada com status = 'pendente' (DEFAULT) │
│    └─ Gravada no Supabase (tabelas revenues/expenses)          │
├─────────────────────────────────────────────────────────────────┤
│ 2. LÓGICA DE BUSCA NO DASHBOARD                                 │
│    ├─ usePendencies.ts busca: SELECT WHERE status = 'pendente' │
│    └─ Encontra todas as receitas/despesas não pagas            │
├─────────────────────────────────────────────────────────────────┤
│ 3. EXIBIÇÃO NOS COMPONENTES                                     │
│    ├─ Dashboard → Mostra alerta de pendências vencidas         │
│    ├─ Página Pendências → Lista todas as pendências            │
│    └─ Fluxo de Caixa → Inclui (ou deveria) na análise         │
├─────────────────────────────────────────────────────────────────┤
│ 4. MARCAÇÃO COMO PAGO/RECEBIDO                                 │
│    ├─ Usuário clica "Marcar como Pago" em Pendencies.tsx      │
│    ├─ Status atualizado: 'pendente' → 'pago'/'recebido'       │
│    └─ Sai da lista de pendências                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Estrutura do Banco de Dados

### Tabelas: `revenues` e `expenses`

```sql
-- Coluna STATUS adicionada pela migração 005_add_status_pendencies.sql
ALTER TABLE revenues 
ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' 
CHECK (status IN ('pendente', 'recebido', 'cancelado'));

ALTER TABLE expenses 
ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' 
CHECK (status IN ('pendente', 'pago', 'cancelado'));
```

**Valores possíveis por tipo:**

| Tipo | Valores de Status | Significado |
|------|------------------|-----------|
| **Revenues (Receitas)** | `pendente` | Ainda não foi recebido |
| | `recebido` | Receita já foi recebida |
| | `cancelado` | Receita foi cancelada |
| **Expenses (Despesas)** | `pendente` | Ainda não foi pago |
| | `pago` | Despesa já foi paga |
| | `cancelado` | Despesa foi cancelada |

---

## 🔍 Arquivos Chave do Sistema

### 1. **usePendencies.ts** - Hook de Busca
Localização: [src/hooks/usePendencies.ts](src/hooks/usePendencies.ts)

```typescript
// Busca TODAS as receitas pendentes
const { data: revenues } = await supabase
  .from('revenues')
  .select('amount, date, status')
  .eq('company_id', companyId)
  .eq('status', 'pendente');  // ← Filtra por status!

// Busca TODAS as despesas pendentes
const { data: expenses } = await supabase
  .from('expenses')
  .select('amount, date, status')
  .eq('company_id', companyId)
  .eq('status', 'pendente');  // ← Filtra por status!
```

**O que faz:**
- Calcula estatísticas de pendências
- Conta itens vencidos (com base na data)
- Retorna totais de receitas/despesas pendentes

### 2. **Dashboard.tsx** - Exibição do Alerta
Localização: [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L265-L275)

```typescript
// Alerta de Pendências Vencidas
{pendencyStats.overdue > 0 && (
  <Alert className="border-destructive bg-destructive/5">
    <AlertTriangle className="h-4 w-4 text-destructive" />
    <AlertDescription className="ml-2">
      <span className="font-semibold text-destructive">
        {pendencyStats.overdue} itens vencidos!
      </span>
      Você tem {pendencyStats.revenuePending} receita(s) e 
      {pendencyStats.expensePending} despesa(s) pendentes.
    </AlertDescription>
  </Alert>
)}
```

### 3. **Pendencies.tsx** - Página de Gerenciamento
Localização: [src/pages/Pendencies.tsx](src/pages/Pendencies.tsx)

**Função: handleMarkAsPaid**
```typescript
const handleMarkAsPaid = async (id: string, type: 'revenue' | 'expense') => {
  // Define novo status baseado no tipo
  const status = type === 'revenue' ? 'recebido' : 'pago';
  
  // Atualiza no banco de dados
  await supabase
    .from(table)
    .update({ status })
    .eq('id', id);
};
```

### 4. **TransactionEdit.tsx** - Adição de Transações
Localização: [src/pages/TransactionEdit.tsx](src/pages/TransactionEdit.tsx#L145-L155)

**Quando adiciona receita nova:**
```typescript
await supabase.from('revenues').insert({
  company_id: selectedCompany.id,
  description: newTransaction.description,
  amount: parseFloat(newTransaction.amount),
  date: newTransaction.date,
  status: 'recebido',  // ← Receitas novas já são 'recebido'
});
```

⚠️ **NOTA IMPORTANTE:** Novas receitas em TransactionEdit já vêm como `'recebido'`, 
mas outras fontes podem criar com `'pendente'`.

### 5. **CashFlow.tsx** - Fluxo de Caixa
Localização: [src/pages/CashFlow.tsx](src/pages/CashFlow.tsx)

**Problema potencial:** Busca receitas/despesas SEM filtrar por status:
```typescript
const [revenuesResult, expensesResult] = await Promise.all([
  supabase
    .from('revenues')
    .select('amount, date')
    .eq('company_id', selectedCompany.id)
    .gte('date', start)
    .lte('date', end),
    // ⚠️ NÃO filtra por status!
    // INCLUI pendentes + recebidos
]);
```

---

## ⚠️ Problemas Identificados

### 1. **CashFlow inclui Transações Pendentes**
- **Arquivo:** [src/pages/CashFlow.tsx](src/pages/CashFlow.tsx)
- **Problema:** Não filtra por status, então soma receitas/despesas pendentes junto com as já pagas
- **Impacto:** O fluxo de caixa mostra valores que ainda não foram efetivamente recebidos/pagos
- **Solução:** Adicionar `.eq('status', 'recebido')` ou `.eq('status', 'pago')` aos queries

### 2. **Dashboard Dashboard não usa Status Consistentemente**
- **Arquivo:** [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L187-L210)
- **Problema:** Busca receitas/despesas sem filtro de status
```typescript
// Problema: inclui pendentes
const [revenuesResult, expensesResult] = await Promise.all([
  supabase.from('revenues').select('amount')
    .eq('company_id', selectedCompany.id)
    // ⚠️ Sem filtro de status
]);
```

### 3. **TransactionEdit Inconsistente**
- **Arquivo:** [src/pages/TransactionEdit.tsx](src/pages/TransactionEdit.tsx#L72-L87)
- **Problema:** Busca sem filtro de status
- **Impacto:** Lista todas as transações independente se foram pagas ou não

---

## 🎯 Lógica de Filtros por Página

| Página | Busca Por Status | O Que Exibe |
|--------|-----------------|-----------|
| **Dashboard** | NÃO filtra | Todas as transações (pendentes + pagas) |
| **Fluxo de Caixa** | NÃO filtra | Todas as transações (pendentes + pagas) |
| **Lançamentos (TransactionEdit)** | NÃO filtra | Todas as transações |
| **Pendências** | `status = 'pendente'` | Apenas transações não pagas/recebidas |

---

## 🔧 Recomendações

### Para Corrigir o Comportamento:

1. **Dashboard** - Mostrar apenas transações **pagas/recebidas** nos totais:
   ```typescript
   .eq('status', 'recebido')  // para revenues
   .eq('status', 'pago')       // para expenses
   ```

2. **Fluxo de Caixa** - Usar status para calcular fluxo real:
   ```typescript
   .eq('status', 'recebido')  // revenues
   .eq('status', 'pago')       // expenses
   ```

3. **Pendências** - Criar filtro para diferenciar:
   - Pendente
   - Vencido
   - Cancelado

4. **TransactionEdit** - Adicionar coluna de status para visualizar:
   - Quais foram pagas
   - Quais ainda estão pendentes

---

## 📈 Fluxo de Dados Visual

```
┌─────────────────┐
│  Usuário cria   │
│ Receita/Despesa │
└────────┬────────┘
         │
         ▼
    Status = 'pendente' (DEFAULT)
         │
         ├─────────────────┬──────────────────┬──────────────────┐
         ▼                 ▼                  ▼                  ▼
    Dashboard        FluxoCaixa        Pendências      TransactionEdit
    (Mostra)         (Inclui)          (Filtra por)     (Mostra)
    Alerta           em totais         'pendente')      todas
                                       
         │
         ▼
    Usuário marca
    como Pago/Recebido
         │
         ▼
    Status = 'pago' ou 'recebido'
         │
         ▼
    Sai de Pendências
    Continua em Dashboard/FluxoCaixa
```

---

## 📝 Conclusão

O sistema está **funcionando como projetado**, mas há **inconsistência** entre:
- O que é exibido no Dashboard/FluxoCaixa (todas as transações)
- O que é tratado como "pendência" (status = 'pendente')

A solução é **padronizar** qual status deve ser considerado em cada página.
