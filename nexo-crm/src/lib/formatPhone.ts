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

    // Se começar com 55, remove (código do Brasil)
    if (cleaned.startsWith('55')) {
        cleaned = cleaned.substring(2);
    }

    // Se ainda tiver mais de 11 dígitos, pode ser que tenha ficado um 5 extra
    // (ex: 5599991372552 após remover 55 = 99991372552 que está correto)
    // Mas se tiver 12+ dígitos, pega os últimos 11
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
    if (cleaned.length === 10) {
        const ddd = cleaned.substring(0, 2);
        const firstPart = cleaned.substring(2, 6);  // 4 dígitos
        const secondPart = cleaned.substring(6, 10); // 4 dígitos
        return `(${ddd}) ${firstPart}-${secondPart}`;
    }

    // Se tiver 9 dígitos (só o número com 9)
    if (cleaned.length === 9) {
        const firstPart = cleaned.substring(0, 5);
        const secondPart = cleaned.substring(5, 9);
        return `${firstPart}-${secondPart}`;
    }

    // Se tiver 8 dígitos (número fixo)
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
