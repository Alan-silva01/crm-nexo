-- CORREÇÃO URGENTE RLS DE LEADS
-- Execute este script no SQL Editor do Supabase AGORA

-- 1. Remover as políticas problemáticas que criamos
DROP POLICY IF EXISTS "users_and_atendentes_view_leads" ON leads;
DROP POLICY IF EXISTS "users_and_atendentes_manage_leads" ON leads;

-- 2. Recriar políticas originais simples (FUNCIONAM para admin)
CREATE POLICY "Users can view own leads" ON leads
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own leads" ON leads
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own leads" ON leads
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own leads" ON leads
FOR DELETE USING (user_id = auth.uid());

-- 3. Adicionar política para atendentes verem leads do admin deles
CREATE POLICY "Atendentes can view admin leads" ON leads
FOR SELECT USING (
  user_id IN (
    SELECT admin_id FROM atendentes 
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Verificar se RLS está habilitado
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
