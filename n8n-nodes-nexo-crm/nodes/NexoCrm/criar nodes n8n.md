Prompt:
Crie um arquivo .md com especificações completas para desenvolvimento de um community node [NOME DA API] para n8n. Acesse a documentação em [LINK DA DOCUMENTAÇÃO DA API] e extraia todas as informações da API.
OBJETIVO: Gerar um arquivo markdown que o Cursor IDE possa usar para criar automaticamente a estrutura completa do community node que será publicado no npm.
REGRAS OBRIGATÓRIAS:
1. O 'name' nos exemplos de código TypeScript deve ser SEMPRE o nome real do node (ex: 'numVerify', 'openAi'), NUNCA usar 'exampleNode' ou similar
2. Usar o nome correto da API em minúsculas/camelCase para propriedades 'name'
3. Usar PascalCase para classes 
4. Incluir código TypeScript completo e funcional nos exemplos
5. Arquivo otimizado para interpretação do Cursor IDE
ESTRUTURA OBRIGATÓRIA DO ARQUIVO .MD:
1. API Overview
Descrição da API
Base URL
Método de autenticação
Funcionalidades principais
2. Estrutura do Projeto
Árvore de pastas completa
Lista de arquivos necessários
3. Configurações do Projeto
package.json completo com configurações n8n
tsconfig.json
Outros arquivos de configuração necessários
4. Logo SVG
Código SVG pronto para usar (60x60px)
Especificações técnicas do logo
5. API Endpoints e Especificações
Todos os endpoints disponíveis
Parâmetros obrigatórios e opcionais
Exemplos de requests e responses
Códigos de erro
Tipos de dados retornados
6. Arquivo de Credenciais
Código TypeScript completo do arquivo credentials
Implementação da interface ICredentialType
Configuração de autenticação
7. Node Principal
Código TypeScript completo do node
Implementação da interface INodeType
Todas as operações/recursos da API
Tratamento de erros
Lógica de execução completa
8. Comandos de Build e Publicação
Scripts npm necessários
Comandos de build
Instruções de publicação
9. Funcionalidades do Node
Resumo das capabilities implementadas
Recursos disponíveis
Operações suportadas
REQUISITOS TÉCNICOS PARA OS CÓDIGOS DE EXEMPLO:
TypeScript funcional e completo
Compatível com n8n community nodes
Usar requestWithAuthentication para API calls
Implementar interfaces INodeType e ICredentialType
Tratamento adequado de erros
Suporte HTTPS quando disponível
Credenciais seguras
Pronto para publicação npm
FOCO DO DOCUMENTO:
Especificações técnicas completas
Códigos de exemplo funcionais
Documentação clara para desenvolvimento
Informações estruturadas para o Cursor IDE
Remover detalhes comerciais desnecessários
Incluir apenas funcionalidades técnicas da API
Gere um arquivo markdown estruturado que o Cursor IDE possa interpretar para criar o community node automaticamente.
