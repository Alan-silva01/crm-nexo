# Migração Multi-Tenant com User Roles

**Data de Início:** 2026-01-16
**Status:** Em Andamento

## 📋 Resumo da Migração

Migração da arquitetura atual (tabela `atendentes` separada) para uma arquitetura multi-tenant com user roles.

---

## 🔄 ROLLBACK - Como Reverter Tudo

### Caso 1: Reverter APENAS o Banco de Dados

Se precisar reverter apenas as mudanças no banco de dados, execute no Supabase SQL Editor:

```sql
-- ============================================
-- ROLLBACK COMPLETO DO BANCO DE DADOS
-- Execute este script para reverter todas as mudanças
-- ============================================

-- 1. Remover RLS policies das novas tabelas
DROP POLICY IF EXISTS "tenant_users_select" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete" ON tenant_users;
DROP POLICY IF EXISTS "tenants_select" ON tenants;
DROP POLICY IF EXISTS "tenants_insert" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;

-- 2. Remover coluna tenant_id das tabelas (se foi adicionada)
ALTER TABLE leads DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE kanban_columns DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE tags DROP COLUMN IF EXISTS tenant_id;

-- 3. Remover tabelas novas
DROP TABLE IF EXISTS tenant_users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 4. Restaurar RLS policies antigas da tabela leads (se foram alteradas)
-- (As policies originais devem continuar funcionando pois não foram removidas)

-- 5. Verificar que a tabela atendentes ainda existe
SELECT * FROM atendentes LIMIT 5;
```

### Caso 2: Reverter o Código Frontend

Os arquivos originais serão mantidos com sufixo `.backup` durante a migração:

```bash
# Restaurar arquivos do frontend
cd /Users/alanferreiradasilva/Documents/NEXO_CRM/crm-nexo-1/nexo-crm

# Restaurar arquivos originais
cp src/lib/atendentesService.ts.backup src/lib/atendentesService.ts
cp src/lib/AuthProvider.tsx.backup src/lib/AuthProvider.tsx
cp src/lib/leadsService.ts.backup src/lib/leadsService.ts
cp src/lib/tagsService.ts.backup src/lib/tagsService.ts
cp components/WhatsAppChat.tsx.backup components/WhatsAppChat.tsx
cp components/Settings.tsx.backup components/Settings.tsx
```

---

## 📊 Estado ANTES da Migração

### Estrutura do Banco de Dados

#### Tabela: `atendentes`
```sql
CREATE TABLE atendentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    user_id UUID REFERENCES auth.users(id),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `leads` (campos relevantes)
```sql
-- Campos existentes importantes:
-- user_id UUID - referência ao admin dono do lead
-- assigned_to UUID - referência ao atendente.id
```

### Arquivos Críticos do Frontend

1. **`src/lib/atendentesService.ts`**
   - Interface `Atendente` com `admin_id`, `user_id`
   - Interface `UserTypeInfo` com types `admin` | `atendente`
   - Função `getUserTypeInfo()` que checa tabela `atendentes`

2. **`src/lib/AuthProvider.tsx`**
   - Usa `atendentesService.getUserTypeInfo()`
   - Guarda `userType`, `effectiveUserId`, `atendenteInfo` no contexto
   - Cache em localStorage

3. **`src/lib/leadsService.ts`**
   - Usa `atendentesService.getUserTypeInfo()` para filtrar leads
   - Atendente vê apenas leads `assigned_to = seu ID`

4. **`components/Settings.tsx`**
   - Lista e gerencia atendentes via `atendentesService`

5. **`components/WhatsAppChat.tsx`**
   - Lista atendentes para atribuição
   - Mostra badge de atribuição

---

## 🎯 Estado DEPOIS da Migração

### Novas Tabelas

#### Tabela: `tenants`
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE, -- para URLs amigáveis (opcional)
    settings JSONB DEFAULT '{}',
    max_users INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela: `tenant_users`
```sql
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'admin', 'atendente', 'viewer')) DEFAULT 'atendente',
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);
```

#### Alterações em `leads`
```sql
-- Adicionar coluna
ALTER TABLE leads ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Criar índice
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
```

### Mapeamento de Dados

| Antes | Depois |
|-------|--------|
| `users.id` (admin) | `tenants.id` (1 tenant por admin) |
| `atendentes.id` | `tenant_users.id` |
| `atendentes.admin_id` | `tenant_users.tenant_id` |
| `atendentes.user_id` | `tenant_users.user_id` |
| `atendentes.nome` | `tenant_users.nome` |
| `atendentes.ativo` | `tenant_users.ativo` |
| `leads.user_id` | `leads.tenant_id` |
| `leads.assigned_to` | `leads.assigned_to` (agora → tenant_users.id) |

---

## 📝 Checklist de Migração

### Fase 1: Preparação
- [x] Criar backup dos arquivos frontend
- [x] Documentar estado atual (este arquivo)

### Fase 2: Banco de Dados
- [x] Criar tabela `tenants`
- [x] Criar tabela `tenant_users`
- [x] Migrar dados: criar 1 tenant por admin existente
- [x] Migrar dados: converter atendentes para tenant_users
- [x] Adicionar `tenant_id` na tabela `leads`
- [x] Popular `tenant_id` baseado em `user_id` existente
- [x] Criar RLS policies para novas tabelas
- [x] Atualizar FK de `assigned_to` para apontar para `tenant_users`

### Fase 3: Frontend
- [x] Criar novo `src/lib/tenantService.ts`
- [x] Atualizar `AuthProvider.tsx`
- [x] Atualizar `leadsService.ts`
- [x] Atualizar `tagsService.ts`
- [x] Atualizar `Settings.tsx`
- [x] Atualizar `WhatsAppChat.tsx`

### Fase 4: Edge Functions
- [x] Criar `create-tenant-user` Edge Function

### Fase 5: Testes
- [ ] Testar login como admin
- [ ] Testar login como atendente
- [ ] Testar criação de atendente
- [ ] Testar visualização de leads
- [ ] Testar atribuição de leads

### Fase 6: Limpeza (SOMENTE após testes OK)
- [ ] Remover tabela `atendentes` antiga
- [ ] Remover arquivos `.backup`
- [ ] Remover coluna `user_id` de leads (depois que tenant_id estiver 100%)

---

## ⚠️ Pontos de Atenção

1. **Edge Function `create-atendente`**: Ainda existe e precisará ser atualizada ou removida
2. **Mobile App (nero-mobile)**: Também usa a lógica de atendentes e precisará ser atualizado
3. **Metadata do Auth**: Atendentes têm `is_atendente` e `admin_id` no metadata - manter compatibilidade
4. **Cache localStorage**: Limpar caches antigos após migração

---

## 🔐 RLS Policies Novas

```sql
-- Tenants: usuário pode ver tenants onde é membro
CREATE POLICY "tenants_select" ON tenants FOR SELECT
USING (
    id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
);

-- Tenant Users: pode ver membros do mesmo tenant
CREATE POLICY "tenant_users_select" ON tenant_users FOR SELECT
USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
);

-- Tenant Users: apenas owner/admin pode inserir
CREATE POLICY "tenant_users_insert" ON tenant_users FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- Leads: ver leads do mesmo tenant
CREATE POLICY "leads_tenant_select" ON leads FOR SELECT
USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
);
```

---

## 📞 Contato em Caso de Problemas

Se algo der errado durante a migração:
1. Execute o rollback do banco de dados (seção acima)
2. Restaure os arquivos `.backup` do frontend
3. Reinicie o servidor de desenvolvimento
