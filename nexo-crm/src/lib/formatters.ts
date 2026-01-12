/**
 * Formatadores de telefone e nome para importação de contatos.
 * 
 * Regras de formatação do telefone para WhatsApp:
 * 1. Remover todos os caracteres não numéricos.
 * 2. Prefixar com "55" se não começar com "55".
 * 3. Identificar DDD (2 dígitos após o 55, entre 11 e 99).
 * 4. Extrair os 8 últimos dígitos (o número real).
 * 5. Inserir "9" obrigatoriamente antes dos 8 últimos dígitos.
 * 6. Montar: 55 + DDD + 9 + últimos 8 dígitos.
 * 7. Adicionar sufixo @s.whatsapp.net.
 * 
 * Formato final: 55DD9XXXXXXXX@s.whatsapp.net
 * Regex válido: ^55\d{2}9\d{8}@s\.whatsapp\.net$
 */

/**
 * Formata um número de telefone para o padrão WhatsApp brasileiro.
 * Suporta diversos formatos de entrada:
 * - Com/sem código do país (+55, 55, 0055, ou sem)
 * - Com/sem o nono dígito
 * - Com formatações variadas: parênteses, hífens, espaços, pontos
 * - Com zeros à esquerda extras
 * 
 * @param phone - O número de telefone em qualquer formato.
 * @returns O número formatado ou null se inválido.
 */
export function formatWhatsAppPhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // 1. LIMPEZA INICIAL - Remover tudo que não for número
  let digits = phone.replace(/\D/g, '');

  // Se não sobrou nenhum dígito, descartar
  if (!digits || digits.length === 0) {
    return null;
  }

  // 2. REMOVER ZEROS À ESQUERDA (exceto quando forem parte do número)
  // Ex: 0099-9137-2552 -> 99-9137-2552
  while (digits.startsWith('0') && digits.length > 10) {
    digits = digits.substring(1);
  }

  // 3. REMOVER CÓDIGO DO PAÍS (55) SE PRESENTE
  // Pode vir como 55, 055, 0055, etc
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.substring(2);
  }

  // 4. VALIDAÇÃO DO COMPRIMENTO
  // Agora esperamos: DDD(2) + número(8 ou 9 dígitos) = 10 ou 11 dígitos
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  // 5. IDENTIFICAÇÃO DO DDD - Os 2 primeiros dígitos
  const ddd = digits.substring(0, 2);
  const dddNum = parseInt(ddd, 10);

  // Validar DDD: deve estar entre 11 e 99
  if (isNaN(dddNum) || dddNum < 11 || dddNum > 99) {
    return null;
  }

  // 6. EXTRAÇÃO E NORMALIZAÇÃO DO NÚMERO
  let numeroBase = digits.substring(2); // Remove o DDD

  // Se tem 9 dígitos, verificar se começa com 9
  if (numeroBase.length === 9) {
    if (!numeroBase.startsWith('9')) {
      // Número de 9 dígitos mas não começa com 9 - inválido para celular
      return null;
    }
  } else if (numeroBase.length === 8) {
    // Número de 8 dígitos - adicionar o 9
    numeroBase = '9' + numeroBase;
  } else {
    return null;
  }

  // 7. MONTAGEM FINAL - 55 + DDD + número de 9 dígitos
  const formattedNumber = '55' + ddd + numeroBase;

  // Validar que o número final tem exatamente 13 dígitos
  if (formattedNumber.length !== 13) {
    return null;
  }

  // 8. SUFIXO WHATSAPP
  const finalResult = formattedNumber + '@s.whatsapp.net';

  // Validação final com regex
  const regex = /^55\d{2}9\d{8}@s\.whatsapp\.net$/;
  if (!regex.test(finalResult)) {
    return null;
  }

  return finalResult;
}

/**
 * Preposições e artigos que devem permanecer em minúsculas.
 */
const LOWERCASE_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos',
  'e', 'em', 'na', 'no', 'nas', 'nos',
  'para', 'por', 'com', 'sem',
  'a', 'o', 'as', 'os',
  'ao', 'aos', 'à', 'às'
]);

/**
 * Formata um nome com a primeira letra de cada palavra em maiúscula,
 * exceto preposições e artigos.
 * @param name - O nome a ser formatado.
 * @returns O nome formatado.
 */
export function formatName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Limpar espaços extras
  const cleanedName = name.trim().replace(/\s+/g, ' ');

  if (!cleanedName) {
    return '';
  }

  const words = cleanedName.toLowerCase().split(' ');

  const formattedWords = words.map((word, index) => {
    // Se for uma preposição/artigo e não for a primeira palavra, manter minúscula
    if (index > 0 && LOWERCASE_WORDS.has(word)) {
      return word;
    }

    // Capitalizar a primeira letra
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return formattedWords.join(' ');
}

/**
 * Interface para um contato parseado de um arquivo.
 */
export interface ParsedContact {
  name: string;
  phone: string;
  originalPhone: string;
  isValid: boolean;
  error?: string;
}

/**
 * Parseia uma linha de texto que contém nome e telefone.
 * Suporta formatos: "Nome;Telefone" ou "Nome,Telefone" ou "Nome\tTelefone"
 * Prioriza ponto-e-vírgula pois é o padrão do Excel Brasil.
 * @param line - A linha de texto.
 * @returns O contato parseado com informações de validação.
 */
export function parseContactLine(line: string): ParsedContact | null {
  if (!line || typeof line !== 'string') {
    return null;
  }

  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return null;
  }

  // Tentar diferentes separadores na ordem de prioridade para Brasil
  // 1. Tab (mais confiável pois raramente aparece em dados)
  // 2. Ponto-e-vírgula (padrão Excel Brasil)
  // 3. Vírgula (padrão internacional)
  let parts: string[] = [];

  // Verificar qual separador divide a linha de forma válida
  const separators = ['\t', ';', ','];

  for (const sep of separators) {
    if (trimmedLine.includes(sep)) {
      const testParts = trimmedLine.split(sep).map(p => p.trim());
      // Precisamos de pelo menos 2 partes (nome e telefone)
      if (testParts.length >= 2 && testParts[0] && testParts[1]) {
        parts = testParts;
        break;
      }
    }
  }

  // Se nenhum separador funcionou, tentar identificar o telefone por regex
  if (parts.length < 2) {
    // Procurar por um padrão de telefone na linha
    // Telefone pode estar no início ou final
    const phonePattern = /[\d\s\-\(\)\+\.]{8,}/g;
    const matches = trimmedLine.match(phonePattern);

    if (matches && matches.length > 0) {
      // Pegar o maior match como telefone
      const phone = matches.reduce((a, b) => a.length > b.length ? a : b).trim();
      const name = trimmedLine.replace(phone, '').replace(/[,;]/, '').trim();

      if (name && phone) {
        parts = [name, phone];
      }
    }
  }

  // Se ainda não temos partes válidas
  if (parts.length < 2 || !parts[1]) {
    return {
      name: parts[0] || trimmedLine,
      phone: '',
      originalPhone: '',
      isValid: false,
      error: 'Formato não reconhecido'
    };
  }

  const rawName = parts[0];
  const rawPhone = parts[1];

  // Limpar caracteres especiais/invisíveis do nome
  const cleanedRawName = rawName.replace(/[^\p{L}\p{N}\s'-]/gu, '').trim();

  console.log('[parseContactLine] rawName:', rawName, '-> cleanedRawName:', cleanedRawName, '| rawPhone:', rawPhone);

  const formattedName = formatName(cleanedRawName);
  const formattedPhone = formatWhatsAppPhone(rawPhone);

  if (!formattedPhone) {
    return {
      name: formattedName,
      phone: '',
      originalPhone: rawPhone,
      isValid: false,
      error: 'Formato não reconhecido'
    };
  }

  return {
    name: formattedName,
    phone: formattedPhone,
    originalPhone: rawPhone,
    isValid: true
  };
}

/**
 * Parseia o conteúdo de um arquivo CSV ou texto.
 * @param content - O conteúdo do arquivo.
 * @param hasHeader - Se a primeira linha é um cabeçalho.
 * @returns Lista de contatos parseados.
 */
export function parseContactsFile(content: string, hasHeader: boolean = true): ParsedContact[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim());

  // Pular cabeçalho se indicado
  const startIndex = hasHeader ? 1 : 0;

  const contacts: ParsedContact[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parsed = parseContactLine(lines[i]);
    if (parsed) {
      contacts.push(parsed);
    }
  }

  return contacts;
}
