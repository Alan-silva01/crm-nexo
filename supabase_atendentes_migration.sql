-- =====================================================
-- SISTEMA DE SUB-ATENDENTES - MIGRAÇÃO DE BANCO DE DADOS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar coluna max_atendentes em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_atendentes INTEGER DEFAULT 0;

-- 2. Criar tabela de atendentes
CREATE TABLE IF NOT EXISTS atendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_atendentes_admin ON atendentes(admin_id);
CREATE INDEX IF NOT EXISTS idx_atendentes_user ON atendentes(user_id);

-- 4. Adicionar coluna assigned_to em leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES atendentes(id);

-- 5. Habilitar RLS na tabela atendentes
ALTER TABLE atendentes ENABLE ROW LEVEL SECURITY;

-- 6. Política: Admin pode gerenciar seus atendentes
CREATE POLICY "admin_manage_atendentes" ON atendentes
FOR ALL USING (admin_id = auth.uid());

-- 7. Política: Atendente pode ver a si mesmo
CREATE POLICY "atendente_view_self" ON atendentes
FOR SELECT USING (user_id = auth.uid());

-- 8. Atualizar RLS de leads para permitir atendentes verem leads do admin
-- Primeiro, remover política antiga se existir
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can manage own leads" ON leads;

-- Nova política que permite admin E seus atendentes
CREATE POLICY "users_and_atendentes_view_leads" ON leads
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  user_id IN (SELECT admin_id FROM atendentes WHERE user_id = auth.uid() AND ativo = true)
);

CREATE POLICY "users_and_atendentes_manage_leads" ON leads
FOR ALL USING (
  user_id = auth.uid() 
  OR 
  user_id IN (SELECT admin_id FROM atendentes WHERE user_id = auth.uid() AND ativo = true)
);

-- =====================================================
-- VERIFICAÇÃO: Rode isso para confirmar que funcionou
-- =====================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_atendentes';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'assigned_to';
-- SELECT * FROM information_schema.tables WHERE table_name = 'atendentes';
