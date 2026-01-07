-- ============================================
-- ADICIONAR COLUNA STATUS EM REVENUES E EXPENSES
-- ============================================

ALTER TABLE revenues 
ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' 
CHECK (status IN ('pendente', 'recebido', 'cancelado'));

ALTER TABLE expenses 
ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' 
CHECK (status IN ('pendente', 'pago', 'cancelado'));

-- ============================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_revenues_status ON revenues(status);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_revenues_company_status ON revenues(company_id, status);
CREATE INDEX idx_expenses_company_status ON expenses(company_id, status);
