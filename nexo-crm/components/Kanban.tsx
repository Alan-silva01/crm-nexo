
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
  GitCommit,
  Phone,
  MapPin,
  Car
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
  leadsHistory: Record<string, LeadColumnHistory[]>;
  onLeadsUpdate: (leads: Lead[]) => void;
  onUpdateLeadStatus: (id: string, newStatus: string, fromColumnId?: string | null, toColumnId?: string) => void;
  onSelectChat: (id: string) => void;
  columns: KanbanColumn[];
  onColumnsUpdate: (columns: KanbanColumn[]) => void;
}

const Kanban: React.FC<KanbanProps> = ({
  searchQuery,
  filteredLeads,
  leadsHistory,
  onLeadsUpdate,
  onUpdateLeadStatus,
  onSelectChat,
  columns,
  onColumnsUpdate
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', status: '', company_name: '', monthly_revenue: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [deleteColumnModal, setDeleteColumnModal] = useState<{ isOpen: boolean; column: KanbanColumn | null }>({ isOpen: false, column: null });
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean, title: string, message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // No longer fetching columns here as they are passed as props
  useEffect(() => {
    if (columns.length > 0 && !newLead.status) {
      setNewLead(prev => ({ ...prev, status: columns[0].name }));
    }
  }, [columns]);




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

      // Optimistic history update is now handled in App.tsx
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

    onColumnsUpdate(updatedColumns);
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
      setAlertModal({
        isOpen: true,
        title: 'Erro ao Criar Coluna',
        message: 'Não foi possível salvar a nova coluna no banco de dados. Por favor, tente novamente.'
      });
      return;
    }

    if (data) {
      onColumnsUpdate([...columns, data]);
    }
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const removeColumn = async (column: KanbanColumn) => {
    const leadsInColumn = filteredLeads.filter(l => l.status?.trim().toUpperCase() === column.name?.trim().toUpperCase()).length;
    if (leadsInColumn > 0) {
      setAlertModal({
        isOpen: true,
        title: 'Coluna não Vazia',
        message: `Esta coluna contém ${leadsInColumn} leads. É necessário mover todos os leads para outra coluna antes de removê-la.`
      });
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
      setAlertModal({
        isOpen: true,
        title: 'Erro ao Deletar',
        message: 'Houve um problema ao excluir a coluna. Verifique sua conexão e tente novamente.'
      });
      return;
    }

    onColumnsUpdate(columns.filter(c => c.id !== deleteColumnModal.column!.id));
    setDeleteColumnModal({ isOpen: false, column: null });
  };

  const createLead = async () => {
    if (!newLead.name.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Nome Obrigatório',
        message: 'Por favor, informe o nome do lead para continuar com o cadastro.'
      });
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
      setAlertModal({
        isOpen: true,
        title: 'Falha no Cadastro',
        message: 'Ocorreu um erro ao tentar criar o lead. Por favor, verifique os dados e tente novamente.'
      });
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
              className="flex items-center justify-between mb-6 px-4 cursor-grab active:cursor-grabbing hover:bg-zinc-800/20 rounded-2xl py-3 transition-all border border-transparent hover:border-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: BORDER_COLORS[colIndex % BORDER_COLORS.length], color: BORDER_COLORS[colIndex % BORDER_COLORS.length] }}></div>
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{col.name}</h3>
                <span className="text-[10px] bg-zinc-900/80 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-800/50 font-bold shadow-inner">
                  {filteredLeads.filter(l => l.status?.trim().toUpperCase() === col.name?.trim().toUpperCase()).length}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeColumn(col)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg hover:text-red-400 text-zinc-600 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 kanban-column overflow-y-auto pr-2 custom-scrollbar">
              {filteredLeads.filter(lead => lead.status?.trim().toUpperCase() === col.name?.trim().toUpperCase()).map((lead) => {
                const borderColor = BORDER_COLORS[parseInt(lead.id.slice(0, 8), 16) % BORDER_COLORS.length];
                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setDetailsModal({ isOpen: true, lead })}
                    className={`bg-[#0c0c0e] border border-zinc-800/40 rounded-[2rem] cursor-pointer active:cursor-grabbing hover:border-zinc-700/50 transition-all duration-300 shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316] relative overflow-hidden group/card
                      ${draggingId === lead.id ? 'dragging ring-2 ring-indigo-500/50 scale-[1.02]' : ''}`}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <LetterAvatar name={lead.name} size="lg" />
                            <div
                              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0c0c0e] shadow-sm"
                              style={{ backgroundColor: borderColor }}
                            ></div>
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold tracking-tight text-zinc-200 group-hover/card:text-white transition-colors">{lead.name}</h4>
                            {lead.company_name && <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">{lead.company_name}</p>}
                            <p className="text-[10px] text-zinc-500 font-medium mt-1">{formatPhoneNumber(lead.phone) || 'Sem telefone'}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, lead });
                          }}
                          className="text-zinc-800 hover:text-red-400 transition-all p-1.5 hover:bg-zinc-900 rounded-lg opacity-0 group-hover/card:opacity-100"
                          title="Excluir lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {lead.last_message && (
                        <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/30 mb-4">
                          <p className="text-[11px] text-zinc-400 line-clamp-2 italic leading-relaxed">
                            "{lead.last_message}"
                          </p>
                        </div>
                      )}

                      {/* Dados Customizados Detalhados */}
                      {lead.dados && Object.keys(lead.dados).length > 0 && (() => {
                        const d = lead.dados as Record<string, any>;
                        const hasValue = (val: any) => val !== null && val !== undefined && String(val).trim() !== '';

                        // Define relevant fields to show, excluding redundant ones (name, email, phone)
                        const fields = [
                          { key: 'modelo_veiculo', label: 'Veículo', icon: Car, color: 'text-amber-400' },
                          { key: 'placa_veiculo', label: 'Placa', icon: MoreHorizontal, color: 'text-zinc-400' },
                          { key: 'tipo_uso', label: 'Uso', icon: Users, color: 'text-blue-400' },
                          { key: 'preocupacao', label: 'Preocupação', icon: Phone, color: 'text-rose-400' },
                          { key: 'cidade', label: 'Cidade', icon: MapPin, color: 'text-emerald-400' },
                          { key: 'bairro', label: 'Bairro', icon: MapPin, color: 'text-emerald-400' },
                        ];

                        const visibleFields = fields.filter(f => hasValue(d[f.key]));
                        const obs = hasValue(d.observacoes) ? String(d.observacoes) : null;
                        const statusVenda = hasValue(d.status_venda) ? String(d.status_venda) : null;

                        if (visibleFields.length === 0 && !obs && !statusVenda) return null;

                        return (
                          <div className="bg-zinc-900/40 dark:bg-zinc-900/40 light:bg-zinc-50 rounded-2xl p-4 border border-zinc-800/30 dark:border-zinc-800/30 light:border-zinc-200 mb-4 space-y-3">
                            {visibleFields.length > 0 && (
                              <div className="grid grid-cols-2 gap-3">
                                {visibleFields.map(f => (
                                  <div key={f.key} className="flex items-center gap-2 overflow-hidden">
                                    <f.icon size={12} className={`${f.color} shrink-0`} />
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter opacity-70">{f.label}</span>
                                      <span className="text-[10px] text-zinc-300 dark:text-zinc-300 light:text-zinc-700 font-bold truncate leading-tight">
                                        {String(d[f.key])}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {obs && (
                              <div className="pt-2 border-t border-zinc-800/40 dark:border-zinc-800/40 light:border-zinc-200">
                                <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter block mb-1">Observações</span>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed line-clamp-3 italic">
                                  "{obs}"
                                </p>
                              </div>
                            )}

                            {statusVenda && (
                              <div className="pt-2">
                                <span className="text-[9px] px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-black uppercase tracking-widest border border-indigo-500/20">
                                  {statusVenda.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Horizontal Timeline */}
                      {(leadsHistory[lead.id] || []).length > 0 && (
                        <div className="mt-4 mb-5 px-1">
                          <div className="flex items-center gap-2 mb-3">
                            <GitCommit size={12} className="text-zinc-600" />
                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Jornada do Lead</span>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <div className="flex items-center gap-2 min-w-max">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-zinc-700 shadow-inner"></div>
                                  <span className="text-[8px] text-zinc-600 font-bold uppercase">Entrada</span>
                                </div>
                                <div className="w-6 h-[2px] bg-gradient-to-r from-zinc-800 to-zinc-800/20 mt-[-14px]"></div>
                              </div>

                              {(leadsHistory[lead.id] || []).slice().reverse().map((step, idx, arr) => {
                                const stepColIndex = columns.findIndex(c => c.id === step.to_column_id);
                                const dotColor = stepColIndex !== -1 ? BORDER_COLORS[stepColIndex % BORDER_COLORS.length] : '#52525b';

                                return (
                                  <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div
                                        className="w-2.5 h-2.5 rounded-full border-2 border-zinc-900 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                        style={{ backgroundColor: dotColor }}
                                      ></div>
                                      <span className="text-[8px] text-zinc-400 font-bold uppercase truncate max-w-[65px]">
                                        {step.to_column?.name || 'Status'}
                                      </span>
                                    </div>
                                    {idx < arr.length - 1 && (
                                      <div className="w-6 h-[2px] bg-zinc-800/50 mt-[-14px]"></div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/30">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/10">
                            <MessageSquare size={12} />
                            <span>SDR</span>
                          </div>
                          {lead.monthly_revenue && (
                            <span className="text-[10px] text-emerald-400 font-bold">
                              R$ {lead.monthly_revenue.toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                        {lead.updated_at && (
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-medium">
                            <Clock size={11} />
                            <span>{formatRelativeTime(lead.updated_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredLeads.filter(l => l.status?.trim().toUpperCase() === col.name?.trim().toUpperCase()).length === 0 && (
                <div className="border border-dashed border-zinc-800/50 rounded-[2rem] h-32 flex flex-col items-center justify-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest p-6 text-center bg-zinc-900/10">
                  <Layout size={24} className="mb-2 opacity-20" />
                  Nenhum lead nesta etapa
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Column Modal */}
      {isAddingColumn && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0c0c0e] border border-zinc-800/30 rounded-[3rem] p-10 w-full max-w-sm shadow-[20px_20px_40px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 relative">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold tracking-tight">Nova Coluna</h2>
              <button onClick={() => setIsAddingColumn(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-8">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Nome da Coluna</label>
              <input
                autoFocus
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Ex: Pós-Venda"
                className="w-full bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsAddingColumn(false)}
                className="flex-1 py-4 bg-[#0c0c0e] shadow-[6px_6px_12px_#050506,-6px_-6px_12px_#131316] rounded-2xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={addColumn}
                className="flex-1 py-4 bg-indigo-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Check size={14} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddingLead && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0c0c0e] border border-zinc-800/30 rounded-[3rem] p-10 w-full max-w-md shadow-[20px_20px_40px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <h2 className="text-xl font-bold tracking-tight">Novo Lead</h2>
              <button onClick={() => setIsAddingLead(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 mb-8 min-h-0">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Nome Completo *</label>
                <input
                  autoFocus
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="w-full bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="+55 11 99999-9999"
                  className="w-full bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">E-mail</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  className="w-full bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Nome da Empresa</label>
                <input
                  type="text"
                  value={newLead.company_name}
                  onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                  placeholder="Ex: Tech Solutions Ltda"
                  className="w-full bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Faturamento Mensal (R$)</label>
                <input
                  type="number"
                  value={newLead.monthly_revenue}
                  onChange={(e) => setNewLead({ ...newLead, monthly_revenue: e.target.value })}
                  placeholder="Ex: 50000"
                  className="w-full bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Coluna Inicial</label>
                <select
                  value={newLead.status}
                  onChange={(e) => setNewLead({ ...newLead, status: e.target.value })}
                  className="w-full bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium appearance-none"
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.name} className="bg-[#0c0c0e]">{col.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 shrink-0">
              <button
                onClick={() => setIsAddingLead(false)}
                disabled={isCreating}
                className="flex-1 py-4 bg-[#0c0c0e] shadow-[6px_6px_12px_#050506,-6px_-6px_12px_#131316] rounded-2xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={createLead}
                disabled={isCreating}
                className="flex-1 py-4 bg-indigo-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} /> <span>Criar Lead</span>
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
        historyCache={detailsModal.lead ? leadsHistory[detailsModal.lead.id] : []}
        onViewConversation={() => {
          if (detailsModal.lead) {
            onSelectChat(detailsModal.lead.id);
            setDetailsModal({ isOpen: false, lead: null });
          }
        }}
      />

      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        onConfirm={() => { }}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Entendido"
        type="warning"
        hideCancel={true}
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
