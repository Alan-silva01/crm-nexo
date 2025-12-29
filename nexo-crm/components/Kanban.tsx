
import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  MoreVertical,
  MessageSquare,
  Clock,
  Layout,
  Trash2,
  X,
  Check
} from 'lucide-react';
import { Lead } from '../types';
import { leadsService } from '../src/lib/leadsService';
import { supabase } from '../src/lib/supabase';
import ConfirmModal from './ConfirmModal';

const BORDER_COLORS = [
  '#fbbf24', // yellow
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7'  // purple
];

interface KanbanColumn {
  id: string;
  name: string;
  position: number;
}

interface KanbanProps {
  searchQuery: string;
  filteredLeads: Lead[];
  onLeadsUpdate: (leads: Lead[]) => void;
}

const Kanban: React.FC<KanbanProps> = ({ searchQuery, filteredLeads, onLeadsUpdate }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', status: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });

  // Fetch columns from database
  useEffect(() => {
    const fetchColumns = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (error) {
        console.error('Error fetching columns:', error);
        // Use default columns if fetch fails
        setColumns([
          { id: '1', name: 'Novos Leads', position: 0 },
          { id: '2', name: 'Em Atendimento', position: 1 },
          { id: '3', name: 'Negociação', position: 2 },
          { id: '4', name: 'Venda Concluída', position: 3 }
        ]);
      } else if (data && data.length > 0) {
        setColumns(data);
        setNewLead(prev => ({ ...prev, status: data[0].name }));
      }
      setLoadingColumns(false);
    };

    fetchColumns();
  }, []);

  // Real-time subscription for leads updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('kanban-leads-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leads',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Realtime event:', payload.eventType);
            // Refetch all leads when any change happens
            const { data: newLeads } = await supabase
              .from('leads')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (newLeads) {
              onLeadsUpdate(newLeads);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [onLeadsUpdate]);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('leadId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setDraggingId(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = useCallback((e: React.DragEvent, targetColumnName: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    const updated = filteredLeads.map(lead =>
      lead.id === leadId ? { ...lead, status: targetColumnName } : lead
    );
    onLeadsUpdate(updated);
    setDraggingId(null);
  }, [filteredLeads, onLeadsUpdate]);

  const addColumn = async () => {
    if (!newColumnName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newPosition = columns.length;
    const { data, error } = await supabase
      .from('kanban_columns')
      .insert([{ user_id: user.id, name: newColumnName, position: newPosition }])
      .select()
      .single();

    if (error) {
      console.error('Error adding column:', error);
      alert('Erro ao criar coluna');
      return;
    }

    if (data) {
      setColumns([...columns, data]);
    }
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const removeColumn = async (id: string, name: string) => {
    const leadsInColumn = filteredLeads.filter(l => l.status === name).length;
    if (leadsInColumn > 0) {
      alert(`Esta coluna tem ${leadsInColumn} leads. Mova-os para outra coluna antes de deletar.`);
      return;
    }

    if (confirm('Tem certeza que deseja remover esta coluna?')) {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting column:', error);
        alert('Erro ao deletar coluna');
        return;
      }

      setColumns(columns.filter(c => c.id !== id));
    }
  };

  const createLead = async () => {
    if (!newLead.name.trim()) {
      alert('Por favor, preencha o nome do lead.');
      return;
    }

    setIsCreating(true);
    const created = await leadsService.createLead({
      name: newLead.name,
      phone: newLead.phone || null,
      email: newLead.email || null,
      status: newLead.status || columns[0]?.name || 'Novos Leads',
      avatar: `https://picsum.photos/seed/${newLead.name}/200`,
    });

    if (created) {
      const updatedLeads = await leadsService.fetchLeads();
      onLeadsUpdate(updatedLeads);
      setNewLead({ name: '', phone: '', email: '', status: columns[0]?.name || '' });
      setIsAddingLead(false);
    } else {
      alert('Erro ao criar lead. Tente novamente.');
    }
    setIsCreating(false);
  };

  if (loadingColumns) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 overflow-hidden relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kanban de Vendas</h1>
          <p className="text-zinc-500 text-sm">Gerencie o fluxo de atendimento com precisão e agilidade.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsAddingColumn(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <Layout size={16} />
            <span>Nova Coluna</span>
          </button>
          <button
            onClick={() => setIsAddingLead(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/10"
          >
            <Plus size={16} />
            <span>Novo Lead</span>
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scroll-smooth">
        {columns.map((col, colIndex) => (
          <div
            key={col.id}
            className="flex-shrink-0 w-80 flex flex-col group"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.name)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BORDER_COLORS[colIndex % BORDER_COLORS.length] }}></span>
                <h3 className="text-sm font-semibold text-zinc-300">{col.name}</h3>
                <span className="text-[10px] bg-zinc-800/80 text-zinc-500 px-1.5 py-0.5 rounded-md">
                  {filteredLeads.filter(l => l.status === col.name).length}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeColumn(col.id, col.name)}
                  className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 kanban-column overflow-y-auto pr-1">
              {filteredLeads.filter(lead => lead.status === col.name).map((lead) => {
                const borderColor = BORDER_COLORS[parseInt(lead.id.slice(0, 8), 16) % BORDER_COLORS.length];
                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onDragEnd={onDragEnd}
                    className={`bg-[#121214] border border-zinc-800/40 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-[#18181b] transition-all duration-300 shadow-xl relative overflow-hidden
                      ${draggingId === lead.id ? 'dragging ring-2 ring-indigo-500 scale-[1.02]' : ''}`}
                    style={{ borderLeft: `4px solid ${borderColor}` }}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={lead.avatar || `https://picsum.photos/seed/${lead.name}/200`} alt={lead.name} className="w-11 h-11 rounded-full border border-zinc-800 shadow-md object-cover" />
                          </div>
                          <div>
                            <h4 className="text-[13px] font-semibold tracking-tight">{lead.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{lead.phone || lead.email || ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, lead })}
                          className="text-zinc-700 hover:text-red-400 transition-colors"
                          title="Excluir lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {lead.last_message && (
                        <p className="text-[11px] text-zinc-400 mt-2 mb-2 line-clamp-2 italic">
                          "{lead.last_message}"
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/40">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <MessageSquare size={11} className="text-zinc-600" />
                            <span>Zap</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredLeads.filter(l => l.status === col.name).length === 0 && (
                <div className="border-2 border-dashed border-zinc-900/50 rounded-2xl h-24 flex flex-col items-center justify-center text-zinc-700 text-xs italic p-4 text-center">
                  Vazio
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Column Modal */}
      {isAddingColumn && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Nova Coluna</h2>
              <button onClick={() => setIsAddingColumn(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>
            <input
              autoFocus
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Ex: Pós-Venda"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsAddingColumn(false)}
                className="flex-1 py-3 bg-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addColumn}
                className="flex-1 py-3 bg-indigo-600 rounded-xl text-xs font-semibold text-white hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                <Check size={14} /> Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddingLead && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Novo Lead</h2>
              <button onClick={() => setIsAddingLead(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-2 block">Nome *</label>
                <input
                  autoFocus
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-2 block">Telefone</label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="+55 11 99999-9999"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-2 block">E-mail</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-2 block">Coluna</label>
                <select
                  value={newLead.status}
                  onChange={(e) => setNewLead({ ...newLead, status: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsAddingLead(false)}
                disabled={isCreating}
                className="flex-1 py-3 bg-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={createLead}
                disabled={isCreating}
                className="flex-1 py-3 bg-indigo-600 rounded-xl text-xs font-semibold text-white hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Criar Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, lead: null })}
        onConfirm={async () => {
          if (deleteModal.lead) {
            const { error } = await supabase.from('leads').delete().eq('id', deleteModal.lead.id);
            if (error) {
              alert('Erro ao excluir lead');
            }
          }
        }}
        title="Excluir Lead"
        message={`Tem certeza que deseja excluir "${deleteModal.lead?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default Kanban;
