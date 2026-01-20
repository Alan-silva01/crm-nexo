// Redeploy Trigger: Stable State f4a106a
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Kanban from './components/Kanban';
import LeadsList from './components/LeadsList';
import CalendarPage from './components/Calendar';
import WhatsAppChat from './components/WhatsAppChat';
import DetailedAnalytics from './components/DetailedAnalytics';
import Broadcasts from './components/Broadcasts';
import Labels from './components/Labels';
import Settings from './components/Settings';
import UserAvatar from './components/UserAvatar';
import Auth from './components/Auth';
import { Bell, Search, Calendar, LogOut, Sun, Moon, Users, ArrowUpRight } from 'lucide-react';
import { Lead, LeadColumnHistory } from './types';
import { formatRelativeTime } from './src/lib/formatRelativeTime';
import { AuthProvider, useAuth } from './src/lib/AuthProvider';
import { ThemeProvider, useTheme } from './src/lib/ThemeContext';
import { leadsService } from './src/lib/leadsService';
import { tagsService, Tag } from './src/lib/tagsService';
import { supabase } from './src/lib/supabase';

const AppContent: React.FC = () => {
  const { user, session, loading, signOut, effectiveUserId, userType } = useAuth();

  // Persistir activeTab no localStorage para manter navegação após refresh
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('nero_active_tab');
      return savedTab || 'dashboard';
    } catch (e) { }
    return 'dashboard';
  });

  // Salvar activeTab sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem('nero_active_tab', activeTab);
    } catch (e) { }
  }, [activeTab]);

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);


  // Leads são carregados do banco - começar vazio para evitar flash de dados desatualizados
  const [leads, setLeads] = useState<Lead[]>([]);

  const leadsRef = useRef<Lead[]>(leads);
  const lastNotificationTimeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  const [leadsHistory, setLeadsHistory] = useState<Record<string, LeadColumnHistory[]>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Load persisted selected chat when effectiveUserId is known
  useEffect(() => {
    if (effectiveUserId) {
      const stored = localStorage.getItem(`nero_selected_chat_${effectiveUserId}`);
      if (stored) setSelectedChatId(stored);
    }
  }, [effectiveUserId]);

  // Persist selected chat per user
  useEffect(() => {
    if (selectedChatId && effectiveUserId) {
      localStorage.setItem(`nero_selected_chat_${effectiveUserId}`, selectedChatId);
    }
  }, [selectedChatId, effectiveUserId]);

  // UI helper: button to clear all caches (dev only)
  const clearAllCaches = () => {
    const keys = [
      'nero_leads_cache_generic',
      ...Object.keys(localStorage).filter(k => k.startsWith('nero_leads_cache_')),
      ...Object.keys(localStorage).filter(k => k.startsWith('nero_history_cache_')),
      ...Object.keys(localStorage).filter(k => k.startsWith('nero_columns_cache_')),
      ...Object.keys(localStorage).filter(k => k.startsWith('nero_tags_cache_')),
      ...Object.keys(localStorage).filter(k => k.startsWith('nero_profile_cache_')),
      ...Object.keys(localStorage).filter(k => k.startsWith('nero_selected_chat_')),
    ];
    keys.forEach(k => localStorage.removeItem(k));
    console.log('App: All caches cleared');
    window.location.reload();
  };

  // If no chat selected yet and leads are loaded, select first lead
  useEffect(() => {
    if (!selectedChatId && leads.length > 0) {
      setSelectedChatId(leads[0].id);
    }
  }, [leads, selectedChatId]);

  // Reset selectedChatId if leads become empty
  useEffect(() => {
    if (leads.length === 0) {
      setSelectedChatId(null);
    }
  }, [leads]);
  const [columns, setColumns] = useState<any[]>([]);

  // History e columns são carregados do banco - sem cache

  const [notifications, setNotifications] = useState<LeadColumnHistory[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Tags - centralizadas igual leads e columns
  const [tags, setTags] = useState<Tag[]>(() => {
    // Não restaurar do cache na inicialização pois precisamos do effectiveUserId
    return [];
  });

  // Tags são carregadas do banco - sem cache

  // Restaurar profile do cache para evitar delay no nome da empresa
  // Também é user-specific para atendentes verem o profile do admin correto
  const [profile, setProfile] = useState<any>(null);

  // Profile é carregado do banco - sem cache

  const [externalSelectedLead, setExternalSelectedLead] = useState<Lead | null>(null);

  // RECOVERY: Se tem sessão mas não tem effectiveUserId, tentar buscar novamente
  // Isso cobre o cenário onde AuthProvider timeout acontece antes de fetchUserInfo completar
  useEffect(() => {
    if (!loading && session && !effectiveUserId) {
      console.log('App: ⚠️ RECOVERY - Session exists but no effectiveUserId, forcing refresh...');
      // Forçar re-fetch do userInfo
      const recoveryFetch = async () => {
        try {
          const { tenantService } = await import('./src/lib/tenantService');
          const userInfo = await tenantService.getCurrentUserInfo(session.user.id);
          if (userInfo) {
            console.log('App: ✅ RECOVERY SUCCESS - Got effectiveUserId:', userInfo.tenantId);
            // O AuthProvider vai atualizar via seu próprio cache, mas podemos forçar refresh aqui
            window.location.reload();
          } else {
            console.error('App: ❌ RECOVERY FAILED - No userInfo found');
          }
        } catch (e) {
          console.error('App: ❌ RECOVERY ERROR:', e);
        }
      };

      // Aguardar um pouco antes de tentar recovery (para dar tempo ao AuthProvider)
      const timer = setTimeout(recoveryFetch, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, session, effectiveUserId]);

  // Fetch columns and leads on session change
  console.log('[AppContent] render state:', {
    loading,
    hasSession: !!session,
    userId: user?.id,
    effectiveUserId,
    userType
  });

  useEffect(() => {
    console.log('App useEffect [session, effectiveUserId]:', {
      hasSession: !!session,
      effectiveUserId,
      userType
    });

    // Só busca dados se effectiveUserId está realmente pronto (não vazio/null)
    if (session && effectiveUserId && effectiveUserId.length > 10) {
      console.log('App: Fetching data for effectiveUserId:', effectiveUserId);

      const fetchData = async () => {
        const rid = Math.random().toString(36).substring(7);
        console.log(`[${rid}] App fetchData starting for ${effectiveUserId}...`);

        // NOTA: Se chegamos aqui, effectiveUserId está disponível, o que significa
        // que o AuthProvider já validou a sessão. Prosseguir direto para buscar dados.

        // Fetch columns
        try {
          console.log(`[${rid}] Fetching columns...`);

          // Add timeout to prevent infinite hang
          const columnsPromise = supabase
            .from('kanban_columns')
            .select('*')
            .eq('user_id', effectiveUserId)
            .order('position');

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Columns query timeout')), 15000)
          );

          const { data: cols, error: colsError } = await Promise.race([
            columnsPromise,
            timeoutPromise
          ]) as any;

          console.log(`[${rid}] Columns query completed. Data:`, cols, 'Error:', colsError);

          if (colsError) {
            console.error(`[${rid}] Error fetching columns:`, colsError);
          } else if (cols && cols.length > 0) {
            setColumns(cols);
          } else {
            console.log(`[${rid}] No columns found, setting defaults.`);
            setColumns([
              { id: '1', name: 'NOVO LEAD', position: 0 },
              { id: '2', name: 'EM ATENDIMENTO', position: 1 },
              { id: '3', name: 'QUALIFICADO', position: 2 },
              { id: '4', name: 'CONCLUIDO', position: 3 }
            ]);
          }
        } catch (e) {
          console.error(`[${rid}] CRITICAL: Columns fetch crashed:`, e);
          // Set defaults even on error
          setColumns([
            { id: '1', name: 'NOVO LEAD', position: 0 },
            { id: '2', name: 'EM ATENDIMENTO', position: 1 },
            { id: '3', name: 'QUALIFICADO', position: 2 },
            { id: '4', name: 'CONCLUIDO', position: 3 }
          ]);
        }

        // Fetch Leads
        try {
          console.log(`[${rid}] Fetching leads...`);
          const fetchedLeads = await leadsService.fetchLeads(effectiveUserId);
          console.log(`[${rid}] fetchLeads returned:`, fetchedLeads);
          setLeads(fetchedLeads);
          // Salvar no cache para próximo load ser instantâneo
          try {
            localStorage.setItem('nero_leads_cache', JSON.stringify(fetchedLeads));
          } catch (e) { }
          console.log(`[${rid}] App: Fetched leads count: ${fetchedLeads.length}`);
        } catch (e) {
          console.error(`[${rid}] CRITICAL: Leads fetch crashed:`, e);
          // Não limpar leads se já tiver do cache
        }

        // Fetch History
        try {
          console.log(`[${rid}] Fetching history...`);
          const history = await leadsService.fetchAllHistory(effectiveUserId);
          const grouped = history.reduce((acc: Record<string, LeadColumnHistory[]>, item) => {
            if (!acc[item.lead_id]) acc[item.lead_id] = [];
            acc[item.lead_id].push(item);
            return acc;
          }, {});
          setLeadsHistory(grouped);
          setNotifications(history.slice(0, 5));
          console.log(`[${rid}] Fetched ${history.length} history items.`);
        } catch (e) {
          console.error(`[${rid}] CRITICAL: History fetch crashed:`, e);
        }

        // Fetch Profile
        try {
          console.log(`[${rid}] Fetching profile...`);
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', effectiveUserId)
            .single();

          if (profileData && !profileError) {
            let loggedName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Usuário');

            if (effectiveUserId !== user?.id) {
              const { data: atendente } = await supabase
                .from('atendentes')
                .select('nome')
                .eq('user_id', user?.id)
                .maybeSingle();
              if (atendente) loggedName = atendente.nome;
            }

            setProfile({
              ...profileData,
              logged_user_name: loggedName
            });
            console.log(`[${rid}] App: Profile loaded: ${profileData.company_name}, disparos: ${profileData.disparos} (type: ${typeof profileData.disparos})`);
          } else if (profileError) {
            console.error(`[${rid}] App: Error fetching profile:`, profileError);
          }
        } catch (e) {
          console.error(`[${rid}] CRITICAL: Profile fetch crashed:`, e);
        }

        // Fetch Tags (centralized like leads and columns)
        try {
          console.log(`[${rid}] Fetching tags...`);
          const fetchedTags = await tagsService.listTags();
          setTags(fetchedTags);
          console.log(`[${rid}] App: Fetched tags count: ${fetchedTags.length}`);
        } catch (e) {
          console.error(`[${rid}] CRITICAL: Tags fetch crashed:`, e);
        }

        console.log(`[${rid}] App fetchData completed.`);
      };

      fetchData();
    }
  }, [effectiveUserId]); // Simplificado: depende apenas de effectiveUserId

  // Função centralizada para tocar som com debounce
  const playNotificationSound = useCallback((leadId?: string, isKanban: boolean = false) => {
    const now = Date.now();
    if (leadId) {
      const lastTime = lastNotificationTimeRef.current[leadId] || 0;
      if (now - lastTime < 3000) return; // Debounce de 3s por lead
      lastNotificationTimeRef.current[leadId] = now;
    }

    try {
      // Som do Kanban (antigo) vs Som de Intervenção (novo)
      const url = isKanban
        ? 'https://jreklrhamersmamdmjna.supabase.co/storage/v1/object/public/audio/Editor%20Clideo.mp3'
        : 'https://jreklrhamersmamdmjna.supabase.co/storage/v1/object/public/audio/Audio%20Clideo.mp3';

      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('Browser bloqueou o autoplay:', e));
    } catch (e) {
      console.error('Erro ao tocar som:', e);
    }
  }, []);

  // Realtime subscription for leads
  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${effectiveUserId}`
        },
        (payload) => {
          const now = Date.now();
          console.log('📡 REALTIME EVENT:', payload.eventType, 'for lead:', payload.new?.id || payload.old?.id);

          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            console.log('➕ INSERT:', newLead.name, 'notifica_humano:', newLead.notifica_humano);

            setLeads(prev => {
              const exists = prev.some(lead => lead.id === newLead.id);
              if (exists) return prev;

              if (newLead.notifica_humano) {
                console.log('🔊 Playing sound for INSERT with notifica_humano=true');
                playNotificationSound(newLead.id);
              }
              return [newLead, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const newLead = payload.new as Lead;

            console.log('🔄 UPDATE Event Received:', {
              leadId: newLead.id,
              leadName: newLead.name,
              payloadKeys: Object.keys(payload.new),
              notifica_humano: newLead.notifica_humano,
              resumo_ia: newLead.resumo_ia
            });

            // Buscar o lead atual da lista
            const currentLeads = leadsRef.current;
            const oldLead = currentLeads.find(l => l.id === newLead.id);

            console.log('🔍 Old Lead State:', {
              found: !!oldLead,
              oldNotificaHumano: oldLead?.notifica_humano,
              newNotificaHumano: newLead.notifica_humano
            });

            // LÓGICA SIMPLIFICADA: se notifica_humano é true E era false (ou não existia), notificar
            const shouldNotify = newLead.notifica_humano === true &&
              (!oldLead || oldLead.notifica_humano !== true);

            console.log('🎯 Should Notify?', shouldNotify);

            if (shouldNotify) {
              console.log('🚨🚨🚨 NOTIFICAÇÃO ATIVADA! Lead:', newLead.name);
              playNotificationSound(newLead.id);
            }

            // Atualizar o lead na lista
            setLeads(prev => prev.map(lead =>
              lead.id === newLead.id ? { ...lead, ...newLead } : lead
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
  }, [session?.user?.id, effectiveUserId]);

  // Realtime subscription for kanban columns
  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel('columns-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns',
          filter: `user_id=eq.${effectiveUserId}`
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
  }, [session?.user?.id, effectiveUserId]);

  // Realtime subscription for history
  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel('history-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_column_history',
          filter: `user_id=eq.${effectiveUserId}`
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

            // Play notification sound with debounce (using kanban sound)
            playNotificationSound(data.lead_id, true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, effectiveUserId]);

  const filteredLeads = useMemo(() => {
    // Force leads to be an array and searchQuery to be a string
    const safeLeads = Array.isArray(leads) ? leads : [];
    const query = typeof searchQuery === 'string' ? searchQuery.trim() : '';

    // First, filter by selected tags (multi-select)
    let result = safeLeads;
    if (selectedTagFilters.length > 0) {
      result = result.filter(l => {
        if (!l.tags || l.tags.length === 0) return false;
        // Lead must have ALL selected tags
        return selectedTagFilters.every(selectedTag =>
          l.tags!.some(leadTag => leadTag.toLowerCase() === selectedTag.toLowerCase())
        );
      });
    }

    // Then, apply text search if query exists
    if (!query) return result;

    const lower = query.toLowerCase();
    const queryDigits = query.replace(/\D/g, '');

    // Check if query exactly matches a tag name (for precise tag filtering via search box)
    const isExactTagMatch = tags.some(t => t.name.toLowerCase() === lower);

    return result.filter(l => {
      // If searching for an exact tag, only match leads that have that tag
      if (isExactTagMatch) {
        return l.tags && l.tags.some(tag => tag.toLowerCase() === lower);
      }

      // Otherwise, do general text search
      // 1. Text Search (Name, Email, Status, Company, Last Message)
      const matchesText =
        (l.name && l.name.toLowerCase().includes(lower)) ||
        (l.email && l.email.toLowerCase().includes(lower)) ||
        (l.status && l.status.toLowerCase().includes(lower)) ||
        (l.company_name && l.company_name.toLowerCase().includes(lower)) ||
        (l.last_message && l.last_message.toLowerCase().includes(lower)) ||
        (l.tags && l.tags.some(tag => tag.toLowerCase().includes(lower)));

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
  }, [searchQuery, leads, selectedTagFilters, tags]);


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
      // Se não tem leads, mostra todas as colunas do banco
      // Se não tem colunas no banco, mostra defaults
      return columns.length > 0 ? columns : DEFAULT_COLUMNS;
    }

    // Get all unique statuses from leads
    const leadStatuses = new Set(
      leads
        .map(l => l.status?.trim().toUpperCase())
        .filter((s): s is string => !!s)
    );

    // Mostrar TODAS as colunas do banco, não apenas as com leads
    const dbColumns = [...columns];

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
      position: dbColumns.length + index,
      is_virtual: true
    }));

    const result = [...dbColumns, ...virtualColumns].sort((a, b) => a.position - b.position);

    // Se não tem nenhuma coluna, mostra defaults
    if (result.length === 0) {
      return DEFAULT_COLUMNS;
    }

    return result;
  }, [columns, leads]);

  // Alerta crítico se houver algum lead precisando de humano
  const hasHumanNotification = useMemo(() =>
    leads.some(l => l.notifica_humano === true),
    [leads]
  );

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
            effectiveUserId={effectiveUserId || ''}
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
            showTags={profile?.disparos}
            availableTags={tags}
            selectedTagFilters={selectedTagFilters}
            onTagFiltersChange={setSelectedTagFilters}
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
            leads={filteredLeads}

            onLeadsUpdate={handleLeadsUpdate}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            chatTableName={profile?.chat_table_name}
          />
        );
      case 'analytics':
        return <DetailedAnalytics leads={leads} onAction={handleAnalysisAction} />;
      case 'etiquetas':
        return <Labels tags={tags} onTagsUpdate={setTags} />;
      case 'broadcasts':
        // Only redirect if profile is loaded AND disparos is explicitly false
        if (profile && profile.disparos === false) {
          setActiveTab('leads');
          return null;
        }
        // If profile not loaded yet, show the component (Sidebar already filters)
        return <Broadcasts leads={leads} profile={profile} availableTags={tags} />;
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
        profile={profile}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e] relative">
        <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-zinc-900/20 z-40">
          <div className="flex items-center gap-6 flex-1">
            {profile?.company_name && (
              <div className="flex flex-col pr-6 border-r border-zinc-800/50">
                <span className="text-sm font-black uppercase tracking-wider text-indigo-500 whitespace-nowrap">
                  {profile.company_name}
                </span>
                {profile.logged_user_name && (
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {profile.logged_user_name}
                  </span>
                )}
              </div>
            )}
            <div className="relative flex-1 max-w-sm xl:max-w-md 2xl:max-w-lg">
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
                className={`p-2 hover:bg-zinc-800 rounded-lg relative transition-all duration-300 ${showNotifications ? 'text-indigo-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'}
                  ${hasHumanNotification ? 'text-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20' : ''}`}
              >
                <Bell size={18} className={hasHumanNotification ? 'animate-bounce' : ''} />
                {(unreadCount > 0 || hasHumanNotification) && (
                  <span className={`absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-white text-[9px] font-bold rounded-full animate-pulse ring-2 ring-[#0c0c0e] ${hasHumanNotification ? 'bg-rose-600' : 'bg-rose-500'}`}>
                    {hasHumanNotification ? '!' : (unreadCount > 9 ? '9+' : unreadCount)}
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
                      {/* NOVAS: Notificações de Intervenção Humana */}
                      {leads.filter(l => l.notifica_humano).map(lead => (
                        <div
                          key={`alert-${lead.id}`}
                          onClick={() => {
                            setSelectedChatId(lead.id);
                            setActiveTab('chats');
                            setShowNotifications(false);
                          }}
                          className="p-4 border-b border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 transition-colors cursor-pointer group"
                        >
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30 group-hover:scale-110 transition-transform">
                              <Bot size={18} className="text-rose-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] text-zinc-100 font-bold leading-tight mb-1">
                                {getLeadDisplayName(lead)}
                              </p>
                              <p className="text-[11px] text-rose-400 font-medium leading-tight">
                                Precisa de ajuda humana agora! 🚨
                              </p>
                              {lead.resumo_ia && (
                                <p className="text-[10px] text-zinc-500 mt-2 italic line-clamp-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
                                  "{lead.resumo_ia}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {notifications.length > 0 || leads.some(l => l.notifica_humano) ? (
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
