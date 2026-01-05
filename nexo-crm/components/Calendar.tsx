
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
    Share2
} from 'lucide-react';
import { Lead } from '../types';

interface CalendarProps {
    leads: Lead[];
}

const CalendarPage: React.FC<CalendarProps> = ({ leads }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [time, setTime] = useState(new Date());

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
        const hasEvent = leads.some(lead => {
            if (!lead.data_agendamento) return false;
            const scheduled = new Date(lead.data_agendamento);
            return scheduled.getDate() === d && scheduled.getMonth() === month && scheduled.getFullYear() === year;
        });

        days.push(
            <div key={d} className="relative flex flex-col items-center justify-center">
                <div className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-300
          ${isToday
                        ? 'bg-[#1a1a1c] shadow-[inset_4px_4px_8px_#0d0d0e,inset_-4px_-4px_8px_#27272a] text-indigo-400 font-bold border border-indigo-500/20'
                        : 'text-zinc-400 hover:text-white'}`}>
                    {d}
                </div>
                {hasEvent && (
                    <div className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                )}
            </div>
        );
    }

    // Mock Upcoming Events based on leads with data_agendamento
    const upcomingEvents = leads
        .filter(l => l.data_agendamento)
        .sort((a, b) => new Date(a.data_agendamento!).getTime() - new Date(b.data_agendamento!).getTime())
        .slice(0, 3);

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
                                <div key={event.id} className="p-4 rounded-[1.5rem] bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] flex items-center gap-4 group">
                                    <div className={`w-2 h-2 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500'][i % 3]} shadow-lg shadow-indigo-500/20`}></div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold truncate group-hover:text-white transition-colors">{event.name}</p>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">
                                            {new Date(event.data_agendamento!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} •
                                            {new Date(event.data_agendamento!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-xs text-zinc-600 italic py-4 text-center">Nenhum agendamento</div>
                            )}

                            <button className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-indigo-400 transition-colors">
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

                    <div className="mt-12 flex justify-center lg:justify-end items-center gap-6">
                        <button className="p-4 rounded-full bg-[#0c0c0e] shadow-[6px_6px_12px_#060607,-6px_-6px_12px_#121215] hover:text-indigo-400 transition-all active:scale-95">
                            <Twitter size={18} />
                        </button>
                        <button className="p-4 rounded-full bg-[#0c0c0e] shadow-[6px_6px_12px_#060607,-6px_-6px_12px_#121215] hover:text-emerald-500 transition-all active:scale-95">
                            <Facebook size={18} />
                        </button>
                        <button className="p-4 rounded-full bg-[#0c0c0e] shadow-[6px_6px_12px_#060607,-6px_-6px_12px_#121215] hover:text-rose-400 transition-all active:scale-95">
                            <Instagram size={18} />
                        </button>

                        <button className="flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-[#0c0c0e] shadow-[8px_8px_16px_#060607,-8px_-8px_16px_#121215] hover:shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] transition-all font-bold text-sm">
                            <span>Compartilhar</span>
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;
