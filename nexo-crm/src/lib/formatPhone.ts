/**
 * Formata número de telefone brasileiro para o padrão (XX) 9XXXX-XXXX
 * Remove: +, 55, @s.whatsapp.net, @c.us, caracteres especiais
 * 
 * Exemplos de entrada:
 * - 5511999999999
 * - +5511999999999
 * - 11999999999
 * - 5511999999999@s.whatsapp.net
 * - 5511999999999@c.us
 * - +55 (11) 99999-9999
 * 
 * Saída: (11) 99999-9999
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
    if (!phone) return '';

    // Remove tudo que não é número
    let cleaned = phone.replace(/\D/g, '');

    // Remove o prefixo 55 do Brasil se existir no início
    if (cleaned.startsWith('55') && cleaned.length > 11) {
        cleaned = cleaned.substring(2);
    }

    // Se ainda for muito longo (tem mais de 11 dígitos), pega os últimos 11
    if (cleaned.length > 11) {
        cleaned = cleaned.slice(-11);
    }

    // Se tiver 11 dígitos: DDD (2) + 9 (1) + número (8)
    if (cleaned.length === 11) {
        const ddd = cleaned.substring(0, 2);
        const firstPart = cleaned.substring(2, 7);  // 5 dígitos (com o 9)
        const secondPart = cleaned.substring(7, 11); // 4 dígitos
        return `(${ddd}) ${firstPart}-${secondPart}`;
    }

    // Se tiver 10 dígitos (sem o 9): DDD (2) + número (8)
    // Provavelmente é celular sem o 9 - adiciona o 9
    if (cleaned.length === 10) {
        const ddd = cleaned.substring(0, 2);
        const numero = cleaned.substring(2);
        // Adiciona o 9 para celulares
        const firstPart = '9' + numero.substring(0, 4);  // 9 + 4 dígitos
        const secondPart = numero.substring(4, 8); // 4 dígitos
        return `(${ddd}) ${firstPart}-${secondPart}`;
    }

    // Se tiver 9 dígitos (só o número sem DDD)
    if (cleaned.length === 9) {
        const firstPart = cleaned.substring(0, 5);  // 5 dígitos (com o 9)
        const secondPart = cleaned.substring(5, 9); // 4 dígitos
        return `${firstPart}-${secondPart}`;
    }

    // Se tiver 8 dígitos (número fixo sem DDD)
    if (cleaned.length === 8) {
        const firstPart = cleaned.substring(0, 4);
        const secondPart = cleaned.substring(4, 8);
        return `${firstPart}-${secondPart}`;
    }

    // Se não se encaixar em nenhum padrão, retorna o número limpo
    return cleaned || phone;
}

/**
 * Formata número de telefone de forma curta para exibição em cards
 * Retorna apenas o número formatado ou mensagem padrão se não houver telefone
 */
export function formatPhoneShort(phone: string | null | undefined, fallback: string = ''): string {
    if (!phone) return fallback;
    return formatPhoneNumber(phone);
}
