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

    // Generate all days for the current month
    const visibleDays = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 1; i <= lastDay; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

    const handlePrevMonth = () => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(selectedDate.getMonth() - 1);
        setSelectedDate(newDate);
        onDateChange?.(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(selectedDate.getMonth() + 1);
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
        <div className="glass rounded-xl p-1.5 2xl:p-2 mb-3 2xl:mb-4 border border-zinc-800/40 w-full overflow-hidden [@media(max-height:850px)]:mb-2 [@media(max-height:850px)]:p-1">
            <div className="flex items-center justify-between mb-1.5 2xl:mb-2 px-2 [@media(max-height:850px)]:mb-1">
                <div className="flex items-center gap-1.5 text-zinc-400">
                    <CalendarIcon size={12} className="text-indigo-400 opacity-60" />
                    <span className="text-[10px] 2xl:text-[11px] font-medium tracking-wide first-letter:uppercase">
                        {months[selectedDate.getMonth()]}
                    </span>
                    <span className="text-[10px] 2xl:text-[11px] font-light opacity-50">{selectedDate.getFullYear()}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToday}
                        className="text-[8px] 2xl:text-[9px] font-semibold text-zinc-500 hover:text-indigo-400 transition-colors uppercase tracking-tighter"
                    >
                        Hoje
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevMonth}
                            className="p-0.5 hover:text-white text-zinc-600 transition-colors"
                        >
                            <ChevronLeft size={10} />
                        </button>
                        <button
                            onClick={handleNextMonth}
                            className="p-0.5 hover:text-white text-zinc-600 transition-colors"
                        >
                            <ChevronRight size={10} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-0.5 pb-1 px-1">
                {visibleDays.map((date, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setSelectedDate(date);
                            onDateChange?.(date);
                        }}
                        className={`flex flex-col items-center justify-center flex-1 min-w-[28px] 2xl:min-w-[32px] h-8 2xl:h-10 rounded-lg transition-all duration-200 relative
              ${isSelected(date)
                                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/50 z-10'
                                : 'hover:bg-zinc-800/30 text-zinc-400'}
              [@media(max-height:850px)]:h-7 [@media(max-height:850px)]:min-w-[24px]`}
                    >
                        <span className={`text-[6px] 2xl:text-[7px] uppercase font-bold tracking-tighter leading-none mb-0.5
              ${isSelected(date) ? 'text-indigo-100' : 'text-zinc-600'}`}>
                            {daysOfWeek[date.getDay()]}
                        </span>
                        <span className="text-[10px] 2xl:text-[12px] font-bold leading-none">
                            {date.getDate()}
                        </span>
                        {isToday(date) && !isSelected(date) && (
                            <div className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full" />
                        )}
                        {isToday(date) && isSelected(date) && (
                            <div className="absolute bottom-0.5 w-1 h-1 bg-white rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WeeklyCalendar;
