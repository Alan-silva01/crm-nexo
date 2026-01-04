
import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  MoreVertical,
  MessageSquare,
  Clock,
  Layout,
  Trash2,
  X,
  Check,
  GitCommit
} from 'lucide-react';
import { Lead, LeadColumnHistory } from '../types';
import { leadsService } from '../src/lib/leadsService';
import { supabase } from '../src/lib/supabase';
import ConfirmModal from './ConfirmModal';
import { formatPhoneNumber } from '../src/lib/formatPhone';
import { formatRelativeTime } from '../src/lib/formatRelativeTime';
import WeeklyCalendar from './WeeklyCalendar';
import LeadDetailsModal from './LeadDetailsModal';
import LetterAvatar from './LetterAvatar';

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
  onUpdateLeadStatus: (id: string, newStatus: string, fromColumnId?: string | null, toColumnId?: string) => void;
  onSelectChat: (id: string) => void;
}

const Kanban: React.FC<KanbanProps> = ({ searchQuery, filteredLeads, onLeadsUpdate, onUpdateLeadStatus, onSelectChat }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', status: '', company_name: '', monthly_revenue: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [deleteColumnModal, setDeleteColumnModal] = useState<{ isOpen: boolean; column: KanbanColumn | null }>({ isOpen: false, column: null });
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [leadsHistory, setLeadsHistory] = useState<Record<string, LeadColumnHistory[]>>({});

  // Fetch columns from database
  useEffect(() => {
    const fetchColumns = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Fetching columns for user:', user.id);

      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (error) {
        console.error('Error fetching columns:', error);
      }

      if (data && data.length > 0) {
        console.log('Columns fetched successfully:', data);
        setColumns(data);
        setNewLead(prev => ({ ...prev, status: data[0].name, company_name: '', monthly_revenue: '' }));
      } else {
        console.log('No columns found in DB, using defaults.');
        const defaults = [
          { id: '1', name: 'Novos Leads', position: 0 },
          { id: '2', name: 'Em Atendimento', position: 1 },
          { id: '3', name: 'Negociação', position: 2 },
          { id: '4', name: 'Venda Concluída', position: 3 }
        ];
        setColumns(defaults);
        setNewLead(prev => ({ ...prev, status: defaults[0].name, company_name: '', monthly_revenue: '' }));
      }
      setLoadingColumns(false);
    };

    fetchColumns();
  }, []);

  // Fetch all leads history
  useEffect(() => {
    const fetchHistory = async () => {
      const history = await leadsService.fetchAllHistory();
      const grouped = history.reduce((acc: Record<string, LeadColumnHistory[]>, item) => {
        if (!acc[item.lead_id]) acc[item.lead_id] = [];
        acc[item.lead_id].push(item);
        return acc;
      }, {});
      setLeadsHistory(grouped);
    };

    fetchHistory();

    // Set up realtime sub for history if needed, but for now just fetch on mount or when onLeadsUpdate is called
    // Actually, since we move leads here, we can update local history state too.
  }, [filteredLeads.length]); // Re-fetch or update when leads length changes (new leads)



  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('leadId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDraggingColumnId(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = useCallback(async (e: React.DragEvent, targetColumn: KanbanColumn) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      const lead = filteredLeads.find(l => l.id === leadId);
      const fromColumn = columns.find(c => c.name === lead?.status);
      onUpdateLeadStatus(leadId, targetColumn.name, fromColumn?.id, targetColumn.id);

      // Optimistically update history for the UI
      if (leadId) {
        const newHistoryItem: LeadColumnHistory = {
          id: Math.random().toString(),
          lead_id: leadId,
          from_column_id: fromColumn?.id || null,
          to_column_id: targetColumn.id,
          moved_at: new Date().toISOString(),
          user_id: null,
          from_column: fromColumn ? { name: fromColumn.name } : undefined,
          to_column: { name: targetColumn.name }
        };
        setLeadsHistory(prev => ({
          ...prev,
          [leadId]: [...(prev[leadId] || []), newHistoryItem]
        }));
      }
    }
    setDraggingId(null);
  }, [onUpdateLeadStatus, columns, filteredLeads]);

  const onColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggingColumnId(columnId);
    e.dataTransfer.setData('columnId', columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onColumnDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceColumnId = e.dataTransfer.getData('columnId');
    if (!sourceColumnId) return;

    const sourceIndex = columns.findIndex(c => c.id === sourceColumnId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDraggingColumnId(null);
      return;
    }

    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(targetIndex, 0, movedColumn);

    // Update positions locally
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      position: index
    }));

    setColumns(updatedColumns);
    setDraggingColumnId(null);

    // Persist to Supabase using individual UPDATE calls
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('Saving column positions:', updatedColumns.map(c => ({ id: c.id, name: c.name, position: c.position })));

    // Update each column's position individually
    const updatePromises = updatedColumns.map(col =>
      supabase
        .from('kanban_columns')
        .update({ position: col.position })
        .eq('id', col.id)
        .eq('user_id', user.id)
    );

    const results = await Promise.all(updatePromises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('Error updating column positions:', errors.map(e => e.error));
    } else {
      console.log('Column positions saved successfully!');
    }
  };

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

  const removeColumn = async (column: KanbanColumn) => {
    const leadsInColumn = filteredLeads.filter(l => l.status === column.name).length;
    if (leadsInColumn > 0) {
      alert(`Esta coluna tem ${leadsInColumn} leads. Mova-os para outra coluna antes de deletar.`);
      return;
    }
    setDeleteColumnModal({ isOpen: true, column });
  };

  const confirmDeleteColumn = async () => {
    if (!deleteColumnModal.column) return;

    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', deleteColumnModal.column.id);

    if (error) {
      console.error('Error deleting column:', error);
      alert('Erro ao deletar coluna');
      return;
    }

    setColumns(columns.filter(c => c.id !== deleteColumnModal.column!.id));
    setDeleteColumnModal({ isOpen: false, column: null });
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
      company_name: newLead.company_name || null,
      monthly_revenue: newLead.monthly_revenue ? parseFloat(newLead.monthly_revenue) : null,
    });

    if (created) {
      const updatedLeads = await leadsService.fetchLeads();
      onLeadsUpdate(updatedLeads);
      setNewLead({ name: '', phone: '', email: '', status: columns[0]?.name || '', company_name: '', monthly_revenue: '' });
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
          <h1 className="text-2xl font-semibold tracking-tight">Kanban de Leads</h1>
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

      <WeeklyCalendar onDateChange={(date) => console.log('Selected date:', date)} />

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scroll-smooth">
        {columns.map((col, colIndex) => (
          <div
            key={col.id}
            className={`flex-shrink-0 w-80 flex flex-col group transition-all duration-300
              ${draggingColumnId === col.id ? 'opacity-40 scale-95' : ''}`}
            onDragOver={onDragOver}
            onDrop={(e) => {
              const leadId = e.dataTransfer.getData('leadId');
              if (leadId) {
                onDrop(e, col);
              } else {
                onColumnDrop(e, colIndex);
              }
            }}
          >
            <div
              draggable
              onDragStart={(e) => onColumnDragStart(e, col.id)}
              onDragEnd={onDragEnd}
              className="flex items-center justify-between mb-4 px-1 cursor-grab active:cursor-grabbing hover:bg-zinc-800/30 rounded-lg py-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BORDER_COLORS[colIndex % BORDER_COLORS.length] }}></span>
                <h3 className="text-sm font-semibold text-zinc-300">{col.name}</h3>
                <span className="text-[10px] bg-zinc-800/80 text-zinc-500 px-1.5 py-0.5 rounded-md">
                  {filteredLeads.filter(l => l.status === col.name).length}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeColumn(col)}
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
                    onClick={() => setDetailsModal({ isOpen: true, lead })}
                    className={`bg-[#121214] border border-zinc-800/40 rounded-2xl cursor-pointer active:cursor-grabbing hover:bg-[#18181b] transition-all duration-300 shadow-xl relative overflow-hidden
                      ${draggingId === lead.id ? 'dragging ring-2 ring-indigo-500 scale-[1.02]' : ''}`}
                    style={{ borderLeft: `4px solid ${borderColor}` }}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <LetterAvatar name={lead.name} size="lg" />
                          </div>
                          <div>
                            <h4 className="text-[13px] font-semibold tracking-tight">{lead.name}</h4>
                            {lead.company_name && <p className="text-[10px] text-indigo-400 font-medium">{lead.company_name}</p>}
                            <p className="text-[10px] text-zinc-500 mt-0.5">{formatPhoneNumber(lead.phone) || ''}</p>
                            {lead.email && <p className="text-[10px] text-zinc-500">{lead.email}</p>}
                            {lead.monthly_revenue && <p className="text-[10px] text-emerald-400">R$ {lead.monthly_revenue.toLocaleString('pt-BR')}/mês</p>}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, lead });
                          }}
                          className="text-zinc-700 hover:text-red-400 transition-colors p-1"
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

                      {/* Horizontal Timeline */}
                      <div className="mt-3 mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <GitCommit size={10} className="text-zinc-500" />
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Trajetória</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                          <div className="flex items-center gap-2 min-w-max px-1">
                            {/* Initial point if no history or to show entry */}
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700"></div>
                                <span className="text-[8px] text-zinc-600 font-medium">Início</span>
                              </div>
                              <div className="w-4 h-[1px] bg-zinc-800/50 mt-[-10px]"></div>
                            </div>

                            {(leadsHistory[lead.id] || []).map((step, idx, arr) => (
                              <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500/40 border border-indigo-400/50 shadow-[0_0_8px_rgba(99,102,241,0.2)]"></div>
                                  <span className="text-[8px] text-zinc-400 font-medium truncate max-w-[60px]">
                                    {step.to_column?.name}
                                  </span>
                                </div>
                                {idx < arr.length - 1 && (
                                  <div className="w-4 h-[1px] bg-indigo-500/20 mt-[-10px]"></div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/40">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <MessageSquare size={11} className="text-zinc-600" />
                            <span>Zap</span>
                          </div>
                        </div>
                        {lead.updated_at && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                            <Clock size={10} />
                            <span>{formatRelativeTime(lead.updated_at)}</span>
                          </div>
                        )}
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
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-2 block">Nome da Empresa</label>
                <input
                  type="text"
                  value={newLead.company_name}
                  onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                  placeholder="Ex: Tech Solutions Ltda"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase mb-2 block">Faturamento Mensal (R$)</label>
                <input
                  type="number"
                  value={newLead.monthly_revenue}
                  onChange={(e) => setNewLead({ ...newLead, monthly_revenue: e.target.value })}
                  placeholder="Ex: 50000"
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

      {/* Column Delete Modal */}
      <ConfirmModal
        isOpen={deleteColumnModal.isOpen}
        onClose={() => setDeleteColumnModal({ isOpen: false, column: null })}
        onConfirm={confirmDeleteColumn}
        title="Excluir Coluna"
        message={`Tem certeza que deseja excluir a coluna "${deleteColumnModal.column?.name}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, lead: null })}
        lead={detailsModal.lead}
        onViewConversation={() => {
          if (detailsModal.lead) {
            onSelectChat(detailsModal.lead.id);
            setDetailsModal({ isOpen: false, lead: null });
          }
        }}
      />
    </div>
  );
};

export default Kanban;

// Add this at the bottom to handle scrollbar hiding
const style = document.createElement('style');
style.textContent = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.appendChild(style);
