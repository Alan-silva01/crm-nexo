import { X, MessageSquare, Phone, Mail, Clock, Calendar, User } from 'lucide-react';
import { Lead } from '../types';
import { formatPhoneNumber } from '../src/lib/formatPhone';
import LetterAvatar from './LetterAvatar';

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onViewConversation: () => void;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ isOpen, onClose, lead, onViewConversation }) => {
    if (!isOpen || !lead) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#121214] w-full max-w-lg rounded-3xl border border-zinc-800/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative h-32 bg-indigo-600/20 border-b border-indigo-500/10">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute -bottom-10 left-8">
                        <div className="w-24 h-24 rounded-3xl bg-[#121214] border-4 border-[#121214] shadow-xl overflow-hidden flex items-center justify-center">
                            <LetterAvatar name={lead.name} size="xl" className="rounded-2xl" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-16 pb-8 px-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight mb-1">{lead.name}</h2>
                            <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-indigo-500/20">
                                {lead.status}
                            </span>
                        </div>

                        <button
                            onClick={onViewConversation}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <MessageSquare size={18} />
                            <span>Ver conversa</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 group hover:border-zinc-700/50 transition-colors">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <Phone size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Telefone</span>
                                </div>
                                <p className="text-sm font-medium text-zinc-200">{lead.phone ? formatPhoneNumber(lead.phone) : 'Não informado'}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 group hover:border-zinc-700/50 transition-colors">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                                        <Mail size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">E-mail</span>
                                </div>
                                <p className="text-sm font-medium text-zinc-200 truncate">{lead.email || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 group hover:border-zinc-700/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                                    <Clock size={16} />
                                </div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Última Atividade</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-200">{lead.lastActive || 'Nenhuma atividade registrada'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-zinc-900/30 border-t border-zinc-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-500">
                        <Calendar size={14} />
                        <span className="text-[11px]">Lead desde {new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadDetailsModal;
