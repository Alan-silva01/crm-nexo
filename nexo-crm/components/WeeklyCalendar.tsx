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
        <div className="glass rounded-xl p-2 mb-4 border border-zinc-800/40 max-w-fit mx-auto">
            <div className="flex items-center justify-between mb-2 px-2 gap-8">
                <div className="flex items-center gap-1.5 text-zinc-400">
                    <CalendarIcon size={12} className="text-indigo-400 opacity-60" />
                    <span className="text-[11px] font-medium tracking-wide first-letter:uppercase">
                        {months[selectedDate.getMonth()]}
                    </span>
                    <span className="text-[11px] font-light opacity-50">{selectedDate.getFullYear()}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToday}
                        className="text-[9px] font-semibold text-zinc-500 hover:text-indigo-400 transition-colors uppercase tracking-tighter"
                    >
                        Hoje
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevWeek}
                            className="p-0.5 hover:text-white text-zinc-600 transition-colors"
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <button
                            onClick={handleNextWeek}
                            className="p-0.5 hover:text-white text-zinc-600 transition-colors"
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-1">
                {visibleDays.map((date, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setSelectedDate(date);
                            onDateChange?.(date);
                        }}
                        className={`flex flex-col items-center justify-center w-8 h-10 rounded-lg transition-all duration-200
                            ${isSelected(date)
                                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/50'
                                : 'hover:bg-zinc-800/30 text-zinc-400'}`}
                    >
                        <span className={`text-[7px] uppercase font-bold tracking-tighter leading-none mb-0.5
                            ${isSelected(date) ? 'text-indigo-100' : 'text-zinc-600'}`}>
                            {daysOfWeek[date.getDay()]}
                        </span>
                        <span className="text-[12px] font-bold leading-none">
                            {date.getDate()}
                        </span>
                        {isToday(date) && !isSelected(date) && (
                            <div className="absolute -bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full" />
                        )}
                        {isToday(date) && isSelected(date) && (
                            <div className="absolute -bottom-0.5 w-1 h-1 bg-white rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WeeklyCalendar;
