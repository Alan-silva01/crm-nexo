import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface WeeklyCalendarProps {
    onDateChange?: (date: Date) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ onDateChange }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Months and Days in PT-BR
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Generate 11 days centered around the selected date
    const visibleDays = useMemo(() => {
        const days = [];
        for (let i = -5; i <= 5; i++) {
            const date = new Date(selectedDate);
            date.setDate(selectedDate.getDate() + i);
            days.push(date);
        }
        return days;
    }, [selectedDate]);

    const handlePrevWeek = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() - 7);
        setSelectedDate(newDate);
        onDateChange?.(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + 7);
        setSelectedDate(newDate);
        onDateChange?.(newDate);
    };

    const handleToday = () => {
        const today = new Date();
        setSelectedDate(today);
        onDateChange?.(today);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isSelected = (date: Date) => {
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    return (
        <div className="glass rounded-3xl p-6 mb-8 border border-zinc-800/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <CalendarIcon size={20} className="text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">
                        {months[selectedDate.getMonth()]} <span className="text-zinc-500 font-normal">{selectedDate.getFullYear()}</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToday}
                        className="px-4 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-all border border-zinc-700/50"
                    >
                        Hoje
                    </button>
                    <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-full border border-zinc-800/50">
                        <button
                            onClick={handlePrevWeek}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-full transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                            Semana
                        </div>
                        <button
                            onClick={handleNextWeek}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-full transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2 pb-2">
                {visibleDays.map((date, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setSelectedDate(date);
                            onDateChange?.(date);
                        }}
                        className={`flex flex-col items-center min-w-[60px] py-4 rounded-2xl transition-all duration-300 group
              ${isSelected(date)
                                ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20 scale-110 -translate-y-1'
                                : 'hover:bg-zinc-800/50'}`}
                    >
                        <span className={`text-[10px] uppercase font-bold tracking-tighter mb-1
              ${isSelected(date) ? 'text-indigo-100' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                            {daysOfWeek[date.getDay()]}
                        </span>
                        <span className={`text-lg font-bold
              ${isSelected(date) ? 'text-white' : 'text-zinc-200'}`}>
                            {date.getDate()}
                        </span>
                        {isToday(date) && !isSelected(date) && (
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 ring-2 ring-indigo-500/20 shadow-sm shadow-indigo-500/50 animate-pulse" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WeeklyCalendar;
