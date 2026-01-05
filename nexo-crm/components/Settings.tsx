import React, { useState, useRef } from 'react';
import { User, Camera, Lock, User as UserIcon, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import UserAvatar from './UserAvatar';

interface SettingsProps {
    user: any;
    onUpdate: () => void;
}

const translateError = (msg: string) => {
    if (msg.toLowerCase().includes('password should be different')) {
        return 'A nova senha deve ser diferente da senha atual.';
    }
    if (msg.toLowerCase().includes('invalid login credentials')) {
        return 'Credenciais de login inválidas.';
    }
    if (msg.toLowerCase().includes('email not confirmed')) {
        return 'E-mail ainda não confirmado.';
    }
    return msg;
};

const Settings: React.FC<SettingsProps> = ({ user, onUpdate }) => {
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const { error } = await supabase.auth.updateUser({
            data: { full_name: fullName }
        });

        if (error) {
            setStatus({ type: 'error', message: translateError(error.message) });
        } else {
            setStatus({ type: 'success', message: 'Perfil atualizado com sucesso!' });
            onUpdate();
        }
        setLoading(false);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'As senhas não coincidem' });
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            setStatus({ type: 'error', message: translateError(error.message) });
        } else {
            setStatus({ type: 'success', message: 'Senha redefinida com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    return (
        <div className="p-8 h-full overflow-y-auto space-y-8 custom-scrollbar">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
                <p className="text-zinc-500 text-sm">Gerencie seu perfil e segurança da conta.</p>
            </header>

            {status && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-medium">{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Info */}
                <section className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
                    <h2 className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={16} /> Informações do Perfil
                    </h2>

                    <div className="flex flex-col items-center mb-10">
                        <UserAvatar
                            name={fullName}
                            email={user?.email}
                            size="xl"
                            className="border-4 border-zinc-800/50 shadow-2xl"
                        />
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Nome Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="Seu nome completo"
                                required
                            />
                        </div>
                        <div className="space-y-2 opacity-60">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">E-mail (Não editável)</label>
                            <input
                                type="text"
                                value={user?.email}
                                readOnly
                                className="w-full px-5 py-3.5 bg-zinc-900/20 border border-transparent rounded-2xl text-sm cursor-not-allowed"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </form>
                </section>

                {/* Security */}
                <section className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
                    <h2 className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                        <Lock size={16} /> Segurança
                    </h2>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-sm font-bold transition-all border border-zinc-700 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Lock size={18} /> {loading ? 'Atualizando...' : 'Redefinir Senha'}
                        </button>
                    </form>

                    <div className="mt-10 p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2rem]">
                        <h3 className="text-xs font-bold text-rose-500 mb-2 uppercase tracking-tighter flex items-center gap-1">
                            <AlertCircle size={14} /> Zona de Risco
                        </h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
                            Ao sair da conta em todos os dispositivos, você precisará fazer login novamente com sua nova senha.
                        </p>
                        <button className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors underline">
                            Sair em todos os dispositivos
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
