import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import { Login } from './components/Login';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import type { Lead } from './lib/supabase';
import { LogOut, Sun, Moon } from 'lucide-react';
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
    <div className="flex flex-col h-screen overflow-hidden bg-var(--bg-main) text-var(--text-main)">
      <AnimatePresence mode="wait">
        {selectedLead ? (
          <motion.div
            key="chat-view"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#0c0c0e] light:bg-white"
          >
            <ChatView
              lead={selectedLead}
              onBack={() => setSelectedLead(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="chat-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 light:border-black/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="text-white font-bold">N</span>
                </div>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent light:from-black light:to-zinc-600">
                  NERO Mobile
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl bg-white/5 light:bg-black/5 text-zinc-400 hover:text-white transition-colors"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={signOut}
                  className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-safe">
              <ChatList
                onSelectLead={setSelectedLead}
                selectedLeadId={selectedLead ? selectedLead.id : undefined}
              />
            </main>
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
