
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
import { INITIAL_COLUMNS } from '../constants';

const BORDER_COLORS = [
  '#fbbf24', // yellow
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7'  // purple
];

interface KanbanProps {
  searchQuery: string;
  filteredLeads: Lead[];
  onLeadsUpdate: (leads: Lead[]) => void;
}

const Kanban: React.FC<KanbanProps> = ({ searchQuery, filteredLeads, onLeadsUpdate }) => {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

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

  const onDrop = useCallback((e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    const updated = filteredLeads.map(lead => 
      lead.id === leadId ? { ...lead, status: targetStatus } : lead
    );
    onLeadsUpdate(updated);
    setDraggingId(null);
  }, [filteredLeads, onLeadsUpdate]);

  const addColumn = () => {
    if (!newColumnName.trim()) return;
    const id = newColumnName.toLowerCase().replace(/\s+/g, '-');
    setColumns([...columns, { id, label: newColumnName }]);
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const removeColumn = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta coluna? Os leads nela não serão deletados.')) {
      setColumns(columns.filter(c => c.id !== id));
    }
  };

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
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/10">
            <Plus size={16} />
            <span>Novo Lead</span>
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scroll-smooth">
        {columns.map(col => (
          <div 
            key={col.id} 
            className="flex-shrink-0 w-80 flex flex-col group"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <h3 className="text-sm font-semibold text-zinc-300">{col.label}</h3>
                <span className="text-[10px] bg-zinc-800/80 text-zinc-500 px-1.5 py-0.5 rounded-md">
                  {filteredLeads.filter(l => l.status === col.id).length}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => removeColumn(col.id)}
                  className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 kanban-column overflow-y-auto pr-1">
              {filteredLeads.filter(lead => lead.status === col.id).map((lead) => {
                const borderColor = BORDER_COLORS[parseInt(lead.id) % BORDER_COLORS.length];
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
                             <img src={lead.avatar} alt={lead.name} className="w-11 h-11 rounded-full border border-zinc-800 shadow-md" />
                             {lead.unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#121214]">
                                  {lead.unreadCount}
                                </span>
                             )}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-semibold tracking-tight">{lead.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{lead.phone}</p>
                          </div>
                        </div>
                        <button className="text-zinc-700 hover:text-zinc-400">
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      <p className="text-[11px] text-zinc-400 italic mb-4 mt-2 px-1 line-clamp-2">
                        "{lead.lastMessage}"
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/40">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <Clock size={11} className="text-zinc-600" />
                            <span>{lead.lastActive}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <MessageSquare size={11} className="text-zinc-600" />
                            <span>Zap</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-[12px] font-bold text-zinc-300">
                          <span className="text-zinc-600 font-medium">R$</span>
                          {lead.value.toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredLeads.filter(l => l.status === col.id).length === 0 && (
                <div className="border-2 border-dashed border-zinc-900/50 rounded-2xl h-24 flex flex-col items-center justify-center text-zinc-700 text-xs italic p-4 text-center">
                  Vazio
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Column Modal Overlay */}
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
    </div>
  );
};

export default Kanban;
