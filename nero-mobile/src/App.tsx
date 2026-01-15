import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import { Login } from './components/Login';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { Lead } from './lib/supabase';
import './App.css';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      {selectedLead ? (
        <ChatView
          lead={selectedLead}
          onBack={() => setSelectedLead(null)}
        />
      ) : (
        <>
          <header className="app-header">
            <h1>NERO Mobile</h1>
            <button onClick={signOut}>Sair</button>
          </header>
          <ChatList
            onSelectLead={setSelectedLead}
            selectedLeadId={selectedLead?.id}
          />
        </>
      )}
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
