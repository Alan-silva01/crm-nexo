import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import { Login } from './components/Login';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import type { Lead } from './lib/supabase';
import { LogOut, Sun, Moon, Home, MessageSquare, Bell, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('nero-mobile-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('nero-mobile-theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0c0c0e] dark:bg-[#0c0c0e] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium animate-pulse">Iniciando Nero...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-500">
      <AnimatePresence mode="wait">
        {selectedLead ? (
          <motion.div
            key="chat-view"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-[var(--bg-main)]"
          >
            <ChatView
              lead={selectedLead}
              onBack={() => setSelectedLead(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="chat-list"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="flex flex-col h-full"
          >
            <header className="px-6 py-5 flex justify-between items-center border-b border-[var(--border-base)] bg-[var(--bg-sidebar)]/80 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="text-white font-black text-xl">N</span>
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-[var(--text-main)] to-[var(--text-muted)] bg-clip-text text-transparent">
                    NERO
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--border-base)] text-zinc-400 hover:text-[var(--text-main)] transition-all active:scale-90"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={signOut}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
              <ChatList
                onSelectLead={setSelectedLead}
                selectedLeadId={undefined}
              />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 px-6 py-4 bg-[var(--bg-sidebar)]/80 backdrop-blur-xl border-t border-[var(--border-base)] flex justify-between items-center z-20">
              <button className="flex flex-col items-center gap-1 text-zinc-500 transition-colors">
                <Home size={22} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-indigo-500 transition-colors">
                <MessageSquare size={22} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Mensagens</span>
              </button>
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 -mt-8 border-4 border-[var(--bg-main)] active:scale-90 transition-transform">
                <span className="text-xl font-bold">+</span>
              </div>
              <button className="flex flex-col items-center gap-1 text-zinc-500 transition-colors">
                <Bell size={22} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Alertas</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-zinc-500 transition-colors">
                <UserIcon size={22} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Perfil</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
