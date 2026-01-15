import React, { useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { LogIn, Mail, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await signIn(email, password);
            if (error) setError(error.message);
        } catch (err: any) {
            setError('Falha na autenticação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
            {/* Decorative Background Elements */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-sm z-10"
            >
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-600/30">
                        <span className="text-white text-4xl font-black">N</span>
                    </div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] mb-2 tracking-tight">NERO</h1>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Mobile PWA Experience</p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-[40px] p-10 shadow-premium backdrop-blur-sm animate-slide-up">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em] ml-1">E-mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="w-full bg-[var(--bg-main)]/50 border border-[var(--border-base)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] placeholder:text-zinc-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-inner"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em] ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--bg-main)]/50 border border-[var(--border-base)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] placeholder:text-zinc-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-inner"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-sm font-medium"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    <span>Entrar</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-10 flex items-center justify-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span>Acesso Ultra Seguro</span>
                </div>
            </motion.div>
        </div>
    );
};
