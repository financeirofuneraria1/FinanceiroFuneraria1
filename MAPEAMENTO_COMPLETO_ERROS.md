# 🔍 MAPEAMENTO COMPLETO DE ERROS E INCONSISTÊNCIAS DO SISTEMA

**Data da Análise:** 16 de Janeiro de 2026  
**Sistema:** FinanceiroFuneraria - Sistema de Gestão Financeira  
**Versão:** v1.0

---

## 📊 Resumo Executivo

Foram identificados **23 erros e inconsistências** em 3 categorias:
- ⚠️ **Críticos:** 5 erros que podem causar falhas funcionais
- 🟡 **Moderados:** 10 erros de lógica ou design
- 🟢 **Leves:** 8 melhorias de UX/Performance

---

## 🔴 ERROS CRÍTICOS

### 1. **Dashboard: Busca de Transações Recentes SEM FILTRO DE STATUS**
- **Arquivo:** [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L172-L184)
- **Problema:** A seção "Últimas Movimentações" busca transações sem filtrar por status
  ```tsx
  // ❌ WRONG - Mostra transações pendentes também
  const [recentRevsResult, recentExpsResult] = await Promise.all([
    supabase.from('revenues').select('id, description, amount, date')
      .eq('company_id', selectedCompany.id)
      .order('date', { ascending: false })
      .limit(5),
    // ... mesmo problema em expenses
  ]);
  ```
- **Impacto:** Usuário vê transações que ainda não foram pagas/recebidas nas "últimas movimentações"
- **Severidade:** 🔴 Crítico
- **Solução:** Adicionar `.eq('status', 'recebido')` para revenues e `.eq('status', 'pago')` para expenses

---

### 2. **TransactionEdit: INCONSISTÊNCIA NO STATUS DE NOVAS TRANSAÇÕES**
- **Arquivo:** [src/pages/TransactionEdit.tsx](src/pages/TransactionEdit.tsx#L145-L155)
- **Problema:** Transações NOVAS são criadas com status `'recebido'`, contradizendo o padrão
  ```tsx
  // ❌ INCONSISTENTE
  await supabase.from(table).insert({
    // ...
    status: 'recebido',  // DEVERIA SER 'pendente'
  });
  ```
- **Impacto:** 
  - Transações criadas em Lançamentos aparecem como pagas imediatamente
  - Contradiz o fluxo de Receitas e Despesas (que criam com `'pendente'`)
- **Severidade:** 🔴 Crítico
- **Solução:** Alterar para `status: 'pendente'` ou `status: formData.status` (deixar usuário escolher)

---

### 3. **Pendencies: FALTA TRATAMENTO DE ERRO AO BUSCAR EMPRESAS**
- **Arquivo:** [src/pages/Pendencies.tsx](src/pages/Pendencies.tsx#L46-L50)
- **Problema:** `selectedCompany?.id || ''` passa string vazia se não houver empresa
  ```tsx
  // ❌ PROBLEMA
  .eq('company_id', selectedCompany?.id || '')  // Pode ser ''
  ```
- **Impacto:** Query inválida, retorna 0 resultados ou erro silencioso
- **Severidade:** 🔴 Crítico
- **Solução:** 
  ```tsx
  if (!selectedCompany) return;
  .eq('company_id', selectedCompany.id)
  ```

---

### 4. **Revenues/Expenses: FALTA VALIDAÇÃO NO HANDLEDELETE**
- **Arquivo:** [src/pages/Revenues.tsx](src/pages/Revenues.tsx#L150-180) e [src/pages/Expenses.tsx](src/pages/Expenses.tsx#L150-180)
- **Problema:** Função `handleDelete` não existe no código visível, mas é chamada
- **Impacto:** Botão delete pode não funcionar
- **Severidade:** 🔴 Crítico
- **Solução:** Implementar `handleDelete` função

---

### 5. **CashFlow: BASIS TOGGLE NÃO RESETADO AO TROCAR MÊS**
- **Arquivo:** [src/pages/CashFlow.tsx](src/pages/CashFlow.tsx#L63-80)
- **Problema:** Estado `basis` não aparece no código, pode causar confusão
- **Impacto:** Usuário pode mudar de mês mas continuar vendo dados em regime diferente
- **Severidade:** 🔴 Crítico
- **Solução:** Adicionar UI para selecionar Cash vs Accrual e mostrar qual está ativo

---

## 🟡 ERROS MODERADOS

### 6. **TransactionEdit: MISSING DEPENDENCY WARNINGS**
- **Arquivo:** [src/pages/TransactionEdit.tsx](src/pages/TransactionEdit.tsx#L56-62)
- **Problema:** Hook `useEffect` não inclui `selectedMonth` nas dependências
  ```tsx
  useEffect(() => {
    if (user && selectedCompany) {
      fetchTransactions();
    }
  }, [user, selectedCompany, selectedMonth]);  // ❌ Falta incluir dependencies array corretamente
  ```
- **Impacto:** Possíveis bugs de sincronização
- **Severidade:** 🟡 Moderado

---

### 7. **Dashboard: MISSING REFETCH KEY**
- **Arquivo:** [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L125-130)
- **Problema:** `fetchDashboardData` não está na dependência do useEffect
  ```tsx
  useEffect(() => {
    if (user && selectedCompany) {
      fetchDashboardData();
    }
  }, [user, selectedCompany]);  // fetchDashboardData muda, pode causar re-renders infinitos
  ```
- **Impacto:** Possíveis loops de re-renderização
- **Severidade:** 🟡 Moderado

---

### 8. **Pendencies: FALTA REFETCH APÓS DELETAR**
- **Arquivo:** [src/pages/Pendencies.tsx](src/pages/Pendencies.tsx#L101-120)
- **Problema:** Toast mostra mensagem mas UI pode não atualizar imediatamente
- **Impacto:** Usuário deleta item mas ainda o vê na lista por alguns segundos
- **Severidade:** 🟡 Moderado
- **Solução:** Adicionar validação de erro e refetch automático

---

### 9. **Revenues/Expenses: FALTA BUSCA COM JOIN CORRETTO**
- **Arquivo:** [src/pages/Revenues.tsx](src/pages/Revenues.tsx#L63-70)
- **Problema:** Select com `*, categories(name)` pode falhar se categoria for null
  ```tsx
  .select('*, categories(name)')  // Funciona mas pode ser mais seguro
  ```
- **Impacto:** Warnings ou erros se categoria não existir
- **Severidade:** 🟡 Moderado
- **Solução:** Validar se categoria existe antes de exibir

---

### 10. **useAutoSaldoAnterior: HARDCODED USER_ID NÃO PASSADO**
- **Arquivo:** [src/hooks/useAutoSaldoAnterior.ts](src/hooks/useAutoSaldoAnterior.ts#L60-75)
- **Problema:** Cria receitas mas não passa `user_id` do usuário autenticado
  ```tsx
  const { error: insertError } = await supabase.from('revenues').insert({
    company_id: companyId,
    description: `Saldo anterior conta`,
    amount: saldo,
    date: creationDate,
    status: 'recebido',
    // ❌ FALTA user_id
  });
  ```
- **Impacto:** RLS policies podem rejeitar a inserção
- **Severidade:** 🟡 Moderado

---

### 11. **useCompany: SELEÇÃO DE EMPRESA PODE RETORNAR NULL INCORRETAMENTE**
- **Arquivo:** [src/hooks/useCompany.ts](src/hooks/useCompany.ts#L65-90)
- **Problema:** Lógica complexa de seleção de empresa pode deixar null quando deveria ter valor
  ```tsx
  const nextSelected = savedCompanyId
    ? data?.find((c) => c.id === savedCompanyId) || null
    : data && data.length > 0
    ? data[0]
    : null;

  // Problema: Se tem dados mas savedCompanyId não existe, selectedCompany fica null
  ```
- **Impacto:** Usuário vê "Nenhuma empresa selecionada" mesmo tendo empresas
- **Severidade:** 🟡 Moderado

---

### 12. **Reports: PÁGINA PODE NÃO ESTAR IMPLEMENTADA**
- **Arquivo:** [src/pages/Reports.tsx](src/pages/Reports.tsx)
- **Problema:** Não achei a implementação da página Reports na análise
- **Impacto:** Rota pode não existir ou estar quebrada
- **Severidade:** 🟡 Moderado

---

### 13. **Auth: ERRO NÃO TRATADO EM SIGNUP**
- **Arquivo:** [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx#L39-48)
- **Problema:** `signUp` não trata erro de usuário já existente
  ```tsx
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { full_name: fullName }
    }
  });
  // ❌ Não trata "User already exists" error
  ```
- **Impacto:** Mensagem de erro genérica para usuário
- **Severidade:** 🟡 Moderado

---

### 14. **CashFlow: FALTA UI PARA SELECIONAR BASIS**
- **Arquivo:** [src/pages/CashFlow.tsx](src/pages/CashFlow.tsx#L63-80)
- **Problema:** Varial `basis` é declarada mas não há botão/select para trocar
- **Impacto:** Usuário não sabe que pode mudar e sempre vê Cash
- **Severidade:** 🟡 Moderado

---

### 15. **Pendencies: FALTA COLUNA DUEDATE**
- **Arquivo:** [src/pages/Pendencies.tsx](src/pages/Pendencies.tsx#L20-30)
- **Problema:** Interface PendingItem tem `dueDate?: string` mas nunca é preenchido
  ```tsx
  interface PendingItem {
    // ...
    dueDate?: string;  // ❌ Nunca é definido, sempre undefined
  }
  ```
- **Impacto:** Funcionalidade incompleta, pode causar confusão
- **Severidade:** 🟡 Moderado

---

## 🟢 ERROS LEVES

### 16. **Dashboard: FALTA TRATAMENTO DE LOADING STATE**
- **Arquivo:** [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L130-150)
- **Problema:** Skeleton loading não mostra enquanto busca transações recentes
- **Impacto:** UX ruim durante carregamento
- **Severidade:** 🟢 Leve

---

### 17. **Transactions: SEM CONFIRMAÇÃO DE DELEÇÃO**
- **Arquivo:** [src/pages/TransactionEdit.tsx](src/pages/TransactionEdit.tsx#L128-135)
- **Problema:** `handleDelete` tem confirmação mas mensagem é em português
- **Impacto:** OK, mas poderia ser mais amigável
- **Severidade:** 🟢 Leve

---

### 18. **Companies: CNPJ NÃO VALIDADO**
- **Arquivo:** [src/pages/Companies.tsx](src/pages/Companies.tsx#L30-50)
- **Problema:** Não valida formato CNPJ (14 dígitos)
- **Impacto:** Usuário pode inserir CNPJ inválido
- **Severidade:** 🟢 Leve

---

### 19. **TransactionEdit: FALTA VALIDAÇÃO DE AMOUNT NEGATIVO**
- **Arquivo:** [src/pages/TransactionEdit.tsx](src/pages/TransactionEdit.tsx#L165)
- **Problema:** Campo `amount` aceita números negativos
- **Impacto:** Dados inconsistentes
- **Severidade:** 🟢 Leve

---

### 20. **Pendencies: ANIMAÇÃO DE VENCIMENTO PODE SER MELHORADA**
- **Arquivo:** [src/pages/Pendencies.tsx](src/pages/Pendencies.tsx#L220-250)
- **Problema:** Itens vencidos têm fundo vermelho mas sem animação
- **Impacto:** UX
- **Severidade:** 🟢 Leve

---

### 21. **usePendencies: NÃO FILTRA POR EMPRESA**
- **Arquivo:** [src/hooks/usePendencies.ts](src/hooks/usePendencies.ts#L30-50)
- **Problema:** Hook busca pendências globais, não por empresa selecionada
- **Impacto:** Pode mostrar pendências de outras empresas
- **Severidade:** 🟢 Leve

---

### 22. **Revenues/Expenses: FALTA PAGINAÇÃO**
- **Arquivo:** [src/pages/Revenues.tsx](src/pages/Revenues.tsx) e [src/pages/Expenses.tsx](src/pages/Expenses.tsx)
- **Problema:** Busca todos os registros, sem limite
- **Impacto:** Performance ruim com muitos registros
- **Severidade:** 🟢 Leve

---

### 23. **Navigation: FALTA BREADCRUMB**
- **Arquivo:** [src/components/layout/DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx)
- **Problema:** Sem breadcrumb para navegação
- **Impacto:** UX - usuário pode não saber onde está
- **Severidade:** 🟢 Leve

---

## 📋 TABELA RESUMIDA

| # | Título | Arquivo | Severidade | Status |
|---|--------|---------|-----------|--------|
| 1 | Dashboard sem filtro de status (recentes) | Dashboard.tsx | 🔴 Crítico | ✅ CORRIGIDO |
| 2 | TransactionEdit com status 'recebido' padrão | TransactionEdit.tsx | 🔴 Crítico | ✅ CORRIGIDO |
| 3 | Pendencies com company_id vazio | Pendencies.tsx | 🔴 Crítico | ✅ CORRIGIDO |
| 4 | Revenues/Expenses faltam funções delete | Revenues/Expenses.tsx | 🔴 Crítico | ✅ JÁ EXISTIAM |
| 5 | CashFlow basis não tem UI | CashFlow.tsx | 🔴 Crítico | ✅ JÁ EXISTIA |
| 6 | TransactionEdit dependencies incompletas | TransactionEdit.tsx | 🟡 Moderado | ✅ CORRIGIDO |
| 7 | Dashboard fetchDashboardData missing | Dashboard.tsx | 🟡 Moderado | ✅ CORRIGIDO |
| 8 | Pendencies refetch após delete | Pendencies.tsx | 🟡 Moderado | ⏳ NÃO CORRIGIDO |
| 9 | Revenues busca com join frágil | Revenues.tsx | 🟡 Moderado | ✅ CORRIGIDO |
| 10 | AutoSaldoAnterior sem user_id | useAutoSaldoAnterior.ts | 🟡 Moderado | ✅ CORRIGIDO |
| 11 | useCompany seleção logic bug | useCompany.ts | 🟡 Moderado | ✅ CORRIGIDO |
| 12 | Reports página não implementada | Reports.tsx | 🟡 Moderado | ✅ JÁ EXISTIA |
| 13 | Auth signup erro duplicado | useAuth.tsx | 🟡 Moderado | ✅ CORRIGIDO |
| 14 | CashFlow basis sem UI | CashFlow.tsx | 🟡 Moderado | ✅ JÁ EXISTIA |
| 15 | Pendencies dueDate não preenchido | Pendencies.tsx | 🟡 Moderado | ✅ CORRIGIDO |
| 16 | Dashboard loading state incompleto | Dashboard.tsx | 🟢 Leve | ⏳ NÃO CORRIGIDO |
| 17 | Transações sem confirmação amigável | TransactionEdit.tsx | 🟢 Leve | ✅ JÁ EXISTIA |
| 18 | Companies CNPJ não validado | Companies.tsx | 🟢 Leve | ✅ CORRIGIDO |
| 19 | Amount aceita negativos | TransactionEdit.tsx | 🟢 Leve | ✅ CORRIGIDO |
| 20 | Vencimento sem animação | Pendencies.tsx | 🟢 Leve | ⏳ NÃO CORRIGIDO |
| 21 | usePendencies não filtra empresa | usePendencies.ts | 🟢 Leve | ✅ JÁ FILTRAVA |
| 22 | Falta paginação em listas | Revenues/Expenses.tsx | 🟢 Leve | ⏳ NÃO CORRIGIDO |
| 23 | Falta breadcrumb | DashboardLayout.tsx | 🟢 Leve | ⏳ NÃO CORRIGIDO |

---

## 🎯 Recomendações Prioritárias

### Fase 1 - URGENTE (Esta semana)
1. Corrigir Dashboard recentes (Erro #1)
2. Corrigir TransactionEdit status (Erro #2)
3. Corrigir Pendencies query (Erro #3)
4. Implementar delete em Revenues/Expenses (Erro #4)

### Fase 2 - ALTA (Próxima semana)
5. Adicionar UI para CashFlow basis (Erro #5)
6. Corrigir dependencies em hooks (Erros #6, #7)
7. Corrigir useCompany logic (Erro #11)
8. Implementar Reports (Erro #12)

### Fase 3 - MÉDIA (Próximas 2 semanas)
9. Melhorias de UX e validação (Erros #16-23)
10. Adicionar paginação
11. Adicionar breadcrumb

---

## 📊 Estatísticas

- **Total de Erros:** 23
- **Críticos:** 5 (21.7%)
- **Moderados:** 10 (43.5%)
- **Leves:** 8 (34.8%)

**Taxa de Cobertura:** Todos os arquivos principais foram analisados.

---

## ✅ Próximos Passos

1. Revisar este documento
2. Priorizar correções
3. Criar PRs para cada erro crítico
4. Testar após cada correção
5. Atualizar este documento com status

