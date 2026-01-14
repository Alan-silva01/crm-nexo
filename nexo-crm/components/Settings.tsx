import React, { useState, useEffect } from 'react';
import { User, Lock, User as UserIcon, Save, CheckCircle, AlertCircle, Users, Plus, Trash2, ToggleLeft, ToggleRight, Mail, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/lib/AuthProvider';
import { atendentesService, Atendente } from '../src/lib/atendentesService';
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
    if (msg.toLowerCase().includes('limite')) {
        return msg;
    }
    return msg;
};

const Settings: React.FC<SettingsProps> = ({ user, onUpdate }) => {
    const { userType } = useAuth();
    const [activeTab, setActiveTab] = useState<'perfil' | 'seguranca' | 'equipe'>('perfil');
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Equipe states
    const [atendentes, setAtendentes] = useState<Atendente[]>([]);
    const [maxAtendentes, setMaxAtendentes] = useState(0);
    const [loadingEquipe, setLoadingEquipe] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAtendente, setNewAtendente] = useState({ nome: '', email: '', senha: '' });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (activeTab === 'equipe' && userType === 'admin') {
            loadEquipe();
        }
    }, [activeTab, userType]);

    const loadEquipe = async () => {
        setLoadingEquipe(true);
        const [list, max] = await Promise.all([
            atendentesService.listAtendentes(),
            atendentesService.getMaxAtendentes()
        ]);
        setAtendentes(list);
        setMaxAtendentes(max);
        setLoadingEquipe(false);
    };

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

    const handleAddAtendente = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const result = await atendentesService.createAtendente(
            newAtendente.nome,
            newAtendente.email,
            newAtendente.senha
        );

        if (result.success) {
            setStatus({ type: 'success', message: 'Atendente cadastrado com sucesso!' });
            setNewAtendente({ nome: '', email: '', senha: '' });
            setShowAddForm(false);
            loadEquipe();
        } else {
            setStatus({ type: 'error', message: result.error || 'Erro ao cadastrar atendente' });
        }
        setLoading(false);
    };

    const handleToggleAtendente = async (id: string, ativo: boolean) => {
        await atendentesService.toggleAtendente(id, !ativo);
        loadEquipe();
    };

    const handleDeleteAtendente = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este atendente?')) {
            await atendentesService.deleteAtendente(id);
            loadEquipe();
        }
    };

    const tabs = [
        { id: 'perfil' as const, label: 'Perfil', icon: UserIcon },
        { id: 'seguranca' as const, label: 'Segurança', icon: Lock },
        ...(userType === 'admin' ? [{ id: 'equipe' as const, label: 'Equipe', icon: Users }] : [])
    ];

    return (
        <div className="p-8 h-full overflow-y-auto space-y-8 custom-scrollbar">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
                <p className="text-zinc-500 text-sm">Gerencie seu perfil e segurança da conta.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-800/50 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                            ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {status && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-medium">{status.message}</span>
                </div>
            )}

            {/* Perfil Tab */}
            {activeTab === 'perfil' && (
                <section className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] max-w-xl">
                    <h2 className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={16} /> Informações do Perfil
                    </h2>
                    <div className="flex flex-col items-center mb-10">
                        <UserAvatar name={fullName} email={user?.email} size="xl" className="border-4 border-zinc-800/50 shadow-2xl" />
                    </div>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Nome Completo</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Seu nome completo" required />
                        </div>
                        <div className="space-y-2 opacity-60">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">E-mail (Não editável)</label>
                            <input type="text" value={user?.email} readOnly className="w-full px-5 py-3.5 bg-zinc-900/20 border border-transparent rounded-2xl text-sm cursor-not-allowed" />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </form>
                </section>
            )}

            {/* Segurança Tab */}
            {activeTab === 'seguranca' && (
                <section className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] max-w-xl">
                    <h2 className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                        <Lock size={16} /> Segurança
                    </h2>
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Nova Senha</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="••••••••" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Confirmar Nova Senha</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="••••••••" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-sm font-bold transition-all border border-zinc-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            <Lock size={18} /> {loading ? 'Atualizando...' : 'Redefinir Senha'}
                        </button>
                    </form>
                </section>
            )}

            {/* Equipe Tab */}
            {activeTab === 'equipe' && userType === 'admin' && (
                <div className="space-y-6">
                    {/* Header com contador */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-semibold">Minha Equipe</h2>
                            <span className="text-sm px-3 py-1 bg-zinc-800 rounded-full text-zinc-400">
                                {atendentes.length} / {maxAtendentes} atendentes
                            </span>
                        </div>
                        {atendentes.length < maxAtendentes && (
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all"
                            >
                                <Plus size={16} /> Novo Atendente
                            </button>
                        )}
                    </div>

                    {/* Formulário de adicionar */}
                    {showAddForm && (
                        <section className="bg-[#0c0c0e] border border-indigo-500/30 p-6 rounded-2xl">
                            <h3 className="text-sm font-bold text-zinc-300 mb-4">Cadastrar Novo Atendente</h3>
                            <form onSubmit={handleAddAtendente} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Nome</label>
                                        <input
                                            type="text"
                                            value={newAtendente.nome}
                                            onChange={(e) => setNewAtendente({ ...newAtendente, nome: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Nome do atendente"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">E-mail</label>
                                        <input
                                            type="email"
                                            value={newAtendente.email}
                                            onChange={(e) => setNewAtendente({ ...newAtendente, email: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="email@empresa.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Senha</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={newAtendente.senha}
                                                onChange={(e) => setNewAtendente({ ...newAtendente, senha: e.target.value })}
                                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-10"
                                                placeholder="••••••••"
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Cadastrando...' : 'Cadastrar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddForm(false); setNewAtendente({ nome: '', email: '', senha: '' }); }}
                                        className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    {/* Lista de atendentes */}
                    {loadingEquipe ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : atendentes.length === 0 ? (
                        <div className="text-center py-12 bg-zinc-900/20 rounded-2xl border border-zinc-800/30">
                            <Users size={48} className="mx-auto text-zinc-700 mb-4" />
                            <p className="text-zinc-500">Nenhum atendente cadastrado.</p>
                            {maxAtendentes > 0 && (
                                <p className="text-zinc-600 text-sm mt-2">Você pode ter até {maxAtendentes} atendentes.</p>
                            )}
                            {maxAtendentes === 0 && (
                                <p className="text-amber-500/70 text-sm mt-2">Entre em contato para liberar slots de atendentes.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {atendentes.map(atendente => (
                                <div
                                    key={atendente.id}
                                    className={`flex items-center justify-between p-4 bg-[#0c0c0e] border rounded-2xl transition-all
                                        ${atendente.ativo ? 'border-zinc-800/50' : 'border-zinc-800/30 opacity-60'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <UserAvatar name={atendente.nome} size="md" className="border-2 border-zinc-800" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-200">{atendente.nome}</h4>
                                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                <Mail size={10} /> {atendente.email}
                                            </p>
                                        </div>
                                        {!atendente.ativo && (
                                            <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full font-bold">
                                                INATIVO
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleAtendente(atendente.id, atendente.ativo)}
                                            className={`p-2 rounded-lg transition-all ${atendente.ativo ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}
                                            title={atendente.ativo ? 'Desativar' : 'Ativar'}
                                        >
                                            {atendente.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAtendente(atendente.id)}
                                            className="p-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Settings;
