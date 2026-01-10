import React, { useState, useEffect } from 'react';
import {
    X,
    MessageSquare,
    Phone,
    Mail,
    Clock,
    Calendar,
    User,
    GitCommit,
    Car,
    MoreHorizontal,
    Users,
    Layout,
    MapPin,
    Scale,
    Stethoscope,
    ShoppingBag,
    DollarSign
} from 'lucide-react';
import { Lead, LeadColumnHistory, getLeadDisplayName } from '../types';
import { leadsService } from '../src/lib/leadsService';
import { formatPhoneNumber } from '../src/lib/formatPhone';
import { formatRelativeTime } from '../src/lib/formatRelativeTime';
import LetterAvatar from './LetterAvatar';

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    historyCache?: LeadColumnHistory[];
    onViewConversation: () => void;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ isOpen, onClose, lead, historyCache = [], onViewConversation }) => {
    const [history, setHistory] = useState<LeadColumnHistory[]>(historyCache);
    const [loading, setLoading] = useState(false);

    // Sync with cache if it changes
    useEffect(() => {
        setHistory(historyCache);
    }, [historyCache]);

    useEffect(() => {
        // Only fetch if cache is empty to ensure we have something, 
        // OR we can just rely on the parent providing it.
        // For robustness, let's only fetch if history is empty and modal is open.
        if (isOpen && lead && historyCache.length === 0) {
            setLoading(true);
            leadsService.fetchHistory(lead.id).then(data => {
                setHistory(data as LeadColumnHistory[]);
                setLoading(false);
            });
        }
    }, [isOpen, lead, historyCache.length]);

    if (!isOpen || !lead) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-[#0c0c0e] w-full max-w-lg rounded-[3rem] border border-zinc-800/30 shadow-[20px_20px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative h-28 bg-gradient-to-b from-indigo-500/10 to-transparent border-b border-zinc-200 dark:border-zinc-800/30 shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-3 bg-white dark:bg-[#0c0c0e] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-full transition-all z-10 shadow-lg dark:shadow-[4px_4px_8px_#050506,-4px_-4px_8px_#131316] active:scale-90 border border-zinc-100 dark:border-zinc-800/50"
                        title="Fechar (Esc)"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute -bottom-8 left-8">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-white dark:bg-[#0c0c0e] p-1 shadow-xl overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-800/50">
                            <LetterAvatar name={getLeadDisplayName(lead)} size="xl" className="rounded-2xl" />
                        </div>
                    </div>
                </div>

                {/* Content area with internal scroll */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-12 pb-8 px-8 min-h-0 bg-white dark:bg-[#0c0c0e]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:bg-gradient-to-r dark:from-white dark:to-zinc-500 dark:bg-clip-text dark:text-transparent tracking-tight mb-2 uppercase">{getLeadDisplayName(lead)}</h2>
                            <span className="px-3 py-1 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] rounded-lg border border-indigo-500/10 dark:border-indigo-500/20">
                                {lead.status}
                            </span>
                        </div>

                        <button
                            onClick={onViewConversation}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <MessageSquare size={16} />
                            <span>Ver conversa</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-[2rem] bg-zinc-50 dark:bg-[#0c0c0e] shadow-inner dark:shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border border-zinc-100 dark:border-transparent hover:border-indigo-100 dark:hover:border-zinc-800/30 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-1.5 bg-emerald-500/5 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 dark:border-emerald-500/20">
                                        <Phone size={14} />
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.15em]">Telefone</span>
                                </div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-300">{lead.phone ? formatPhoneNumber(lead.phone) : 'Não informado'}</p>
                            </div>

                            <div className="p-5 rounded-[2rem] bg-zinc-50 dark:bg-[#0c0c0e] shadow-inner dark:shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border border-zinc-100 dark:border-transparent hover:border-indigo-100 dark:hover:border-zinc-800/30 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-1.5 bg-blue-500/5 rounded-lg text-blue-600 dark:text-blue-400 border border-blue-500/10 dark:border-blue-500/20">
                                        <Mail size={14} />
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.15em]">E-mail</span>
                                </div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-300 truncate">{lead.email || 'Não informado'}</p>
                            </div>
                        </div>

                        {/* Dados Dinâmicos na Modal */}
                        {lead.dados && Object.keys(lead.dados).length > 0 && (() => {
                            const d = lead.dados as Record<string, any>;
                            const hasValue = (val: any) => val !== null && val !== undefined && String(val).trim() !== '';

                            // Campos para pular (já estão no cabeçalho ou são reservados)
                            const skipFields = ['nome', 'name', 'email', 'whatsapp', 'phone', 'empresa', 'company_name', 'id', 'observacoes', 'observação', 'status_venda', 'created_at', 'updated_at', 'agendamentos', 'consultas'];

                            // Mapeamento de ícones por palavra-chave
                            const getIcon = (key: string) => {
                                const k = key.toLowerCase();
                                if (k.includes('veiculo') || k.includes('carro') || k.includes('modelo')) return { icon: Car, color: 'text-amber-500 dark:text-amber-400' };
                                if (k.includes('placa')) return { icon: MoreHorizontal, color: 'text-zinc-500 dark:text-zinc-400' };
                                if (k.includes('cidade') || k.includes('bairro') || k.includes('endereco') || k.includes('local')) return { icon: MapPin, color: 'text-emerald-500 dark:text-emerald-400' };
                                if (k.includes('usuario') || k.includes('tipo') || k.includes('genero') || k.includes('uso') || k.includes('area')) return { icon: Users, color: 'text-blue-500 dark:text-blue-400' };
                                if (k.includes('preocupacao') || k.includes('ajuda') || k.includes('problema') || k.includes('desafio')) return { icon: Phone, color: 'text-rose-500 dark:text-rose-400' };
                                if (k.includes('processo') || k.includes('direito') || k.includes('justiça')) return { icon: Scale, color: 'text-indigo-500 dark:text-indigo-400' };
                                if (k.includes('clinica') || k.includes('medico') || k.includes('saude') || k.includes('paciente')) return { icon: Stethoscope, color: 'text-emerald-500 dark:text-emerald-400' };
                                if (k.includes('loja') || k.includes('venda') || k.includes('produto') || k.includes('compra')) return { icon: ShoppingBag, color: 'text-amber-500 dark:text-amber-400' };
                                if (k.includes('faturamento') || k.includes('valor') || k.includes('preco') || k.includes('preço')) return { icon: DollarSign, color: 'text-emerald-500 dark:text-emerald-400' };
                                return { icon: Layout, color: 'text-indigo-500 dark:text-indigo-400' };
                            };

                            // Formatar Label (snake_case to Title Case)
                            const formatLabel = (key: string) => {
                                return key
                                    .split('_')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');
                            };

                            const visibleKeys = Object.keys(d).filter(key => {
                                return !skipFields.includes(key.toLowerCase()) && hasValue(d[key]);
                            });

                            const obs = hasValue(d.observacoes) ? String(d.observacoes) : (hasValue(d.observação) ? String(d.observação) : null);
                            const hasConsultas = d.consultas && typeof d.consultas === 'object' && Object.keys(d.consultas).length > 0;
                            const hasAgendamentos = d.agendamentos && typeof d.agendamentos === 'object' && Object.keys(d.agendamentos).length > 0;

                            if (visibleKeys.length === 0 && !obs && !hasConsultas) return null;

                            return (
                                <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/20 shadow-inner dark:shadow-none border border-zinc-100 dark:border-zinc-800/30">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-zinc-500/10 rounded-lg text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800/50">
                                                <Layout size={14} />
                                            </div>
                                            <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.15em]">Dados do Lead</span>
                                        </div>
                                        {hasConsultas && (
                                            <span className="text-[9px] px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg font-black uppercase tracking-widest border border-emerald-500/20">
                                                Já fez consultas conosco
                                            </span>
                                        )}
                                    </div>

                                    {visibleKeys.length > 0 && (
                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            {visibleKeys.map(key => {
                                                const config = getIcon(key);
                                                const value = d[key];

                                                let displayValue = '';
                                                if (typeof value === 'object' && value !== null) {
                                                    const keys = Object.keys(value);
                                                    displayValue = keys.length > 0 ? `${keys.length} itens registrados` : 'Vazio';
                                                } else {
                                                    displayValue = String(value);
                                                }

                                                return (
                                                    <div key={key} className="flex flex-col gap-1.5 overflow-hidden">
                                                        <div className="flex items-center gap-2">
                                                            <config.icon size={12} className={config.color} />
                                                            <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate">{formatLabel(key)}</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 pl-5 leading-tight truncate" title={displayValue}>
                                                            {displayValue}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {obs && (
                                        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800/40">
                                            <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">Observações Detalhadas</span>
                                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed italic pl-1 border-l-2 border-indigo-500/20">
                                                "{obs}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="p-5 rounded-[2rem] bg-zinc-50 dark:bg-[#0c0c0e] shadow-inner dark:shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border border-zinc-100 dark:border-transparent hover:border-indigo-100 dark:hover:border-zinc-800/30 transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-1.5 bg-amber-500/5 rounded-lg text-amber-600 dark:text-amber-400 border border-amber-500/10 dark:border-amber-500/20">
                                    <Clock size={14} />
                                </div>
                                <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.15em]">Última Atividade</span>
                            </div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-300">{lead.lastActive || 'Nenhuma atividade registrada'}</p>
                        </div>

                        {lead.last_message && (
                            <div className="p-5 rounded-[2rem] bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border border-transparent hover:border-zinc-800/30 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-1.5 bg-indigo-500/5 rounded-lg text-indigo-400 border border-indigo-500/10">
                                        <User size={14} />
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Descrição do Lead</span>
                                </div>
                                <p className="text-sm font-medium text-zinc-400 leading-relaxed italic">"{lead.last_message}"</p>
                            </div>
                        )}

                        {/* Pipeline Timeline */}
                        <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-[#0c0c0e] shadow-inner dark:shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border border-zinc-100 dark:border-transparent hover:border-zinc-200 dark:hover:border-zinc-800/30 transition-all">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 dark:border-indigo-500/20">
                                    <GitCommit size={14} />
                                </div>
                                <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.15em]">Pipeline / Histórico</span>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-6">
                                    <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                </div>
                            ) : history.length > 0 ? (
                                <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                                    <div className="space-y-6 ml-2 border-l border-zinc-200 dark:border-zinc-800/50 pl-6 py-2 relative">
                                        {history.map((item) => (
                                            <div key={item.id} className="relative group/item">
                                                <div className="absolute -left-[29px] top-1.5 w-2 h-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline outline-2 outline-indigo-500/0 group-hover/item:outline-indigo-500/20 group-hover/item:bg-indigo-500 transition-all"></div>
                                                <div>
                                                    <p className="text-[11px] text-zinc-700 dark:text-zinc-400 font-bold tracking-tight">
                                                        {item.from_column ? (
                                                            <>De <span className="text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-800">{item.from_column.name}</span> para <span className="text-indigo-600 dark:text-indigo-400">{item.to_column?.name}</span></>
                                                        ) : (
                                                            <>Entrou em <span className="text-indigo-600 dark:text-indigo-400">{item.to_column?.name}</span></>
                                                        )}
                                                    </p>
                                                    <p className="text-[9px] text-zinc-500 dark:text-zinc-600 font-bold uppercase tracking-tighter mt-1.5 flex items-center gap-1.5">
                                                        <Clock size={10} strokeWidth={3} />
                                                        {formatRelativeTime(item.moved_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 italic py-4 text-center font-bold uppercase tracking-widest">Sem movimentações</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-zinc-50 dark:bg-[#0c0c0e] border-t border-zinc-200 dark:border-zinc-800/30 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-600">
                        <Calendar size={12} strokeWidth={3} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter font-mono">Lead desde {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white dark:bg-[#0c0c0e] shadow-lg dark:shadow-[4px_4px_8px_#050506,-4px_-4px_8px_#131316] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 border border-zinc-200 dark:border-zinc-800/50"
                    >
                        Fechar Card
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadDetailsModal;
