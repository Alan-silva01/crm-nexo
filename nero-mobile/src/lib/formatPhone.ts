export function formatPhoneNumber(phone: string | null | undefined): string {
    if (!phone) return '';

    // Remove tudo que não é número
    let cleaned = phone.replace(/\D/g, '');

    // Se começar com 55, remove (código do Brasil)
    if (cleaned.startsWith('55')) {
        cleaned = cleaned.substring(2);
    }

    // Se ainda tiver mais de 11 dígitos, pega os últimos 11
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

    // Casos curtos (como 2552), retorna o que sobrou
    if (cleaned.length <= 4 && phone.length > 8) {
        // Se após "limpar" sobrou pouco e o original era longo, 
        // talvez a limpeza tenha sido agressiva demais ou o dado esteja corrompido.
        // Retornamos algo mais útil do original
        return phone.replace('@s.whatsapp.net', '').replace('@c.us', '');
    }

    return cleaned || phone;
}
