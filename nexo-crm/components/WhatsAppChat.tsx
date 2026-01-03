
import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, MoreVertical, Send, Smile, Paperclip, CheckCheck, MessageSquare, Bot, User, Pause, Play } from 'lucide-react';
import { Lead, SDRMessage } from '../types';
import LetterAvatar from './LetterAvatar';
import { chatsSdrService } from '../src/lib/chatsSdrService';
import { supabase } from '../src/lib/supabase';
import { formatPhoneNumber } from '../src/lib/formatPhone';

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

const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ leads, onLeadsUpdate, selectedChatId, onSelectChat }) => {
  const [inputText, setInputText] = useState('');
  const [sdrMessages, setSdrMessages] = useState<SDRMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('Agente');
  const [aiPaused, setAiPaused] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const setSelectedChatId = onSelectChat;
  const selectedChat = leads.find(l => l.id === selectedChatId) || leads[0];

  // Get current user name
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.name) {
        setCurrentUserName(user.user_metadata.name);
      } else if (user?.email) {
        setCurrentUserName(user.email.split('@')[0]);
      }
    };
    getUser();
  }, []);

  // Fetch SDR messages when chat changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat?.phone) {
        setSdrMessages([]);
        return;
      }

      setLoadingMessages(true);

      // Busca o estado real da IA no banco de dados
      const actualAiStatus = await chatsSdrService.getAIStatus(selectedChat.phone);
      setAiPaused(actualAiStatus);

      const messages = await chatsSdrService.fetchChatsByPhone(selectedChat.phone);

      // Process messages to split by \n\n
      const processedMessages: SDRMessage[] = [];

      messages.forEach((msg) => {
        const rawContent = msg.message.content || '';
        // Clean content first to handle JSON wrappers and escaped newlines
        const cleaned = cleanContent(rawContent);

        // Split by double newline
        const parts = cleaned.split(/\n\n+/);

        parts.forEach((part, index) => {
          if (part.trim() && !shouldHideMessage(part)) {
            processedMessages.push({
              ...msg,
              // Use a composite ID to ensure uniqueness for React keys
              id: msg.id * 10000 + index,
              message: {
                ...msg.message,
                content: part.trim()
              }
            });
          }
        });
      });

      setSdrMessages(processedMessages);
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [selectedChat?.phone]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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

    const sentMessage = await chatsSdrService.sendMessage(
      selectedChat.phone,
      inputText,
      currentUserName
    );

    if (sentMessage) {
      setSdrMessages(prev => [...prev, sentMessage]);
    }
    setInputText('');
  };

  const handleToggleAI = async () => {
    if (!selectedChat?.phone) return;

    const newStatus = !aiPaused;
    setAiPaused(newStatus);

    await chatsSdrService.toggleAI(selectedChat.phone, newStatus ? 'pausar' : 'ativar');
  };

  // Render message bubble
  const renderMessage = (msg: SDRMessage) => {
    const messageType = msg.message.type;
    const agentName = msg.message.agent_name;
    const isFromClient = messageType === 'human';
    // Se tiver agent_name, trata como agente mesmo que o tipo seja 'ai'
    const isFromAgent = messageType === 'agent' || (messageType === 'ai' && !!agentName);
    const isFromAI = messageType === 'ai' && !agentName;

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
                  <User size={12} />
                  <span>{agentName || 'Agente'}</span>
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
              className="w-full pl-9 pr-4 py-2 bg-[#1e1e1e] border-none rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads.map(chat => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full p-4 flex gap-3 items-center hover:bg-[#18181b] transition-colors border-b border-zinc-800/10 text-left
                ${selectedChatId === chat.id ? 'bg-[#18181b] border-l-4 border-l-indigo-500' : ''}`}
            >
              <div className="relative">
                <LetterAvatar name={chat.name} size="lg" />
                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#09090b]"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="text-[13px] font-semibold truncate text-zinc-200">{chat.name}</h4>
                  <span className="text-[10px] text-zinc-500">{chat.lastActive || 'Agora'}</span>
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
                <LetterAvatar name={selectedChat.name} size="md" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#1e2a30]"></span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">{selectedChat.name}</h4>
                <p className="text-[11px] text-zinc-400">{formatPhoneNumber(selectedChat.phone) || 'online'}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-zinc-400 px-2">
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
              <button className="hover:text-white transition-colors"><Phone size={20} /></button>
              <button className="hover:text-white transition-colors"><Paperclip size={20} /></button>
              <button className="hover:text-white transition-colors"><MoreVertical size={20} /></button>
            </div>
          </header>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 relative bg-[#0b141a] scroll-smooth"
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
                sdrMessages.filter(msg => !shouldHideMessage(msg.message.content || '')).map(renderMessage)
              )}
            </div>
          </div>

          <footer className="p-3 bg-[#1e2a30] border-t border-zinc-800/10 z-10">
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
