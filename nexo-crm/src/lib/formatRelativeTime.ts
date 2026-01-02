/**
 * Returns a human-readable relative time string in Portuguese
 * e.g., "há 5 min", "há 2 dias", "há 1 mês"
 */
export const formatRelativeTime = (dateString: string | undefined | null): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
        return 'agora';
    } else if (diffMinutes < 60) {
        return `há ${diffMinutes} min`;
    } else if (diffHours < 24) {
        return diffHours === 1 ? 'há 1 hora' : `há ${diffHours} horas`;
    } else if (diffDays < 30) {
        return diffDays === 1 ? 'há 1 dia' : `há ${diffDays} dias`;
    } else if (diffMonths < 12) {
        return diffMonths === 1 ? 'há 1 mês' : `há ${diffMonths} meses`;
    } else {
        return diffYears === 1 ? 'há 1 ano' : `há ${diffYears} anos`;
    }
};
