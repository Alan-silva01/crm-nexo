
import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, MoreVertical, Send, Smile, Paperclip, CheckCheck, MessageSquare, Bot, User, Pause, Play, UserPlus, ChevronDown, Users } from 'lucide-react';
import { Lead, SDRMessage, getLeadDisplayName } from '../types';
import LetterAvatar from './LetterAvatar';
import { chatsSdrService } from '../src/lib/chatsSdrService';
import { supabase } from '../src/lib/supabase';
import { formatPhoneNumber } from '../src/lib/formatPhone';
import { useAuth } from '../src/lib/AuthProvider';
import { atendentesService, Atendente } from '../src/lib/atendentesService';

interface WhatsAppChatProps {
  leads: Lead[];
  onLeadsUpdate: (leads: Lead[]) => void;
  selectedChatId: string | null;
  onSelectChat: (id: string | null) => void;
}

// Parse message content to extract quoted reply
function parseMessageContent(content: string): { quote: string | null; mainText: string } {
  const quotePattern = /O cliente mencionou esta mensagem que você enviou:\s*"([^"]+)"\s*/i;
  const match = content.match(quotePattern);

  if (match) {
    const quote = match[1];
    const mainText = content.replace(match[0], '').trim();
    return { quote, mainText };
  }

  return { quote: null, mainText: content };
}

// Clean content from JSON wrapper like {\"o cliente falou: ...}
function cleanContent(content: string): string {
  let cleaned = content;

  // Remove wrapper JSON como {"o cliente falou: ...}
  const jsonWrapperMatch = cleaned.match(/\{["\s]*o cliente falou:\s*([^}]+)\}/i);
  if (jsonWrapperMatch) {
    cleaned = jsonWrapperMatch[1];
  }

  // Remove "o cliente falou:" do início (mesmo fora de JSON)
  cleaned = cleaned.replace(/^["\s]*o cliente falou:\s*/i, '');

  // Remove aspas do início e fim
  cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '');

  // Remove chaves soltas
  cleaned = cleaned.replace(/^\{+|\}+$/g, '');

  // Substitui \n\n por quebras de linha reais
  cleaned = cleaned.replace(/\\n\\n/g, '\n\n');
  cleaned = cleaned.replace(/\\n/g, '\n');

  // Remove mensagens que são só ponto(s)
  if (/^[\.\s]+$/.test(cleaned)) {
    return '';
  }

  return cleaned.trim();
}

// Verifica se a mensagem deve ser ocultada (só pontos, vazia, etc)
function shouldHideMessage(content: string): boolean {
  const cleaned = cleanContent(content);
  return !cleaned || /^[\.\s]*$/.test(cleaned);
}

const capitalize = (str: string | undefined | null) => {
  if (!str) return '';
  return str.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const getAgentColor = (name: string | undefined | null) => {
  if (!name) return 'bg-zinc-500';
  const n = name.toLowerCase().trim();
  if (n === 'alan' || n.includes('alan')) return 'bg-blue-500';

  const colors = [
    'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400',
    'bg-cyan-400', 'bg-teal-400', 'bg-orange-400', 'bg-rose-400',
    'bg-emerald-400', 'bg-amber-400', 'bg-violet-400', 'bg-fuchsia-400'
  ];
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ leads, onLeadsUpdate, selectedChatId, onSelectChat }) => {
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sdrMessages, setSdrMessages] = useState<SDRMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [currentUserName, setCurrentUserName] = useState<string>('Agente');
  const [aiPaused, setAiPaused] = useState(false);
  const [messagesCache, setMessagesCache] = useState<Record<string, { messages: SDRMessage[], hasMore: boolean, offset: number }>>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const MESSAGE_PAGE_SIZE = 50;

  // Atendentes
  const { userType, atendenteInfo, effectiveUserId } = useAuth();
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Atendente | null>(null);
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, Atendente | null>>({});

  const setSelectedChatId = onSelectChat;
  const selectedChat = leads.find(l => l.id === selectedChatId) || leads[0];

  // Carregar lista de atendentes (com cache para evitar delay)
  useEffect(() => {
    if (effectiveUserId) {
      // Restaurar do cache primeiro
      const cached = localStorage.getItem(`nexo_atendentes_${effectiveUserId}`);
      if (cached) {
        try {
          setAtendentes(JSON.parse(cached));
        } catch (e) { }
      }

      // Buscar do banco e atualizar cache
      atendentesService.listAtendentes(effectiveUserId).then(data => {
        setAtendentes(data);
        localStorage.setItem(`nexo_atendentes_${effectiveUserId}`, JSON.stringify(data));
      });
    }
  }, [effectiveUserId]);

  // Carregar todas as atribuições dos leads
  useEffect(() => {
    const loadAllAssignments = async () => {
      const map: Record<string, Atendente | null> = {};
      for (const lead of leads) {
        if (lead.assigned_to) {
          const atendente = atendentes.find(a => a.id === lead.assigned_to) || null;
          map[lead.id] = atendente;
        }
      }
      setAssignmentsMap(map);
    };

    if (atendentes.length > 0) {
      loadAllAssignments();
    }
  }, [leads, atendentes]);

  // Carregar atribuição atual do lead selecionado
  useEffect(() => {
    if (selectedChat?.id) {
      atendentesService.getLeadAssignment(selectedChat.id).then(setCurrentAssignment);
    } else {
      setCurrentAssignment(null);
    }
  }, [selectedChat?.id]);

  // Get current user name
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata;
      const name = meta?.full_name || meta?.name || user?.email?.split('@')[0];
      if (name) {
        setCurrentUserName(capitalize(name));
      }
    };
    getUser();
  }, []);

  // Fetch SDR messages when chat changes (with Cache and Realtime)
  useEffect(() => {
    if (!selectedChat?.phone) {
      setSdrMessages([]);
      return;
    }

    let isMounted = true;
    let subscription: any = null;

    const fetchMessages = async () => {
      const phoneNumbers = selectedChat.phone.replace(/\D/g, '');
      const cacheKey = phoneNumbers || selectedChat.phone;

      // 0. Buscar nome da tabela de chats (do admin, se for atendente)
      const { data: { user } } = await supabase.auth.getUser();
      let chatTableName = 'chats_sdr'; // fallback
      if (user) {
        // Verificar se é atendente
        const { data: atendente } = await supabase
          .from('atendentes')
          .select('admin_id')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .maybeSingle();

        // Se for atendente, buscar profile do admin
        const profileUserId = atendente?.admin_id || user.id;

        const { data: profile } = await supabase
          .from('profiles')
          .select('chat_table_name')
          .eq('id', profileUserId)
          .single();
        if (profile?.chat_table_name) {
          chatTableName = profile.chat_table_name;
        }
      }

      // 1. Usar Cache imediatamente se existir
      if (messagesCache[cacheKey]) {
        const cached = messagesCache[cacheKey];
        if (isMounted) {
          setSdrMessages(cached.messages);
          setHasMoreMessages(cached.hasMore);
          setCurrentOffset(cached.offset);
        }
      } else {
        if (isMounted) setLoadingMessages(true);
      }

      // 2. Buscar estado da IA
      const actualAiStatus = await chatsSdrService.getAIStatus(selectedChat.phone);
      if (isMounted) setAiPaused(actualAiStatus);

      // 3. Buscar mensagens do banco (primeiras 50)
      const { messages, hasMore } = await chatsSdrService.fetchChatsByPhone(selectedChat.phone, MESSAGE_PAGE_SIZE, 0);

      const processedMessages: SDRMessage[] = [];
      messages.forEach((msg) => {
        const cleaned = cleanContent(msg.message.content || '');
        const parts = cleaned.split(/\n\n+/);
        parts.forEach((part, index) => {
          if (part.trim() && !shouldHideMessage(part)) {
            processedMessages.push({
              ...msg,
              id: msg.id * 10000 + index,
              message: { ...msg.message, content: part.trim() }
            });
          }
        });
      });

      if (isMounted) {
        setSdrMessages(processedMessages);
        setHasMoreMessages(hasMore);
        setCurrentOffset(MESSAGE_PAGE_SIZE);
        setMessagesCache(prev => ({ ...prev, [cacheKey]: { messages: processedMessages, hasMore, offset: MESSAGE_PAGE_SIZE } }));
        setLoadingMessages(false);
      }

      // 4. Configurar Realtime para a tabela DINÂMICA do usuário
      const finalSessionIdForRealtime = messages.length > 0 ? messages[0].session_id : selectedChat.phone;

      console.log(`[Realtime] Subscribing to table: ${chatTableName}`);

      subscription = supabase
        .channel(`chat_realtime_${cacheKey}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: chatTableName  // Usar tabela dinâmica!
        }, (payload) => {
          const newMsg = payload.new as any;

          // Debug para ver se as mensagens chegam
          console.log('Realtime message received:', newMsg);

          // Verificar se a mensagem pertence a este chat
          const isRelevant = newMsg.session_id === finalSessionIdForRealtime ||
            newMsg.session_id.includes(phoneNumbers);

          if (!isRelevant) return;

          const cleaned = cleanContent(newMsg.message.content || '');
          const parts = cleaned.split(/\n\n+/);

          const newProcessed: SDRMessage[] = parts
            .filter(part => part.trim() && !shouldHideMessage(part))
            .map((part, index) => ({
              ...newMsg,
              id: newMsg.id * 10000 + index,
              message: { ...newMsg.message, content: part.trim() }
            }));

          if (isMounted) {
            setSdrMessages(prev => {
              // Evitar duplicatas se a mensagem já foi carregada ou enviada manualmente
              const messageExists = prev.some(m => m.id / 10000 === newMsg.id || m.id === newMsg.id);
              if (messageExists) return prev;

              const updated = [...prev, ...newProcessed];
              setMessagesCache(cache => {
                const existingCache = cache[cacheKey] || { messages: [], hasMore: false, offset: 0 };
                return { ...cache, [cacheKey]: { ...existingCache, messages: updated } };
              });
              return updated;
            });
          }
        })
        .subscribe((status) => {
          console.log(`Realtime subscription status for ${chatTableName}/${cacheKey}:`, status);
        });
    };

    fetchMessages();
    isFirstLoad.current = true;

    // Cleanup: Remove subscription when chat changes
    return () => {
      isMounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [selectedChat?.phone]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      const behavior = isFirstLoad.current ? 'instant' : 'smooth';
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: behavior as ScrollBehavior
      });

      if (sdrMessages.length > 0) {
        isFirstLoad.current = false;
      }
    }
  }, [sdrMessages]);

  // Set initial selected chat
  useEffect(() => {
    if (leads.length > 0 && !selectedChatId) {
      setSelectedChatId(leads[0].id);
    }
  }, [leads, selectedChatId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChat?.phone) return;

    // Verificar se pode enviar
    if (!canSendMessage) {
      alert('Esta conversa está atribuída a outro atendente.');
      return;
    }

    const messageContent = inputText;
    setInputText('');

    // Auto-atribuir se for atendente e não tiver atribuição
    if (userType === 'atendente' && atendenteInfo && !currentAssignment) {
      await atendentesService.assignLeadToAtendente(selectedChat.id, atendenteInfo.id);
      setCurrentAssignment(atendenteInfo);
    }

    // Optimistic Update
    const tempId = -Date.now();
    const optimisticMessage: SDRMessage = {
      id: tempId,
      session_id: selectedChat.phone,
      message: {
        type: 'agent',
        content: messageContent,
        agent_name: currentUserName
      },
      atendente: currentUserName, // Identifica localmente no update otimista
      created_at: new Date().toISOString()
    };

    setSdrMessages(prev => [...prev, optimisticMessage]);

    try {
      const sentMessage = await chatsSdrService.sendMessage(
        selectedChat.phone,
        messageContent,
        currentUserName
      );

      if (sentMessage) {
        setSdrMessages(prev =>
          prev.map(m => m.id === tempId ? sentMessage : m)
        );

        // Update cache too
        const phoneNumbers = selectedChat.phone.replace(/\D/g, '');
        const cacheKey = phoneNumbers || selectedChat.phone;
        setMessagesCache(prev => {
          const existingCache = prev[cacheKey] || { messages: [], hasMore: false, offset: 0 };
          const updatedMsgs = [...existingCache.messages.filter(m => m.id !== tempId), sentMessage];
          return { ...prev, [cacheKey]: { ...existingCache, messages: updatedMsgs } };
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setSdrMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedChat?.phone || loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    const phoneNumbers = selectedChat.phone.replace(/\D/g, '');
    const cacheKey = phoneNumbers || selectedChat.phone;

    // Preserve scroll position
    const container = chatContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;

    const { messages, hasMore } = await chatsSdrService.fetchChatsByPhone(
      selectedChat.phone,
      MESSAGE_PAGE_SIZE,
      currentOffset
    );

    const processedMessages: SDRMessage[] = [];
    messages.forEach((msg) => {
      const cleaned = cleanContent(msg.message.content || '');
      const parts = cleaned.split(/\n\n+/);
      parts.forEach((part, index) => {
        if (part.trim() && !shouldHideMessage(part)) {
          processedMessages.push({
            ...msg,
            id: msg.id * 10000 + index,
            message: { ...msg.message, content: part.trim() }
          });
        }
      });
    });

    // Prepend older messages
    setSdrMessages(prev => [...processedMessages, ...prev]);
    setHasMoreMessages(hasMore);
    setCurrentOffset(prev => prev + MESSAGE_PAGE_SIZE);
    setMessagesCache(prev => {
      const existingCache = prev[cacheKey] || { messages: [], hasMore: false, offset: 0 };
      return {
        ...prev,
        [cacheKey]: {
          messages: [...processedMessages, ...existingCache.messages],
          hasMore,
          offset: currentOffset + MESSAGE_PAGE_SIZE
        }
      };
    });
    setLoadingMore(false);

    // Restore scroll position after DOM updates
    requestAnimationFrame(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - previousScrollHeight;
      }
    });
  };

  const handleToggleAI = async () => {
    if (!selectedChat?.phone) return;

    const newStatus = !aiPaused;
    setAiPaused(newStatus);

    await chatsSdrService.toggleAI(selectedChat.phone, newStatus ? 'pausar' : 'ativar');
  };

  const handleAssignLead = async (atendenteId: string | null) => {
    if (!selectedChat?.id) return;

    await atendentesService.assignLeadToAtendente(selectedChat.id, atendenteId);

    if (atendenteId) {
      const assigned = atendentes.find(a => a.id === atendenteId);
      setCurrentAssignment(assigned || null);
    } else {
      setCurrentAssignment(null);
    }

    setShowAssignDropdown(false);
  };

  // Verificar se atendente pode responder
  const canSendMessage = userType === 'admin' ||
    (atendenteInfo && currentAssignment?.id === atendenteInfo.id) ||
    !currentAssignment; // Pode responder se não tiver atribuído (auto-atribui)

  // Render message bubble
  const renderMessage = (msg: SDRMessage) => {
    const messageType = msg.message.type;
    const agentName = msg.atendente || msg.message.agent_name;
    const isFromClient = messageType === 'human';

    // Se houver nome na coluna atendente ou no objeto da mensagem, é Humano
    const isFromAgent = !!agentName;
    const isFromAI = messageType === 'ai' && !isFromAgent;

    const rawContent = msg.message.content || '';
    const cleanedContent = cleanContent(rawContent);
    const { quote, mainText } = parseMessageContent(cleanedContent);

    // Positioning
    const isRight = isFromAI || isFromAgent;

    // Colors
    let bgColor = 'bg-[#1e2a30]'; // client - left
    let textColor = 'text-zinc-100';

    if (isFromAI) {
      bgColor = 'bg-[#056162]';
    } else if (isFromAgent) {
      bgColor = 'bg-[#005c4b]';
    }

    return (
      <div key={msg.id} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl text-[13px] shadow-sm relative overflow-hidden ${bgColor} ${textColor} ${isRight ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
          {/* Sender badge */}
          {(isFromAI || isFromAgent) && (
            <div className={`px-3 py-1.5 text-[10px] font-medium flex items-center gap-1.5 border-b ${isFromAI ? 'bg-[#04514f] border-[#03403e] text-emerald-200' : 'bg-[#004d40] border-[#003d33] text-teal-200'}`}>
              {isFromAI ? (
                <>
                  <Bot size={12} />
                  <span>IA Assistente</span>
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full ${getAgentColor(agentName)} shadow-sm`} />
                  <span>{capitalize(agentName) || 'Agente'}</span>
                </>
              )}
            </div>
          )}

          {isFromClient && (
            <div className="px-3 py-1.5 text-[10px] font-medium flex items-center gap-1.5 border-b bg-[#1a242a] border-[#151d22] text-zinc-400">
              <User size={12} />
              <span>Cliente</span>
            </div>
          )}

          <div className="p-2 px-3">
            {/* Quoted message (reply) */}
            {quote && (
              <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-4 border-emerald-400">
                <p className="text-[11px] text-zinc-300 italic line-clamp-2">{quote}</p>
              </div>
            )}

            {/* Main message */}
            <p className="leading-relaxed whitespace-pre-wrap">{mainText}</p>

            {/* Timestamp */}
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <span className={`text-[9px] ${isRight ? 'text-emerald-100/70' : 'text-zinc-500'}`}>
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              {isRight && <CheckCheck size={12} className="text-[#34b7f1]" />}
            </div>
          </div>

          {/* Tail */}
          <div
            className={`absolute top-0 ${isRight ? '-right-1.5' : '-left-1.5'} w-4 h-4 rounded-full ${bgColor}`}
            style={{ clipPath: isRight ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)' }}
          ></div>
        </div>
      </div>
    );
  };

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0b141a]">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={32} className="text-zinc-600" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-300 mb-2">Nenhuma conversa</h2>
          <p className="text-zinc-500 text-sm max-w-sm">
            Crie leads primeiro para começar a conversar. Vá para o Kanban e clique em "Novo Lead".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Chat List */}
      <div className="w-80 border-r border-zinc-800/50 flex flex-col bg-[#09090b]">
        <div className="p-4 border-b border-zinc-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              placeholder="Buscar ou começar nova conversa"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#1e1e1e] border-none rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads.filter(chat => {
            const name = getLeadDisplayName(chat).toLowerCase();
            const phone = (chat.phone || '').replace(/\D/g, '');
            const search = searchTerm.toLowerCase();
            const searchClean = search.replace(/\D/g, '');

            return name.includes(search) || (searchClean && phone.includes(searchClean));
          }).map(chat => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full p-4 flex gap-3 items-center hover:bg-[#18181b] transition-colors border-b border-zinc-800/10 text-left
                ${selectedChatId === chat.id ? 'bg-[#18181b] border-l-4 border-l-indigo-500 shadow-inner' : ''}`}
            >
              <div className="relative">
                <LetterAvatar name={getLeadDisplayName(chat)} size="lg" />
                <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#09090b] ${chat.ai_paused === true ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="text-[13px] font-semibold truncate text-zinc-200">{getLeadDisplayName(chat)}</h4>
                    {chat.ai_paused === false && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md shrink-0 ring-1 ring-emerald-500/20">
                        <Bot size={10} className="text-emerald-500" />
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">IA Ativa</span>
                      </div>
                    )}
                    {chat.ai_paused === true && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md shrink-0 ring-1 ring-amber-500/20">
                        <Pause size={10} className="text-amber-500" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">IA Pausada</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0">{chat.lastActive || 'Agora'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] text-zinc-500 truncate pr-4">
                    {chat.last_message || formatPhoneNumber(chat.phone) || 'Clique para conversar'}
                  </p>
                  {chat.unreadCount && chat.unreadCount > 0 && (
                    <span className="min-w-[16px] h-[16px] px-1 bg-[#25d366] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                {/* Atendente atribuído */}
                {assignmentsMap[chat.id] && (
                  <div className="flex items-center gap-1 mt-1">
                    <UserPlus size={10} className="text-indigo-400" />
                    <span className="text-[9px] text-indigo-400 font-medium">
                      {assignmentsMap[chat.id]?.id === atendenteInfo?.id
                        ? 'Atribuído a você'
                        : `Atribuído a ${assignmentsMap[chat.id]?.nome.split(' ')[0]}`}
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Chat */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-[#0b141a]">
          <header className="h-[64px] px-4 border-b border-zinc-800/50 flex items-center justify-between bg-[#1e2a30] z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <LetterAvatar name={getLeadDisplayName(selectedChat)} size="md" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#1e2a30]"></span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">{getLeadDisplayName(selectedChat)}</h4>
                <p className="text-[11px] text-zinc-400">{formatPhoneNumber(selectedChat.phone) || 'online'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-zinc-400 px-2">
              {/* Botão de Atribuição (só para admin) */}
              {userType === 'admin' && atendentes.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                      ${currentAssignment
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                        : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/50'}`}
                  >
                    <UserPlus size={14} />
                    <span>{currentAssignment ? (currentAssignment.id === atendenteInfo?.id ? 'Você' : currentAssignment.nome.split(' ')[0]) : 'Atribuir'}</span>
                    <ChevronDown size={12} />
                  </button>

                  {showAssignDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e2a30] border border-zinc-700/50 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-2 border-b border-zinc-700/30">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Atribuir a</span>
                      </div>
                      <button
                        onClick={() => handleAssignLead(null)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-700/30 transition-colors flex items-center gap-2
                          ${!currentAssignment ? 'text-emerald-400' : 'text-zinc-300'}`}
                      >
                        <Users size={14} />
                        <span>Ninguém (remover)</span>
                      </button>
                      {atendentes.filter(a => a.ativo).map(atendente => (
                        <button
                          key={atendente.id}
                          onClick={() => handleAssignLead(atendente.id)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-700/30 transition-colors flex items-center gap-2
                            ${currentAssignment?.id === atendente.id ? 'text-emerald-400' : 'text-zinc-300'}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${getAgentColor(atendente.nome)}`} />
                          <span>{atendente.nome}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Badge de atribuição para atendentes */}
              {userType === 'atendente' && currentAssignment && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-semibold border border-indigo-500/20">
                  <UserPlus size={12} />
                  <span>{currentAssignment.id === atendenteInfo?.id ? 'Você' : currentAssignment.nome.split(' ')[0]}</span>
                </div>
              )}

              <button
                onClick={handleToggleAI}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${aiPaused
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                title={aiPaused ? "Clique para ativar a IA" : "Clique para pausar a IA"}
              >
                {aiPaused ? (
                  <>
                    <Pause size={12} className="fill-current" />
                    <span>IA Pausada</span>
                  </>
                ) : (
                  <>
                    <Bot size={14} />
                    <span>IA Ativa</span>
                  </>
                )}
              </button>
            </div>
          </header>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 relative bg-[#0b141a]"
          >
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                backgroundRepeat: 'repeat',
                backgroundSize: '400px'
              }}
            ></div>

            <div className="relative flex flex-col space-y-4 max-w-4xl mx-auto z-0">
              {loadingMessages ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                  <p className="text-zinc-600 text-sm mt-4">Carregando mensagens...</p>
                </div>
              ) : sdrMessages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-600 text-sm">Nenhuma mensagem ainda. Comece a conversa!</p>
                </div>
              ) : (
                <>
                  {hasMoreMessages && (
                    <div className="text-center pb-4">
                      <button
                        onClick={loadMoreMessages}
                        disabled={loadingMore}
                        className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700/50 transition-all disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-zinc-500/20 border-t-zinc-500 rounded-full animate-spin"></div>
                            Carregando...
                          </span>
                        ) : (
                          '↑ Carregar mais antigas'
                        )}
                      </button>
                    </div>
                  )}
                  {sdrMessages.filter(msg => !shouldHideMessage(msg.message.content || '')).map(renderMessage)}
                </>
              )}
            </div>
          </div>

          <footer className="p-3 bg-[#1e2a30] border-t border-zinc-800/10 z-10">
            {!canSendMessage ? (
              <div className="max-w-4xl mx-auto text-center py-2">
                <p className="text-amber-500/70 text-sm">
                  Esta conversa está atribuída a <strong>{currentAssignment?.nome}</strong>. Você não pode responder.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="max-w-4xl mx-auto flex items-center gap-3"
              >
                <button type="button" className="text-zinc-400 hover:text-zinc-200 transition-colors p-1.5"><Smile size={22} /></button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Mensagem como ${currentUserName}`}
                    className="w-full py-2 px-4 bg-[#2a3942] border-none rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-0"
                  />
                </div>
                <button
                  type="submit"
                  className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white hover:bg-[#008f72] shadow-md transition-all active:scale-90 flex-shrink-0"
                >
                  <Send size={20} />
                </button>
              </form>
            )}
          </footer>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#0b141a]">
          <p className="text-zinc-600">Selecione uma conversa</p>
        </div>
      )}
    </div>
  );
};

export default WhatsAppChat;
