# Nero CRM - Edge Functions (Tools)

As 3 ferramentas disponíveis para integração com n8n AI Agent via HTTP Request.

---

## 1. Adicionar Tag

Adiciona uma tag/etiqueta a um lead. Cria a tag automaticamente se não existir.

**URL:**
```
POST https://jreklrhamersmamdmjna.supabase.co/functions/v1/add-tag
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "phone": "11999998888",
  "tag_name": "Cliente VIP",
  "tag_color": "#6366f1",
  "user_id": "SEU_USER_ID"
}
```

**Curl:**
```bash
curl -X POST 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/add-tag' \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "11999998888",
    "tag_name": "Cliente VIP",
    "tag_color": "#6366f1",
    "user_id": "SEU_USER_ID"
  }'
```

**Parâmetros:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| phone | string | ✅ | Telefone do cliente |
| tag_name | string | ✅ | Nome da tag a adicionar |
| tag_color | string | ❌ | Cor hexadecimal (padrão: #6366f1) |
| user_id | string | ✅ | ID do usuário no CRM |

---

## 2. Notificar Humano

Chama um atendente humano para assumir a conversa. Pausa a IA automaticamente.

**URL:**
```
POST https://jreklrhamersmamdmjna.supabase.co/functions/v1/notify-human
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "phone": "11999998888",
  "message": "Cliente solicitou falar com atendente",
  "user_id": "SEU_USER_ID"
}
```

**Curl:**
```bash
curl -X POST 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/notify-human' \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "11999998888",
    "message": "Cliente solicitou falar com atendente",
    "user_id": "SEU_USER_ID"
  }'
```

**Parâmetros:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| phone | string | ✅ | Telefone do cliente |
| message | string | ❌ | Motivo da transferência |
| user_id | string | ✅ | ID do usuário no CRM |

---

## 3. Atualizar Lead

Atualiza dados de um lead (nome, email, status, descrição, dados personalizados).

**URL:**
```
POST https://jreklrhamersmamdmjna.supabase.co/functions/v1/update-lead
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "phone": "11999998888",
  "user_id": "SEU_USER_ID",
  "name": "João Silva",
  "email": "joao@email.com",
  "status": "Qualificado",
  "description": "Cliente interessado em automação",
  "dados": {
    "cidade": "São Paulo",
    "interesse": "Chatbot"
  }
}
```

**Curl:**
```bash
curl -X POST 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/update-lead' \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "11999998888",
    "user_id": "SEU_USER_ID",
    "name": "João Silva",
    "email": "joao@email.com",
    "status": "Qualificado",
    "description": "Cliente interessado em automação",
    "dados": {
      "cidade": "São Paulo",
      "interesse": "Chatbot"
    }
  }'
```

**Parâmetros:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| phone | string | ✅ | Telefone do cliente |
| user_id | string | ✅ | ID do usuário no CRM |
| name | string | ❌ | Nome do lead |
| email | string | ❌ | Email do lead |
| status | string | ❌ | Status do lead |
| description | string | ❌ | Descrição/resumo (vai para resumo_ia) |
| dados | object | ❌ | Dados personalizados (merge com existentes) |

---

## Uso no n8n HTTP Request Tool

1. Adicione o node **HTTP Request Tool** ao AI Agent
2. Configure:
   - **Method**: POST
   - **URL**: URL da função desejada
   - **Body Content Type**: JSON
   - **Body**: Os parâmetros conforme documentação acima

O AI Agent vai poder chamar essas ferramentas automaticamente baseado no contexto da conversa!
