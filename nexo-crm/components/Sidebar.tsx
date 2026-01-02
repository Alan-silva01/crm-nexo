
import React from 'react';
import {
  LayoutDashboard,
  Kanban as KanbanIcon,
  Users,
  MessageSquare,
  Settings,
  HelpCircle,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'kanban', icon: KanbanIcon, label: 'Kanban de Leads' },
    { id: 'leads', icon: Users, label: 'Contatos' },
    { id: 'chats', icon: MessageSquare, label: 'Conversas' },
    { id: 'analytics', icon: BarChart3, label: 'Relatórios' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-52'} flex flex-col h-full bg-[#09090b] border-r border-zinc-800/50 transition-all duration-300 relative z-20`}>
      <div className={`p-4 mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <img src="/favicon.svg" alt="Nexo Logo" className="w-8 h-8 min-w-[32px] rounded-lg shadow-lg shadow-indigo-500/20" />
        {!isCollapsed && <span className="font-semibold text-lg tracking-tight">nexo.</span>}
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-16 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-30"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={isCollapsed ? item.label : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all duration-200 group
              ${activeTab === item.id
                ? 'bg-zinc-800/80 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
          >
            <item.icon size={18} className={activeTab === item.id ? 'text-indigo-400' : 'group-hover:scale-110 transition-transform'} />
            {!isCollapsed && <span className="text-[12px] font-medium whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-3 space-y-1 border-t border-zinc-800/50">
        <button className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all duration-200`}>
          <Settings size={18} />
          {!isCollapsed && <span className="text-[12px] font-medium">Ajustes</span>}
        </button>
        <div className={`pt-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'w-10 h-10 justify-center' : 'gap-3 p-2'} rounded-xl bg-zinc-900/50 border border-zinc-800/50`}>
            <img src="https://picsum.photos/seed/user/100" alt="Avatar" className="w-6 h-6 rounded-full border border-zinc-700" />
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-medium truncate">João Silva</p>
                <p className="text-[8px] text-zinc-500 truncate">Administrador</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
