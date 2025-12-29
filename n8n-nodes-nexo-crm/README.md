# n8n-nodes-nexo-crm

Nós customizados do n8n para integração com o Nexo CRM.

## 🚀 Funcionalidades

### Lead
- **Criar** - Criar novo lead
- **Atualizar** - Atualizar dados do lead
- **Deletar** - Remover lead
- **Buscar** - Buscar lead por ID
- **Listar** - Listar todos os leads
- **Mover** - Mover lead para uma coluna (cria a coluna automaticamente se não existir!)

### Coluna
- **Criar** - Criar nova coluna no Kanban
- **Listar** - Listar colunas do Kanban
- **Deletar** - Remover coluna

## 📦 Instalação no n8n Self-Hosted (Easypanel/Docker)

### Opção 1: Via npm (Recomendado)

1. Acesse o container do n8n:
```bash
docker exec -it n8n sh
```

2. Instale o pacote:
```bash
cd /data
npm install n8n-nodes-nexo-crm
```

3. Reinicie o n8n

### Opção 2: Link Local (Desenvolvimento)

1. Clone este repositório:
```bash
git clone https://github.com/alan-silva01/n8n-nodes-nexo-crm.git
cd n8n-nodes-nexo-crm
```

2. Instale as dependências e compile:
```bash
npm install
npm run build
```

3. Link global:
```bash
npm link
```

4. No diretório de dados do n8n:
```bash
cd ~/.n8n
npm link n8n-nodes-nexo-crm
```

5. Reinicie o n8n

### Opção 3: Via Docker Compose

Adicione ao seu `docker-compose.yml`:

```yaml
services:
  n8n:
    image: n8nio/n8n
    volumes:
      - ./n8n-nodes-nexo-crm:/home/node/.n8n/custom/n8n-nodes-nexo-crm
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
```

## 🔧 Configuração

1. Após instalar, vá em **Credentials** no n8n
2. Adicione uma nova credencial do tipo **Nexo CRM API**
3. Preencha:
   - **Supabase URL**: `https://jreklrhamersmamdmjna.supabase.co`
   - **API Key**: Sua anon key do Supabase
   - **User ID**: UUID do usuário dono dos leads

## 📝 Exemplos de Uso

### Criar Lead
1. Adicione o nó **Nexo CRM**
2. Recurso: **Lead**
3. Operação: **Criar**
4. Preencha Nome, Telefone, E-mail e Coluna

### Mover Lead (com auto-criação de coluna)
1. Adicione o nó **Nexo CRM**
2. Recurso: **Lead**
3. Operação: **Mover**
4. Lead ID: ID do lead
5. Nova Coluna: Nome da coluna (ex: "Compra Realizada")
   - Se a coluna não existir, será criada automaticamente!

## 📄 Licença

MIT
