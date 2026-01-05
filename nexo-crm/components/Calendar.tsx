
import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Plus,
    Check,
    Instagram,
    Facebook,
    Twitter,
    Share2,
    X,
    Search
} from 'lucide-react';
import { Lead } from '../types';

interface CalendarProps {
    leads: Lead[];
    onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
}

const CalendarPage: React.FC<CalendarProps> = ({ leads, onUpdateLead }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState<string>('');
    const [eventDate, setEventDate] = useState<string>('');
    const [eventService, setEventService] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [duration, setDuration] = useState<number>(30); // Default 30 min

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });

    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    // Previous month padding
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`prev-${i}`} className="h-12 w-12 opacity-0"></div>);
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
        const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

        // Check if there are events on this day
        const dayEvents = leads.filter(lead => {
            if (!lead.dataHora_Agendamento) return false;
            const scheduled = new Date(lead.dataHora_Agendamento);
            return scheduled.getDate() === d && scheduled.getMonth() === month && scheduled.getFullYear() === year;
        });

        const hasEvent = dayEvents.length > 0;

        days.push(
            <div key={d} className="relative flex flex-col items-center justify-center group cursor-pointer">
                <div className={`h-12 w-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300
          ${isToday
                        ? 'bg-[#1a1a1c] shadow-[inset_4px_4px_8px_#0d0d0e,inset_-4px_-4px_8px_#27272a] text-indigo-400 font-bold border border-indigo-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/10'}`}>
                    <span className="text-sm">{d}</span>
                    {hasEvent && (
                        <span className="text-[8px] font-medium opacity-60 mt-0.5">{dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}</span>
                    )}
                </div>
                {hasEvent && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                )}
            </div>
        );
    }

    const handleCreateEvent = async () => {
        if (!selectedLeadId || !eventDate || !eventService) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        setIsSaving(true);
        await onUpdateLead(selectedLeadId, {
            dataHora_Agendamento: new Date(eventDate).toISOString(),
            servico_interesse: eventService
        });

        setIsSaving(false);
        setIsEventModalOpen(false);
        setSelectedLeadId('');
        setEventDate('');
        setEventService('');
    };

    const filteredLeadsForSelect = leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.phone && l.phone.includes(searchTerm))
    ).slice(0, 5);

    // Upcoming Events based on leads with dataHora_Agendamento
    const upcomingEvents = leads
        .filter(l => l.dataHora_Agendamento)
        .sort((a, b) => new Date(a.dataHora_Agendamento!).getTime() - new Date(b.dataHora_Agendamento!).getTime())
        .slice(0, 5);

    return (
        <div className="h-full bg-[#0c0c0e] p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8 text-zinc-300 select-none">

            {/* Top Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-5 rounded-[2rem] bg-[#0c0c0e] shadow-[8px_8px_16px_#060607,-8px_-8px_16px_#121215] flex flex-col gap-1 min-w-[200px]">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Clock size={16} />
                            <span className="text-sm font-medium">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-xs text-zinc-500">
                            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={prevMonth} className="p-4 rounded-full bg-[#0c0c0e] shadow-[5px_5px_10px_#060607,-5px_-5px_10px_#121215] hover:shadow-[inset_2px_2px_5px_#060607,inset_-2px_-2px_5px_#121215] transition-all active:scale-95">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="p-4 rounded-full bg-[#0c0c0e] shadow-[5px_5px_10px_#060607,-5px_-5px_10px_#121215] hover:shadow-[inset_2px_2px_5px_#060607,inset_-2px_-2px_5px_#121215] transition-all active:scale-95">
                        <ChevronRight size={20} />
                    </button>

                    <div className="px-8 py-4 rounded-[2rem] bg-[#0c0c0e] shadow-[8px_8px_16px_#060607,-8px_-8px_16px_#121215] font-semibold flex items-center gap-3">
                        <span className="capitalize">{monthName}</span>
                        <span className="text-zinc-500">{year}</span>
                    </div>

                    {/* Interval Selector */}
                    <div className="flex bg-[#0c0c0e] p-1 rounded-2xl shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215]">
                        {[15, 30, 60].map((interval) => (
                            <button
                                key={interval}
                                onClick={() => setDuration(interval)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all duration-300 ${duration === interval
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {interval === 60 ? '1h' : `${interval}min`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Sidebar Info */}
                <div className="lg:col-span-4 flex flex-col gap-8">

                    {/* Upcoming Events */}
                    <div className="p-8 rounded-[3rem] bg-[#0c0c0e] shadow-[12px_12px_24px_#050506,-12px_-12px_24px_#131316]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Próximos Eventos</h3>
                            <div className="text-[10px] bg-zinc-800/50 px-2 py-1 rounded-lg text-zinc-500 font-bold uppercase tracking-wider">Esta Semana</div>
                        </div>

                        <div className="space-y-4">
                            {upcomingEvents.length > 0 ? upcomingEvents.map((event, i) => (
                                <div key={event.id} className="p-4 rounded-[1.5rem] bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] flex flex-col gap-2 group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-zinc-700'} `}></div>
                                        <p className="text-xs font-bold truncate group-hover:text-white transition-colors flex-1">{event.name}</p>
                                        <p className="text-[10px] font-bold text-indigo-400">
                                            {new Date(event.dataHora_Agendamento!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1 ml-5">
                                        <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                                            {event.servico_interesse || 'Não especificado'}
                                        </p>
                                        <p className="text-[9px] text-zinc-600 uppercase tracking-tighter">
                                            {new Date(event.dataHora_Agendamento!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • Duração: {duration}min
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-xs text-zinc-600 italic py-4 text-center">Nenhum agendamento</div>
                            )}

                            <button
                                onClick={() => setIsEventModalOpen(true)}
                                className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-indigo-400 transition-colors"
                            >
                                <Plus size={14} /> Adicionar Novo Evento
                            </button>
                        </div>
                    </div>

                    {/* ToDo List */}
                    <div className="p-8 rounded-[3rem] bg-[#0c0c0e] shadow-[12px_12px_24px_#050506,-12px_-12px_24px_#131316]">
                        <h3 className="text-lg font-bold mb-6">Lista de Tarefas</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-md border border-zinc-800 flex items-center justify-center shadow-[inset_2px_2px_4px_#060607,inset_-2px_-2px_4px_#121215]">
                                    <Check size={10} className="text-indigo-500 opacity-0 group-hover:opacity-100" />
                                </div>
                                <span className="text-xs text-zinc-500">Pagar faturas do mês</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-md border border-zinc-800 flex items-center justify-center bg-[#1a1a1c] shadow-[inset_2px_2px_4px_#0d0d0e,inset_-4px_-4px_8px_#27272a]">
                                    <Check size={10} className="text-emerald-500" />
                                </div>
                                <span className="text-xs text-zinc-400">Finalizar UI do Calendário</span>
                            </div>
                            <button className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-indigo-400 transition-colors">
                                <Plus size={14} /> Adicionar Item
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Calendar Grid */}
                <div className="lg:col-span-8">
                    <div className="p-10 rounded-[3rem] bg-[#0c0c0e] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
                        <div className="grid grid-cols-7 gap-4 mb-8">
                            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
                                <div key={day} className="text-center text-[10px] font-bold text-zinc-600 tracking-widest">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-y-6 gap-x-4">
                            {days}
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div
                        className="bg-[#0c0c0e] w-full max-w-md rounded-[3rem] p-10 shadow-[20px_20px_40px_#050506,-20px_-20px_40px_#131316] border border-zinc-800/30 animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Novo Agendamento</h2>
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="p-3 rounded-full bg-[#0c0c0e] shadow-[4px_4px_8px_#060607,-4px_-4px_8px_#121215] text-zinc-500 hover:text-white transition-all active:scale-90"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Lead Selection */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Selecionar Lead</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                                        <Search size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por nome ou telefone..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full py-4 pl-12 pr-4 rounded-[1.5rem] bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none text-sm text-zinc-300 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-700 font-medium"
                                    />
                                </div>

                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-2">
                                    {filteredLeadsForSelect.map(lead => (
                                        <button
                                            key={lead.id}
                                            onClick={() => {
                                                setSelectedLeadId(lead.id);
                                                setSearchTerm(lead.name);
                                            }}
                                            className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all group
                        ${selectedLeadId === lead.id
                                                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                                                    : 'hover:bg-zinc-900/40 border border-transparent'}`}
                                        >
                                            <div className="text-left">
                                                <p className={`text-xs font-bold ${selectedLeadId === lead.id ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{lead.name}</p>
                                                <p className="text-[10px] text-zinc-600">{lead.phone}</p>
                                            </div>
                                            {selectedLeadId === lead.id && <Check size={14} className="text-indigo-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date/Time Picker */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Data e Hora</label>
                                <input
                                    type="datetime-local"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full py-4 px-6 rounded-[1.5rem] bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none text-sm text-zinc-300 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium [color-scheme:dark]"
                                />
                            </div>

                            {/* Service/Interest */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Serviço de Interesse</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Consultoria Premium"
                                    value={eventService}
                                    onChange={(e) => setEventService(e.target.value)}
                                    className="w-full py-4 px-6 rounded-[1.5rem] bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border-none text-sm text-zinc-300 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-700 font-medium"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={() => setIsEventModalOpen(false)}
                                    className="flex-1 py-4 rounded-[1.5rem] bg-[#0c0c0e] shadow-[6px_6px_12px_#050506,-6px_-6px_12px_#131316] text-xs font-bold text-zinc-500 hover:text-white transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateEvent}
                                    disabled={isSaving}
                                    className="flex-1 py-4 rounded-[1.5rem] bg-indigo-600 shadow-lg shadow-indigo-600/20 text-xs font-bold text-white hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Check size={16} /> Salvar Evento
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default CalendarPage;
