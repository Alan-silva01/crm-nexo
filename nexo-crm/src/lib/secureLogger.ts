// Logger seguro - só loga em desenvolvimento, nunca em produção
// Evita exposição de dados sensíveis no DevTools

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const secureLog = (...args: any[]) => {
    if (isDev) {
        console.log(...args);
    }
};

export const secureWarn = (...args: any[]) => {
    if (isDev) {
        console.warn(...args);
    }
};

export const secureError = (...args: any[]) => {
    // Erros sempre logamos, mas sem dados sensíveis
    if (isDev) {
        console.error(...args);
    } else {
        // Em produção, só loga a mensagem sem detalhes
        console.error('[Error occurred - check server logs]');
    }
};
