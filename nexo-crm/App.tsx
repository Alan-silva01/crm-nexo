// Redeploy Trigger: Stable State f4a106a
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Kanban from './components/Kanban';
import LeadsList from './components/LeadsList';
import CalendarPage from './components/Calendar';
import WhatsAppChat from './components/WhatsAppChat';
import DetailedAnalytics from './components/DetailedAnalytics';
import Settings from './components/Settings';
import UserAvatar from './components/UserAvatar';
import Auth from './components/Auth';
import { Bell, Search, Calendar, LogOut, Sun, Moon, Users, ArrowUpRight } from 'lucide-react';
import { Lead, LeadColumnHistory } from './types';
import { formatRelativeTime } from './src/lib/formatRelativeTime';
import { AuthProvider, useAuth } from './src/lib/AuthProvider';
import { ThemeProvider, useTheme } from './src/lib/ThemeContext';
import { leadsService } from './src/lib/leadsService';
import { supabase } from './src/lib/supabase';

const AppContent: React.FC = () => {
  const { user, session, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsHistory, setLeadsHistory] = useState<Record<string, LeadColumnHistory[]>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<LeadColumnHistory[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [externalSelectedLead, setExternalSelectedLead] = useState<Lead | null>(null);

  // Fetch columns and leads on session change
  useEffect(() => {
    if (session) {
      supabase
        .from('kanban_columns')
        .select('*')
        .eq('user_id', session.user.id)
        .order('position')
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setColumns(data);
          } else if (!error) {
            // Default columns if none exist
            setColumns([
              { id: '1', name: 'Novos Leads', position: 0 },
              { id: '2', name: 'Em Atendimento', position: 1 },
              { id: '3', name: 'Negociação', position: 2 },
              { id: '4', name: 'Venda Concluída', position: 3 }
            ]);
          }
        });

      leadsService.fetchLeads().then(data => {
        setLeads(data);
      });

      // Fetch initial history cache
      leadsService.fetchAllHistory().then(history => {
        const grouped = history.reduce((acc: Record<string, LeadColumnHistory[]>, item) => {
          if (!acc[item.lead_id]) acc[item.lead_id] = [];
          acc[item.lead_id].push(item);
          return acc;
        }, {});
        setLeadsHistory(grouped);

        // Take latest 5 for notifications
        setNotifications(history.slice(0, 5));
      });

      // Fetch user profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [session]);

  // Realtime subscription for leads
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Realtime update:', payload);

          if (payload.eventType === 'INSERT') {
            // Evitar duplicação: só adicionar se o lead ainda não existir na lista
            setLeads(prev => {
              const exists = prev.some(lead => lead.id === (payload.new as Lead).id);
              if (exists) return prev;
              return [payload.new as Lead, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(lead =>
              lead.id === payload.new.id ? { ...lead, ...payload.new as Lead } : lead
            ));
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Realtime subscription for kanban columns
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('columns-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Columns realtime update:', payload);

          if (payload.eventType === 'INSERT') {
            setColumns(prev => [...prev, payload.new as any].sort((a, b) => a.position - b.position));
          } else if (payload.eventType === 'UPDATE') {
            setColumns(prev => prev.map(col =>
              col.id === payload.new.id ? { ...col, ...payload.new as any } : col
            ).sort((a, b) => a.position - b.position));
          } else if (payload.eventType === 'DELETE') {
            setColumns(prev => prev.filter(col => col.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Realtime subscription for history
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('history-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_column_history',
          filter: `user_id=eq.${session.user.id}`
        },
        async (payload) => {
          console.log('History realtime update:', payload);
          const newHistory = payload.new as LeadColumnHistory;

          // Fetch the full record with joined column names and lead name
          const { data, error } = await supabase
            .from('lead_column_history')
            .select(`
                *,
                lead:leads!lead_id(name),
                from_column:kanban_columns!from_column_id(name),
                to_column:kanban_columns!to_column_id(name)
            `)
            .eq('id', newHistory.id)
            .single();

          if (data && !error) {
            setLeadsHistory(prev => {
              const leadId = data.lead_id;
              const existing = prev[leadId] || [];
              // Avoid duplicates
              if (existing.some(h => h.id === data.id)) return prev;
              return {
                ...prev,
                [leadId]: [data as LeadColumnHistory, ...existing]
              };
            });

            // Update notifications
            setNotifications(prev => [data as LeadColumnHistory, ...prev].slice(0, 5));
            setUnreadCount(prev => prev + 1);

            // Play notification sound
            try {
              const audio = new Audio('https://jreklrhamersmamdmjna.supabase.co/storage/v1/object/public/audio/Editor%20Clideo.mp3');
              audio.volume = 0.5;
              audio.play();
            } catch (err) {
              console.warn('Playback blocked or failed:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const filteredLeads = useMemo(() => {
    // Force leads to be an array and searchQuery to be a string
    const safeLeads = Array.isArray(leads) ? leads : [];
    const query = typeof searchQuery === 'string' ? searchQuery.trim() : '';

    if (!query) return safeLeads;

    const lower = query.toLowerCase();
    const queryDigits = query.replace(/\D/g, '');

    return safeLeads.filter(l => {
      // 1. Text Search (Name, Email, Status, Company, Last Message)
      const matchesText =
        (l.name && l.name.toLowerCase().includes(lower)) ||
        (l.email && l.email.toLowerCase().includes(lower)) ||
        (l.status && l.status.toLowerCase().includes(lower)) ||
        (l.company_name && l.company_name.toLowerCase().includes(lower)) ||
        (l.last_message && l.last_message.toLowerCase().includes(lower));

      if (matchesText) return true;

      // 2. Phone search - Normalized
      if (l.phone) {
        const phoneDigits = l.phone.replace(/\D/g, '');
        if (l.phone.includes(lower) || (queryDigits && phoneDigits.includes(queryDigits))) {
          return true;
        }
      }

      // 3. Search inside custom JSONB data (dados)
      if (l.dados && typeof l.dados === 'object') {
        try {
          const values = Object.values(l.dados);
          if (values.some(val => val && String(val).toLowerCase().includes(lower))) {
            return true;
          }
        } catch (e) {
          console.error("Error searching in dados JSONB", e);
        }
      }

      return false;
    });
  }, [searchQuery, leads]);

  // Default columns to show when there are no leads
  const DEFAULT_COLUMNS = [
    { id: 'default-1', name: 'NOVO', position: 0, is_default: true },
    { id: 'default-2', name: 'EM ATENDIMENTO', position: 1, is_default: true },
    { id: 'default-3', name: 'AGENDADO', position: 2, is_default: true },
    { id: 'default-4', name: 'CONCLUIDO', position: 3, is_default: true },
    { id: 'default-5', name: 'SEM INTERESSE', position: 4, is_default: true }
  ];

  // Dynamically compute effective columns based on leads
  const effectiveColumns = useMemo(() => {
    // If no leads, show default columns
    if (leads.length === 0) {
      return DEFAULT_COLUMNS;
    }

    // Get all unique statuses from leads
    const leadStatuses = new Set(
      leads
        .map(l => l.status?.trim().toUpperCase())
        .filter((s): s is string => !!s)
    );

    // Filter DB columns to only those with leads
    const dbColumnsWithLeads = columns.filter(col =>
      leadStatuses.has(col.name.trim().toUpperCase())
    );

    // Find orphaned statuses (statuses in leads that don't have a matching DB column)
    const dbStatusNames = new Set(columns.map(c => c.name.trim().toUpperCase()));
    const orphanedStatuses = leads
      .map(l => l.status)
      .filter((status): status is string => !!status && !dbStatusNames.has(status.trim().toUpperCase()));

    // Unique list of orphaned statuses
    const uniqueOrphans = Array.from(new Set(orphanedStatuses));

    const virtualColumns = uniqueOrphans.map((status, index) => ({
      id: `virtual-${status}`,
      name: status,
      position: dbColumnsWithLeads.length + index,
      is_virtual: true
    }));

    const result = [...dbColumnsWithLeads, ...virtualColumns].sort((a, b) => a.position - b.position);

    // If no columns have leads, show default columns
    if (result.length === 0) {
      return DEFAULT_COLUMNS;
    }

    return result;
  }, [columns, leads]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={() => { }} />;
  }

  const handleLeadsUpdate = async (updatedLeads: Lead[]) => {
    setLeads(updatedLeads);
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string, fromColumnId?: string | null, toColumnId?: string) => {
    // Find the lead to get its original status for potential rollback
    const originalLead = leads.find(l => l.id === leadId);
    if (!originalLead) {
      console.error(`Lead ${leadId} not found in state!`);
      return;
    }
    const originalStatus = originalLead.status;

    // Normalize newStatus against existing columns to avoid duplicate casings
    const targetCol = columns.find(c => c.name.trim().toUpperCase() === newStatus.trim().toUpperCase());
    const finalStatus = targetCol ? targetCol.name : newStatus;
    const finalToColumnId = targetCol ? targetCol.id : toColumnId;

    console.log(`Moving lead ${leadId} from "${originalStatus}" to "${finalStatus}"`);

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: finalStatus } : l));

    // Persist to Supabase
    const success = await leadsService.updateLead(leadId, { status: finalStatus });
    if (!success) {
      console.error('Error updating lead status, rolling back...');
      // Rollback
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: originalStatus } : l));
    }
    // History is now recorded automatically by the `on_lead_status_change` trigger in Supabase
  };

  const handleUpdateLeadGeneric = async (id: string, updates: Partial<Lead>) => {
    const success = await leadsService.updateLead(id, updates);
    if (success) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }
  };

  const handleAnalysisAction = (action: 'view-decision-kanban' | 'focus-decision') => {
    if (action === 'view-decision-kanban' || action === 'focus-decision') {
      setActiveTab('kanban');
      // In a more advanced version, we could set a filter state here
    }
  };

  const { theme, toggleTheme } = useTheme();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard leads={leads} columns={effectiveColumns} leadsHistory={leadsHistory} />;
      case 'kanban':
        return (
          <Kanban
            searchQuery={searchQuery}
            filteredLeads={filteredLeads}
            leadsHistory={leadsHistory}
            onLeadsUpdate={handleLeadsUpdate}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            columns={effectiveColumns}
            onColumnsUpdate={setColumns}
            onSelectChat={(id) => {
              setSelectedChatId(id);
              setActiveTab('chats');
            }}
            externalSelectedLead={externalSelectedLead}
            onClearExternalLead={() => setExternalSelectedLead(null)}
          />
        );
      case 'leads':
        return (
          <LeadsList
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filteredLeads={filteredLeads}
            onViewDetails={(lead) => {
              setExternalSelectedLead(lead);
              setActiveTab('kanban');
            }}
            onViewChat={(lead) => {
              setSelectedChatId(lead.id);
              setActiveTab('chats');
            }}
          />
        );
      case 'calendar':
        return (
          <CalendarPage
            leads={leads}
            onUpdateLead={handleUpdateLeadGeneric}
            leadsHistory={leadsHistory}
            onSelectChat={(id) => {
              setSelectedChatId(id);
              setActiveTab('chats');
            }}
          />
        );
      case 'chats':
        return (
          <WhatsAppChat
            leads={leads}
            onLeadsUpdate={handleLeadsUpdate}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
          />
        );
      case 'analytics':
        return <DetailedAnalytics leads={leads} onAction={handleAnalysisAction} />;
      case 'ajustes':
        return <Settings user={user} onUpdate={() => {/* User metadata updates are handled by Supabase session listener, but we could add manual refresh here if needed */ }} />;
      default:
        return <Dashboard leads={leads} columns={columns} leadsHistory={leadsHistory} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        user={user}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e] relative">
        <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-zinc-900/20 z-40">
          <div className="flex items-center gap-6 flex-1">
            {profile?.company_name && (
              <div className="flex items-center gap-2 pr-6 border-r border-zinc-800/50">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 whitespace-nowrap">
                  {profile.company_name}
                </span>
              </div>
            )}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Pesquisar contatos, mensagens ou telefones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-zinc-400 hover:text-indigo-400 transition-colors bg-zinc-900 border border-zinc-800 rounded-xl"
              title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] font-medium text-zinc-500">
              <Calendar size={12} />
              {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) setUnreadCount(0);
                }}
                className={`p-2 hover:bg-zinc-800 rounded-lg relative transition-colors ${showNotifications ? 'text-indigo-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full animate-pulse ring-2 ring-[#0c0c0e]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/5"
                    onClick={() => setShowNotifications(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-3 w-80 bg-[#0c0c0e] border border-zinc-800/80 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-white/10">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Notificações</h3>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold">Recent</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((notif, idx) => (
                          <div key={notif.id} className={`p-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${idx === 0 && unreadCount > 0 ? 'bg-indigo-500/5' : ''}`}>
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <Users size={12} className="text-indigo-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-zinc-100 font-medium leading-tight mb-1">
                                  <span className="text-indigo-400 font-bold">{notif.lead?.name || 'Lead'}</span> mudou de etapa
                                </p>
                                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">
                                  <span>{notif.from_column?.name || 'Início'}</span>
                                  <ArrowUpRight size={8} className="rotate-90" />
                                  <span className="text-zinc-300">{notif.to_column?.name}</span>
                                </div>
                                <p className="text-[9px] text-zinc-600 mt-1 font-medium">{formatRelativeTime(notif.moved_at)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-xs text-zinc-600 font-medium">Nenhuma notificação recente</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setShowNotifications(false);
                      }}
                      className="w-full p-3 text-center text-[10px] font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all border-t border-zinc-800 bg-zinc-900/30"
                    >
                      Ver Atividades
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
              <div className="text-right">
                <p className="text-[11px] font-semibold leading-none">{(user?.user_metadata?.full_name || session?.user?.email) ?? 'Usuário'}</p>
                <button onClick={signOut} className="text-[9px] text-zinc-500 mt-1 flex items-center justify-end gap-1 hover:text-red-400 transition-colors">
                  Sair da conta <LogOut size={10} />
                </button>
              </div>
              <UserAvatar name={user?.user_metadata?.full_name} email={user?.email} size="md" className="border-2 border-indigo-500/20 shadow-sm" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
