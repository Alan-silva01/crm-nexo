
import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, MoreVertical, Send, Smile, Paperclip, CheckCheck, ChevronLeft } from 'lucide-react';
import { Lead, Message } from '../types';

interface WhatsAppChatProps {
  leads: Lead[];
  onLeadsUpdate: (leads: Lead[]) => void;
}

const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ leads, onLeadsUpdate }) => {
  const [selectedChatId, setSelectedChatId] = useState(leads[0]?.id);
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const selectedChat = leads.find(l => l.id === selectedChatId) || leads[0];

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [selectedChat?.messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedLeads = leads.map(l => {
      if (l.id === selectedChatId) {
        return {
          ...l,
          messages: [...l.messages, newMessage],
          lastMessage: inputText,
          lastActive: 'Agora'
        };
      }
      return l;
    });

    onLeadsUpdate(updatedLeads);
    setInputText('');
  };

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
                <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full border border-zinc-800 shadow-sm" />
                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#09090b]"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="text-[13px] font-semibold truncate text-zinc-200">{chat.name}</h4>
                  <span className="text-[10px] text-zinc-500">{chat.lastActive}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] text-zinc-500 truncate pr-4">
                    {chat.lastMessage}
                  </p>
                  {chat.unreadCount > 0 && (
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
      <div className="flex-1 flex flex-col bg-[#0b141a]">
        <header className="h-[64px] px-4 border-b border-zinc-800/50 flex items-center justify-between bg-[#1e2a30] z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={selectedChat?.avatar} className="w-10 h-10 rounded-full border border-zinc-700 object-cover" alt={selectedChat?.name} />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#1e2a30]"></span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">{selectedChat?.name}</h4>
              <p className="text-[11px] text-zinc-400">online</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-zinc-400 px-2">
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
            {selectedChat?.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] md:max-w-[70%] p-2 px-3 rounded-2xl text-[13px] shadow-sm relative ${
                  msg.sender === 'user' 
                  ? 'bg-[#056162] text-white rounded-tr-none' 
                  : 'bg-[#1e2a30] text-zinc-100 rounded-tl-none'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                     <span className={`text-[9px] ${msg.sender === 'user' ? 'text-emerald-100/70' : 'text-zinc-500'}`}>{msg.timestamp}</span>
                     {msg.sender === 'user' && <CheckCheck size={12} className="text-[#34b7f1]" />}
                  </div>
                  {/* Tail */}
                  <div 
                    className={`absolute top-0 ${msg.sender === 'user' ? '-right-1.5 bg-[#056162]' : '-left-1.5 bg-[#1e2a30]'} w-4 h-4 rounded-full`} 
                    style={{ clipPath: msg.sender === 'user' ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)' }}
                  ></div>
                </div>
              </div>
            ))}
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
                placeholder="Mensagem" 
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
    </div>
  );
};

export default WhatsAppChat;
