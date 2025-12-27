import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Kanban from './components/Kanban';
import LeadsList from './components/LeadsList';
import WhatsAppChat from './components/WhatsAppChat';
import DetailedAnalytics from './components/DetailedAnalytics';
import Auth from './components/Auth';
import { Bell, Search, Calendar, LogOut } from 'lucide-react';
import { INITIAL_LEADS } from './constants';
import { Lead } from './types';
import { AuthProvider, useAuth } from './src/lib/AuthProvider';

const AppContent: React.FC = () => {
  const { session, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const lower = searchQuery.toLowerCase();
    return leads.filter(l =>
      l.name.toLowerCase().includes(lower) ||
      l.phone.includes(lower) ||
      l.lastMessage.toLowerCase().includes(lower)
    );
  }, [searchQuery, leads]);

  if (loading) {
    return null;
  }

  if (!session) {
    return <Auth onLogin={() => { }} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'kanban':
        return <Kanban searchQuery={searchQuery} filteredLeads={filteredLeads} onLeadsUpdate={setLeads} />;
      case 'leads':
        return <LeadsList searchQuery={searchQuery} filteredLeads={filteredLeads} />;
      case 'chats':
        return <WhatsAppChat leads={leads} onLeadsUpdate={setLeads} />;
      case 'analytics':
        return <DetailedAnalytics />;
      default:
        return <Dashboard />;
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
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar contatos, mensagens ou telefones..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 text-[11px] font-medium">
              <Calendar size={14} />
              <span>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="relative">
              <button className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <Bell size={16} />
              </button>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-2 ring-[#0c0c0e]"></span>
            </div>
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-zinc-800/50">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-semibold leading-none">{session?.user?.email ?? 'Usuário'}</p>
                <button
                  onClick={signOut}
                  className="text-[9px] text-zinc-500 mt-1 flex items-center justify-end gap-1 hover:text-red-400 transition-colors"
                >
                  Sair da conta <LogOut size={10} />
                </button>
              </div>
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                <img src="https://picsum.photos/seed/face/100" alt="Profile" className="w-full h-full object-cover" />
              </div>
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

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
