import React, { useState, useEffect } from 'react';
import { User, Lock, User as UserIcon, Save, CheckCircle, AlertCircle, Users, Plus, Trash2, Mail, Eye, EyeOff, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/lib/AuthProvider';
import { tenantService, TenantUser } from '../src/lib/tenantService';
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
    if (msg.toLowerCase().includes('user already registered')) {
        return 'Este e-mail já está registrado.';
    }
    return msg;
};

const Settings: React.FC<SettingsProps> = ({ user, onUpdate }) => {
    const { userType, userInfo } = useAuth();
    const [activeTab, setActiveTab] = useState<'perfil' | 'seguranca' | 'equipe'>('perfil');
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Equipe states
    const [tenantMembers, setTenantMembers] = useState<TenantUser[]>([]);
    const [maxMembers, setMaxMembers] = useState(0);
    const [loadingEquipe, setLoadingEquipe] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMember, setNewMember] = useState({ nome: '', email: '', senha: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Modal de confirmação
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning';
    }>({ show: false, title: '', message: '', onConfirm: () => { }, variant: 'danger' });

    // Carregar maxMembers na inicialização para determinar se mostra aba Equipe
    useEffect(() => {
        if (userInfo?.isOwnerOrAdmin) {
            tenantService.getMaxUsers().then(max => setMaxMembers(max));
        }
    }, [userInfo]);

    useEffect(() => {
        if (activeTab === 'equipe' && userInfo?.isOwnerOrAdmin) {
            loadEquipe();
        }
    }, [activeTab, userInfo]);

    const loadEquipe = async () => {
        setLoadingEquipe(true);
        const [list, max] = await Promise.all([
            tenantService.listAtendentes(),
            tenantService.getMaxUsers()
        ]);
        setTenantMembers(list);
        setMaxMembers(max);
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

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const result = await tenantService.createTenantMember(
            newMember.nome,
            newMember.email,
            newMember.senha,
            'atendente'
        );

        if (result.success) {
            setStatus({ type: 'success', message: 'Atendente cadastrado com sucesso!' });
            setNewMember({ nome: '', email: '', senha: '' });
            setShowAddForm(false);
            loadEquipe();
        } else {
            setStatus({ type: 'error', message: result.error || 'Erro ao cadastrar atendente' });
        }
        setLoading(false);
    };



    const handleDeleteMember = (id: string) => {
        setConfirmModal({
            show: true,
            title: 'Excluir Atendente',
            message: 'Tem certeza que deseja excluir este atendente? Esta ação não pode ser desfeita.',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, show: false }));
                setLoading(true);
                const success = await tenantService.deleteMember(id);
                if (success) {
                    setStatus({ type: 'success', message: 'Atendente excluído com sucesso!' });
                    loadEquipe();
                } else {
                    setStatus({ type: 'error', message: 'Erro ao excluir atendente.' });
                }
                setLoading(false);
            }
        });
    };

    const isAdmin = userInfo?.isOwnerOrAdmin || userType === 'admin';

    // Só mostra aba Equipe se for admin E tiver slots de atendentes disponíveis
    const showEquipeTab = isAdmin && maxMembers > 0;

    const tabs = [
        { id: 'perfil' as const, label: 'Perfil', icon: UserIcon },
        { id: 'seguranca' as const, label: 'Segurança', icon: Lock },
        ...(showEquipeTab ? [{ id: 'equipe' as const, label: 'Equipe', icon: Users }] : [])
    ];

    return (
        <>
            {/* Modal de Confirmação Personalizado */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a1a1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full ${confirmModal.variant === 'danger' ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
                                    <AlertTriangle size={24} className={confirmModal.variant === 'danger' ? 'text-rose-500' : 'text-amber-500'} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                        {confirmModal.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        {confirmModal.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-2xl">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-all ${confirmModal.variant === 'danger'
                                    ? 'bg-rose-500 hover:bg-rose-600'
                                    : 'bg-amber-500 hover:bg-amber-600'
                                    }`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                {activeTab === 'equipe' && showEquipeTab && (
                    <div className="space-y-6">
                        {/* Header com contador */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-semibold">Minha Equipe</h2>
                                <span className="text-sm px-3 py-1 bg-zinc-800 rounded-full text-zinc-400">
                                    {tenantMembers.length} / {maxMembers} atendentes
                                </span>
                            </div>
                            {tenantMembers.length < maxMembers && (
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
                                <form onSubmit={handleAddMember} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Nome</label>
                                            <input
                                                type="text"
                                                value={newMember.nome}
                                                onChange={(e) => setNewMember({ ...newMember, nome: e.target.value })}
                                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                placeholder="Nome do atendente"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">E-mail</label>
                                            <input
                                                type="email"
                                                value={newMember.email}
                                                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
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
                                                    value={newMember.senha}
                                                    onChange={(e) => setNewMember({ ...newMember, senha: e.target.value })}
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
                                            onClick={() => { setShowAddForm(false); setNewMember({ nome: '', email: '', senha: '' }); }}
                                            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </section>
                        )}

                        {/* Lista de membros */}
                        {loadingEquipe ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : tenantMembers.length === 0 ? (
                            <div className="text-center py-12 bg-zinc-900/20 rounded-2xl border border-zinc-800/30">
                                <Users size={48} className="mx-auto text-zinc-700 mb-4" />
                                <p className="text-zinc-500">Nenhum atendente cadastrado.</p>
                                {maxMembers > 0 && (
                                    <p className="text-zinc-600 text-sm mt-2">Você pode ter até {maxMembers} atendentes.</p>
                                )}
                                {maxMembers === 0 && (
                                    <p className="text-amber-500/70 text-sm mt-2">Entre em contato para liberar slots de atendentes.</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tenantMembers.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <UserAvatar name={member.nome} size="md" className="border-2 border-zinc-800" />
                                            <div>
                                                <h4 className="text-sm font-semibold text-zinc-200">{member.nome}</h4>
                                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Mail size={10} /> {member.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteMember(member.id)}
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
        </>
    );
};

export default Settings;
