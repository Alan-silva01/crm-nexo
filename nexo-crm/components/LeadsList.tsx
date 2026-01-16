import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, UserPlus, Users, Database, Tag as TagIcon, Plus, X, Check, Trash2, Loader2, CheckSquare, Square, AlertTriangle, CheckCircle2, Edit2, Eraser } from 'lucide-react';
import { Lead, getLeadDisplayName } from '../types';
import { leadsService } from '../src/lib/leadsService';
import { tagsService, Tag } from '../src/lib/tagsService';
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
  const [showLocalSearch, setShowLocalSearch] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isApplyingTag, setIsApplyingTag] = useState(false);

  // Create/Edit States
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const tags = await tagsService.listTags();
    setAvailableTags(tags);
  };

  const handleImportComplete = (newLeads: Lead[]) => {
    if (onLeadsUpdate) {
      onLeadsUpdate([...newLeads, ...filteredLeads]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApplyBulkTag = async (tagName: string) => {
    setIsApplyingTag(true);
    try {
      const updates = selectedLeadIds.map(async (id) => {
        const lead = filteredLeads.find(l => l.id === id);
        if (!lead) return;

        const currentTags = lead.tags || [];
        if (!currentTags.includes(tagName)) {
          const newTags = [...currentTags, tagName];
          await leadsService.updateLead(id, { tags: newTags });
          return { id, tags: newTags };
        }
        return null;
      });

      const results = await Promise.all(updates);

      if (onLeadsUpdate) {
        const updatedLeads = filteredLeads.map(l => {
          const update = results.find(r => r?.id === l.id);
          return update ? { ...l, tags: update.tags } : l;
        });
        onLeadsUpdate(updatedLeads);
      }
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error applying bulk tags:', error);
    } finally {
      setIsApplyingTag(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeadIds.length} contatos?`)) return;

    setIsDeleting(true);
    try {
      const results = await Promise.all(selectedLeadIds.map(id => leadsService.deleteLead(id)));
      const successCount = results.filter(r => r === true).length;

      if (successCount < selectedLeadIds.length) {
        alert(`Aviso: ${selectedLeadIds.length - successCount} contatos não puderam ser excluídos.`);
      }

      if (onLeadsUpdate) {
        onLeadsUpdate(filteredLeads.filter(l => !selectedLeadIds.includes(l.id)));
      }
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error in bulk delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteIndividual = async () => {
    if (!leadToDelete) return;

    setIsDeleting(true);
    try {
      const success = await leadsService.deleteLead(leadToDelete.id);
      if (success) {
        if (onLeadsUpdate) {
          onLeadsUpdate(filteredLeads.filter(l => l.id !== leadToDelete.id));
        }
        setLeadToDelete(null);
      } else {
        alert('Não foi possível excluir o contato.');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      alert('Número de telefone inválido. Deve conter DDD + número (10 ou 11 dígitos).');
      return false;
    }
    return true;
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    if (!validatePhone(formData.phone)) return;
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (editingLead) {
        // UPDATE
        const success = await leadsService.updateLead(editingLead.id, {
          name: formData.name,
          phone: formData.phone
        });

        if (success) {
          setShowSuccess(true);
          if (onLeadsUpdate) {
            onLeadsUpdate(filteredLeads.map(l => l.id === editingLead.id ? { ...l, name: formData.name, phone: formData.phone } : l));
          }
          setTimeout(() => {
            setEditingLead(null);
            setShowNewLeadForm(false);
            setShowSuccess(false);
            setFormData({ name: '', phone: '' });
          }, 1500);
        }
      } else {
        // CREATE
        const created = await leadsService.createLead({
          name: formData.name,
          phone: formData.phone,
          status: 'NOVO',
          email: null,
          avatar: null,
          company_name: null,
          monthly_revenue: null,
          dataHora_Agendamento: null,
          servico_interesse: null,
          dados: null,
          ai_paused: false,
          assigned_to: null,
          tags: []
        });

        if (created) {
          setShowSuccess(true);
          if (onLeadsUpdate) {
            onLeadsUpdate([created, ...filteredLeads]);
          }
          setFormData({ name: '', phone: '' });
          setTimeout(() => {
            setShowNewLeadForm(false);
            setShowSuccess(false);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone ? lead.phone.replace(/\D/g, '').replace(/^55/, '') : ''
    });
    setShowNewLeadForm(true);
  };

  const handleExportCSV = useCallback(() => {
    if (filteredLeads.length === 0) {
      alert('Não há contatos para exportar.');
      return;
    }

    const headers = ['Nome', 'Telefone', 'Etiquetas'];
    const rows = filteredLeads.map(lead => {
      const name = getLeadDisplayName(lead);
      const phone = formatPhoneNumber(lead.phone) || '';
      const tags = (lead.tags || []).join('; ');

      const formatCell = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      return [name, phone, tags].map(formatCell).join(',');
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows].join('\n');
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
    <div className="p-8 h-full flex flex-col space-y-8 overflow-y-auto custom-scrollbar bg-[#0c0c0e]">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Base de Contatos</h1>
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
          <button
            onClick={() => {
              setEditingLead(null);
              setFormData({ name: '', phone: '' });
              setShowSuccess(false);
              setShowNewLeadForm(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <UserPlus size={14} />
            Novo Contato
          </button>
        </div>
      </header>

      {/* Modal de Criar/Editar Contato */}
      {showNewLeadForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">

            {showSuccess && (
              <div className="absolute inset-0 bg-[#0c0c0e]/95 backdrop-blur-md z-10 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-widest">{editingLead ? 'Alterações Salvas!' : 'Contato Salvo!'}</h3>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">{editingLead ? 'Editar Contato' : 'Novo Contato'}</h2>
              <button onClick={() => {
                setShowNewLeadForm(false);
                setEditingLead(null);
              }} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveLead} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Ex: João Silva"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone (com DDD)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Ex: 11999999999"
                  required
                />
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight ml-1 italic">* Digite apenas números (10 ou 11 dígitos)</p>
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> {editingLead ? 'Salvar Alterações' : 'Salvar Contato'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Individual */}
      {leadToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-widest">Excluir Contato?</h3>
                <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                  Tem certeza que deseja excluir <strong>{getLeadDisplayName(leadToDelete)}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={() => setLeadToDelete(null)}
                  className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteIndividual}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImportContactsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      <div className="bg-[#0c0c0e] border border-zinc-800/40 rounded-[2.5rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Header da Tabela com Busca e Ações em Massa */}
        <div className="px-8 py-6 border-b border-zinc-800/50 flex items-center justify-between gap-4 shrink-0 bg-zinc-900/10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Users size={16} className="text-indigo-400" />
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                Total de Clientes
                <span className="text-zinc-100 ml-2 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/50">{filteredLeads.length}</span>
              </div>
            </div>

            {selectedLeadIds.length > 0 && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 shadow-sm">
                  {selectedLeadIds.length} Selecionados
                </span>

                <button
                  onClick={() => setSelectedLeadIds([])}
                  className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all"
                >
                  <Eraser size={12} />
                  Desmarcar
                </button>

                <div className="h-6 w-px bg-zinc-800 mx-1"></div>

                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-bold text-zinc-300 hover:text-white hover:border-indigo-500/30 transition-all">
                    <TagIcon size={12} />
                    Etiquetar
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1">
                    {availableTags.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 p-3 italic">Crie etiquetas em "Etiquetas"</p>
                    ) : (
                      availableTags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => handleApplyBulkTag(tag.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all text-left"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></div>
                          {tag.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                >
                  <Trash2 size={12} />
                  Excluir
                </button>
              </div>
            )}
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
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 w-10">
                  <button onClick={toggleSelectAll} className="p-1 hover:text-indigo-400 transition-colors">
                    {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Contato</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Status Estratégico</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Informações</th>
                {showTags && <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">Etiquetas</th>}
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className={`hover:bg-zinc-800/10 transition-colors group ${selectedLeadIds.includes(lead.id) ? 'bg-indigo-500/5' : ''}`}>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <button onClick={() => toggleSelectLead(lead.id)} className={`p-1 transition-colors ${selectedLeadIds.includes(lead.id) ? 'text-indigo-400' : 'text-zinc-700 group-hover:text-zinc-500'}`}>
                      {selectedLeadIds.includes(lead.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
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
                          lead.tags.map((tagName) => {
                            const tagInfo = availableTags.find(t => t.name === tagName);
                            return (
                              <span
                                key={tagName}
                                style={tagInfo ? { backgroundColor: tagInfo.color + '15', color: tagInfo.color, borderColor: tagInfo.color + '30' } : {}}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[10px] font-bold uppercase tracking-tight group/tag transition-all"
                              >
                                {tagName}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const newTags = (lead.tags || []).filter(t => t !== tagName);
                                    if (onLeadsUpdate) {
                                      onLeadsUpdate(filteredLeads.map(l => l.id === lead.id ? { ...l, tags: newTags } : l));
                                    }
                                    await leadsService.updateLead(lead.id, { tags: newTags });
                                  }}
                                  className="opacity-0 group-hover/tag:opacity-100 p-0.5 hover:text-white transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic font-medium">Sem etiquetas</span>
                        )}

                        {/* Seletor Dropdown para nova etiqueta */}
                        <div className="relative group/add">
                          <button
                            className="w-6 h-6 rounded-lg border border-zinc-800 border-dashed flex items-center justify-center text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                            title="Adicionar etiqueta"
                          >
                            <Plus size={10} />
                          </button>
                          <div className="absolute top-full left-0 mt-2 w-48 bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover/add:opacity-100 group-hover/add:visible transition-all z-50 p-2 space-y-1">
                            {availableTags.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 p-3 italic">Não há etiquetas.</p>
                            ) : (
                              availableTags.map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={async () => {
                                    const current = lead.tags || [];
                                    if (!current.includes(tag.name)) {
                                      const next = [...current, tag.name];
                                      if (onLeadsUpdate) onLeadsUpdate(filteredLeads.map(l => l.id === lead.id ? { ...l, tags: next } : l));
                                      await leadsService.updateLead(lead.id, { tags: next });
                                    }
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all text-left"
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                  {tag.name}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
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
                      <button
                        onClick={() => handleEditClick(lead)}
                        className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-lg active:scale-95"
                        title="Editar Contato"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setLeadToDelete(lead)}
                        className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-rose-500 hover:border-rose-500/30 transition-all shadow-lg active:scale-95"
                        title="Excluir Contato"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={showTags ? 6 : 5} className="px-8 py-20 text-center">
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
