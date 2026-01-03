import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Kanban from './components/Kanban';
import LeadsList from './components/LeadsList';
import WhatsAppChat from './components/WhatsAppChat';
import DetailedAnalytics from './components/DetailedAnalytics';
import Auth from './components/Auth';
import { Bell, Search, Calendar, LogOut } from 'lucide-react';
import { Lead } from './types';
import { AuthProvider, useAuth } from './src/lib/AuthProvider';
import { leadsService } from './src/lib/leadsService';
import { supabase } from './src/lib/supabase';

const AppContent: React.FC = () => {
  const { session, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Fetch leads on session change
  useEffect(() => {
    if (session) {
      leadsService.fetchLeads().then(data => {
        setLeads(data);
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
            setLeads(prev => [payload.new as Lead, ...prev]);
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

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const lower = searchQuery.toLowerCase();
    return leads.filter(l =>
      l.name?.toLowerCase().includes(lower) ||
      (l.phone && l.phone.includes(lower)) ||
      (l.email && l.email.toLowerCase().includes(lower)) ||
      (l.lastMessage && l.lastMessage.toLowerCase().includes(lower))
    );
  }, [searchQuery, leads]);

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

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    // Find the lead to get its original status for potential rollback
    const originalLead = leads.find(l => l.id === leadId);
    if (!originalLead) {
      console.error(`Lead ${leadId} not found in state!`);
      return;
    }
    const originalStatus = originalLead.status;

    console.log(`Moving lead ${leadId} from "${originalStatus}" to "${newStatus}"`);

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    // Persist to Supabase
    const success = await leadsService.updateLead(leadId, { status: newStatus });
    if (!success) {
      console.error('Error updating lead status, rolling back...');
      // Rollback
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: originalStatus } : l));
    } else {
      console.log(`Lead ${leadId} successfully moved to "${newStatus}"`);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard leads={leads} />;
      case 'kanban':
        return (
          <Kanban
            searchQuery={searchQuery}
            filteredLeads={filteredLeads}
            onLeadsUpdate={handleLeadsUpdate}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onSelectChat={(id) => {
              setSelectedChatId(id);
              setActiveTab('chats');
            }}
          />
        );
      case 'leads':
        return <LeadsList searchQuery={searchQuery} filteredLeads={filteredLeads} />;
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
        return <DetailedAnalytics />;
      default:
        return <Dashboard leads={leads} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e] relative">
        <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-zinc-900/20 z-10">
          <div className="flex items-center gap-4 flex-1">
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] font-medium text-zinc-500">
              <Calendar size={12} />
              {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <button className="p-2 hover:bg-zinc-800 rounded-lg relative text-zinc-400 hover:text-white transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
              <div className="text-right">
                <p className="text-[11px] font-semibold leading-none">{session?.user?.email ?? 'Usuário'}</p>
                <button onClick={signOut} className="text-[9px] text-zinc-500 mt-1 flex items-center justify-end gap-1 hover:text-red-400 transition-colors">
                  Sair da conta <LogOut size={10} />
                </button>
              </div>
              <img src={`https://picsum.photos/seed/${session?.user?.id}/100`} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-indigo-500/20 shadow-sm" />
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;
