
import React from 'react';
import { Search, Filter, MoreHorizontal, Download, UserPlus, Phone, Mail } from 'lucide-react';
import { STATUS_LABELS } from '../constants';
import { Lead } from '../types';
import { formatPhoneNumber } from '../src/lib/formatPhone';

interface LeadsListProps {
  searchQuery: string;
  filteredLeads: Lead[];
}

const LeadsList: React.FC<LeadsListProps> = ({ searchQuery, filteredLeads }) => {
  return (
    <div className="p-8 h-full flex flex-col space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Base de Contatos</h1>
          <p className="text-zinc-500 text-sm">Gerencie todos os seus leads e clientes em um só lugar.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium hover:bg-zinc-800 transition-colors">
            <Download size={14} />
            Exportar CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg">
            <UserPlus size={14} />
            Novo Contato
          </button>
        </div>
      </header>

      <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            Mostrando <span className="text-zinc-200 font-bold">{filteredLeads.length}</span> contatos
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors">
            <Filter size={14} />
            Filtros Avançados
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/40 border-b border-zinc-800/50 text-center sm:text-left">
                <th className="px-6 py-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">E-mail</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={lead.avatar || `https://picsum.photos/seed/${lead.name}/200`}
                        className="w-8 h-8 rounded-full border border-zinc-800"
                        alt={lead.name}
                      />
                      <div>
                        <div className="text-xs font-medium">{lead.name}</div>
                        <div className="text-[10px] text-zinc-500">{formatPhoneNumber(lead.phone) || 'Sem telefone'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-medium border ${lead.status === 'new' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      lead.status === 'contacted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        lead.status === 'negotiation' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                      {STATUS_LABELS[lead.status || 'new'] || 'Novo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-zinc-500 whitespace-nowrap">
                    {lead.email || 'Sem e-mail'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 transition-colors">
                        <Phone size={14} />
                      </button>
                      <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors">
                        <Mail size={14} />
                      </button>
                      <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 text-sm">
                    {searchQuery ? `Nenhum contato corresponde à sua pesquisa "${searchQuery}"` : 'Nenhum contato encontrado. Crie seu primeiro lead!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredLeads.length > 0 && (
          <div className="p-4 border-t border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-4">
            <div>Total: {filteredLeads.length} contatos</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsList;
