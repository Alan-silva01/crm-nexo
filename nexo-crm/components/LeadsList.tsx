
import React from 'react';
import { Search, Filter, MoreHorizontal, Download, UserPlus, Phone, Mail, Users, Database, Tag, Plus, X } from 'lucide-react';
import { STATUS_LABELS } from '../constants';
import { Lead, getLeadDisplayName } from '../types';
import { leadsService } from '../src/lib/leadsService';
import { formatPhoneNumber } from '../src/lib/formatPhone';
import LetterAvatar from './LetterAvatar';
import ImportContactsModal from './ImportContactsModal';

interface LeadsListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredLeads: Lead[];
  onViewDetails: (lead: Lead) => void;
  onViewChat: (lead: Lead) => void;
  onLeadsUpdate?: (leads: Lead[]) => void;
  showTags?: boolean;
}

const LeadsList: React.FC<LeadsListProps> = ({ searchQuery, onSearchChange, filteredLeads, onViewDetails, onViewChat, onLeadsUpdate, showTags }) => {
  const [showLocalSearch, setShowLocalSearch] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);

  const handleImportComplete = (newLeads: Lead[]) => {
    if (onLeadsUpdate) {
      onLeadsUpdate([...newLeads, ...filteredLeads]);
    }
  };

  const handleExportCSV = React.useCallback(() => {
    if (filteredLeads.length === 0) {
      alert('Não há contatos para exportar.');
      return;
    }

    // Cabeçalho do CSV
    const headers = ['Nome', 'Telefone'];

    // Dados formatados
    const rows = filteredLeads.map(lead => {
      const name = getLeadDisplayName(lead);
      const phone = formatPhoneNumber(lead.phone) || '';

      // Escapar aspas duplas e envolver em aspas se contiver vírgula
      const formatCell = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      return [name, phone].map(formatCell).join(',');
    });

    // Montar CSV com BOM para suporte a caracteres especiais no Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows].join('\n');

    // Criar blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contatos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredLeads]);

  return (
    <div className="p-8 h-full flex flex-col space-y-8 overflow-y-auto custom-scrollbar">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Base de Contatos</h1>
          <p className="text-zinc-500 text-sm">Gerencie todos os seus leads e clientes em um ambiente seguro.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 rounded-xl text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Database size={14} />
            Importar Contatos
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
            <UserPlus size={14} />
            Novo Contato
          </button>
        </div>
      </header>

      <ImportContactsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      <div className="bg-[#0c0c0e] border border-zinc-800/40 rounded-[2.5rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-8 py-6 border-b border-zinc-800/50 flex items-center justify-between gap-4 shrink-0 bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Users size={16} className="text-indigo-400" />
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Total de Clientes
              <span className="text-zinc-100 ml-2 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/50">{filteredLeads.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {showLocalSearch && (
              <div className="relative animate-in fade-in slide-in-from-right-4 duration-300">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Filtrar por nome, tel ou status..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold"
                />
              </div>
            )}
            <button
              onClick={() => setShowLocalSearch(!showLocalSearch)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all active:scale-95 ${showLocalSearch ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              <Filter size={14} className={showLocalSearch ? 'text-white' : 'text-indigo-400'} />
              {showLocalSearch ? 'Fechar Filtro' : 'Filtros Avançados'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0c0c0e] border-b border-zinc-800/50">
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Contato</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Status Estratégico</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Informações</th>
                {showTags && <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Etiquetas</th>}
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-zinc-800/10 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <LetterAvatar name={getLeadDisplayName(lead)} size="md" />
                      <div>
                        <div className="text-[13px] font-bold text-zinc-200 group-hover:text-white transition-colors">{getLeadDisplayName(lead)}</div>
                        <div className="text-[10px] text-zinc-500 font-medium mt-0.5">{formatPhoneNumber(lead.phone) || 'Sem telefone'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight border shadow-sm ${lead.status === 'AGUARDANDO DECISAO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5' :
                        lead.status === 'SEM INTERESSE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          lead.status === 'VENDA CONCLUÍDA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' :
                            'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/5'
                        }`}>
                        {lead.status || 'Novo Lead'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[11px] text-zinc-500 whitespace-nowrap font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-400">{lead.email || 'Nenhum e-mail'}</span>
                      {lead.company_name && <span className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-tighter">{lead.company_name}</span>}
                    </div>
                  </td>
                  {showTags && (
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {lead.tags && lead.tags.length > 0 ? (
                          lead.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[9px] font-bold text-zinc-300 uppercase tracking-tighter group/tag"
                            >
                              {tag}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const newTags = (lead.tags || []).filter(t => t !== tag);
                                  if (onLeadsUpdate) {
                                    onLeadsUpdate(filteredLeads.map(l => l.id === lead.id ? { ...l, tags: newTags } : l));
                                  }
                                  await leadsService.updateLead(lead.id, { tags: newTags });
                                }}
                                className="text-zinc-500 hover:text-rose-400 opacity-0 group-hover/tag:opacity-100 transition-all"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic font-medium">Sem etiquetas</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentTags = lead.tags || [];
                            const availableTags = ['cliente', 'lead', 'agendado', 'sem interesse', 'importante', 'parceiro'];
                            const nextTag = availableTags.find(t => !currentTags.includes(t));
                            if (nextTag) {
                              const newTags = [...currentTags, nextTag];
                              if (onLeadsUpdate) {
                                onLeadsUpdate(filteredLeads.map(l => l.id === lead.id ? { ...l, tags: newTags } : l));
                              }
                              leadsService.updateLead(lead.id, { tags: newTags });
                            }
                          }}
                          className="w-6 h-6 rounded-full border border-zinc-800 border-dashed flex items-center justify-center text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                          title="Adicionar etiqueta"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                      <button
                        onClick={() => onViewDetails(lead)}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white hover:border-indigo-500/30 transition-all shadow-lg active:scale-95 uppercase tracking-tighter"
                      >
                        Ver Cliente
                      </button>
                      <button
                        onClick={() => onViewChat(lead)}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white hover:border-emerald-500/30 transition-all shadow-lg active:scale-95 uppercase tracking-tighter"
                      >
                        Ver Conversa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={showTags ? 5 : 4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800 opacity-20">
                        <Users size={32} className="text-zinc-500" />
                      </div>
                      <div className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                        {searchQuery ? `Nada encontrado para "${searchQuery}"` : 'Sua base de contatos está vazia no momento.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredLeads.length > 0 && (
          <div className="px-8 py-4 border-t border-zinc-800/50 flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-900/5 shadow-inner">
            <div className="flex items-center gap-4">
              <span>Sincronizado com Banco de Dados</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Total:</span>
              <span className="text-zinc-200">{filteredLeads.length} contatos</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsList;
