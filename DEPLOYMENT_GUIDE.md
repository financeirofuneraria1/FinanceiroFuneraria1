# Guia de Deployment - Pendências Sistema

## 🎯 Passo 1: Aplicar Migration no Supabase

### Via Supabase Dashboard

1. Acesse [supabase.com](https://supabase.com)
2. Acesse seu projeto "financeiro-funeraria"
3. Vá para **SQL Editor**
4. Crie uma nova query ou clique em "New Query"
5. Cole o código abaixo:

```sql
-- Adicionar coluna status às tabelas
ALTER TABLE revenues 
ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' 
CHECK (status IN ('pendente', 'recebido', 'cancelado'));

ALTER TABLE expenses 
ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' 
CHECK (status IN ('pendente', 'pago', 'cancelado'));

-- Criar índices para melhor performance
CREATE INDEX idx_revenues_status ON revenues(status);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_revenues_company_status ON revenues(company_id, status);
CREATE INDEX idx_expenses_company_status ON expenses(company_id, status);
```

6. Clique em **Run** (ou Ctrl+Enter)
7. Aguarde a conclusão ✅

### Verificação

Após executar, verifique que as tabelas foram atualizadas:

```sql
-- Verificar coluna status em revenues
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'revenues' AND column_name = 'status';

-- Verificar coluna status em expenses
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'status';
```

---

## 🚀 Passo 2: Fazer Deploy no Vercel

### Opção A: Git Commit & Push

```bash
cd "C:\Users\Usuário\Documents\GitHub\FinanceiroFuneraria1"

# Adicionar arquivos
git add .

# Commit
git commit -m "feat: implementar sistema de pendências com 3 opções
- Opção 1: Receitas/Despesas com status (pendente/recebido/pago)
- Opção 2: Nova página Dashboard de Pendências
- Opção 3: Alertas e notificações na Dashboard + Badge no menu"

# Push para GitHub
git push origin main
```

### Opção B: Deploy Manual via Vercel CLI

```bash
vercel deploy --prod
```

---

## ✅ Teste Local (Antes de Fazer Deploy)

### 1. Instalar dependências (se necessário)
```bash
npm install
```

### 2. Rodar servidor local
```bash
npm run dev
```

### 3. Testar Features

- [ ] Criar nova receita com status "Pendente"
- [ ] Acessar página `/pendencies`
- [ ] Ver badge com contagem no menu
- [ ] Ver alerta na Dashboard se houver vencidos
- [ ] Editar status de receita para "Recebido"
- [ ] Criar despesa com status "Pago"
- [ ] Filtrar por tipo na página de pendências
- [ ] Marcar como pago/recebido direto da pendências

### 4. Verificar Build
```bash
npm run build
```

---

## 📱 Após Deploy - Teste em Produção

1. Acesse https://seu-dominio.vercel.app
2. Faça login
3. Teste todos os pontos acima em produção

---

## 🔄 Rollback (Se Necessário)

Se algo der errado no Supabase:

```sql
-- Remover as colunas
ALTER TABLE revenues DROP COLUMN status;
ALTER TABLE expenses DROP COLUMN status;

-- Remover os índices (opcional, será feito automaticamente)
DROP INDEX IF EXISTS idx_revenues_status;
DROP INDEX IF EXISTS idx_expenses_status;
DROP INDEX IF EXISTS idx_revenues_company_status;
DROP INDEX IF EXISTS idx_expenses_company_status;
```

---

## 📊 Checklist de Deployment

### Pré-Deploy
- [ ] Code review das mudanças
- [ ] Testar localmente com `npm run dev`
- [ ] Build sem erros: `npm run build`
- [ ] Commit com mensagem clara

### Deployment
- [ ] Aplicar migration no Supabase ✅
- [ ] Push para GitHub
- [ ] Verificar deploy automático no Vercel
- [ ] Testar em produção

### Pós-Deploy
- [ ] Verificar logs no Vercel
- [ ] Testar fluxo completo
- [ ] Comunicar ao usuário

---

## 🆘 Troubleshooting

### Erro: "Column 'status' already exists"
**Causa**: Coluna já foi criada anteriormente
**Solução**: Remover a coluna primeiro e executar novamente, ou usar `ALTER TABLE revenues ADD COLUMN IF NOT EXISTS status ...`

### Erro: "CHECK constraint violation"
**Causa**: Tentou inserir valor inválido para status
**Solução**: Usar apenas: `pendente`, `recebido`, `cancelado` (revenues) ou `pendente`, `pago`, `cancelado` (expenses)

### Badge não aparece
**Causa**: Hook `usePendencies` não está ativo
**Solução**: Verificar se empresa está selecionada no Sidebar

### Alerta não aparece
**Causa**: Sem itens vencidos
**Solução**: Criar uma receita/despesa com data passada e deixar em "Pendente"

---

## 📞 Suporte

Para dúvidas sobre a implementação, referir-se a:
- `IMPLEMENTATION_SUMMARY.md` - Resumo das mudanças
- Arquivos modificados listados no summary
