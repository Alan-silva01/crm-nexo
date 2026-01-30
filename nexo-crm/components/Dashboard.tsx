import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Sector
} from 'recharts';
import {
  TrendingUp,
  Users,
  PhoneCall,
  Clock,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Lead, LeadColumnHistory } from '../types';
import { useTheme } from '../src/lib/ThemeContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#0ea5e9', '#f97316', '#22c55e', '#d946ef'];

// Custom Tooltip component using Tailwind classes for reliable theme switching
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 shadow-lg dark:shadow-none">
      <p className="text-zinc-900 dark:text-white font-bold text-xs mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-[11px]">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-700 dark:text-zinc-300 uppercase">
            {entry.name}: <span className="font-semibold text-zinc-900 dark:text-white">{entry.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

const DashboardClock = () => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white dark:bg-[#0c0c0e] shadow-xl dark:shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border border-zinc-200 dark:border-zinc-800/10">
      <div className="flex items-center gap-2 text-indigo-400">
        <Clock size={14} />
        <span className="text-xs font-bold tracking-tight">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="w-[1px] h-3 bg-zinc-800"></div>
      <div className="flex items-center gap-2 text-zinc-500">
        <Calendar size={12} />
        <span className="text-[10px] font-bold uppercase tracking-widest">{time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, isPositive, icon: Icon }: any) => (
  <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/50 p-4 [@media(max-height:800px)]:p-2.5 rounded-[1.5rem] [@media(max-height:800px)]:rounded-xl shadow-xl dark:shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316] hover:border-indigo-500/30 dark:hover:border-zinc-700/50 transition-all group">
    <div className="flex justify-between items-start mb-3 [@media(max-height:800px)]:mb-2">
      <div className="p-2 [@media(max-height:800px)]:p-1.5 rounded-xl [@media(max-height:800px)]:rounded-lg bg-indigo-50 dark:bg-indigo-500/10 shadow-inner">
        <Icon size={16} className="[@media(max-height:800px)]:w-3.5 [@media(max-height:800px)]:h-3.5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <button className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors [@media(max-height:800px)]:hidden">
        <MoreHorizontal size={14} />
      </button>
    </div>
    <div>
      <p className="text-zinc-500 text-[9px] [@media(max-height:800px)]:text-[8px] uppercase font-bold tracking-widest mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <h3 className="text-xl [@media(max-height:800px)]:text-lg font-bold tracking-tight">{value}</h3>
        <span className={`flex items-center text-[10px] [@media(max-height:800px)]:text-[9px] mb-0.5 font-bold ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'} px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-900/50 rounded-full border border-zinc-200 dark:border-zinc-800/50`}>
          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {change}
        </span>
      </div>
    </div>
  </div>
);


interface DashboardProps {
  leads: Lead[];
  columns: any[];
  leadsHistory: Record<string, LeadColumnHistory[]>;
}

const Dashboard: React.FC<DashboardProps> = ({ leads, columns, leadsHistory }) => {
  const totalLeads = leads.length;
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const newLeads = leads.filter(l => l.created_at && new Date(l.created_at) > oneDayAgo).length;
  const leadsWaitingDecision = leads.filter(l => l.status?.trim().toUpperCase() === 'AGUARDANDO DECISAO').length;

  // Fix: Check for truthy value to avoid undefined !== null issues
  // and include status-based appointments for consistency with the chart
  const agendamentoCols = columns.filter(c => c.name.toLowerCase().includes('agendad'));
  const agendamentoNames = new Set(agendamentoCols.map(c => c.name.trim().toUpperCase()));
  const agendamentoLabel = agendamentoCols.length > 1 ? 'Agendados' : (agendamentoCols.length === 1 ? agendamentoCols[0].name : 'Agendados');

  const noInterestCols = columns.filter(c =>
    c.name.toLowerCase().includes('sem interess') ||
    c.name.toLowerCase().includes('perdido') ||
    c.name.toLowerCase().includes('desistiu') ||
    c.name.toLowerCase().includes('lixo')
  );
  const noInterestNames = new Set(noInterestCols.map(c => c.name.trim().toUpperCase()));

  const leadsWithAppointment = leads.filter(l => {
    // Stat is scheduled if current status name contains "AGENDAD"
    return l.status && l.status.toLowerCase().includes('agendad');
  }).length;

  const conversionRate = totalLeads > 0 ? ((leadsWithAppointment / totalLeads) * 100).toFixed(1) : '0';

  const rejectedLeads = leads.filter(l =>
    l.status && noInterestNames.has(l.status.trim().toUpperCase())
  ).length;

  const rejectionRate = totalLeads > 0 ? ((rejectedLeads / totalLeads) * 100).toFixed(0) : '0';

  const chartScrollRef = React.useRef<HTMLDivElement>(null);

  const areaChartData = React.useMemo(() => {
    // Helper to get YYYY-MM-DD from any date
    const getIsoDate = (d: any) => {
      if (!d) return null;
      try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return null;
        return dateObj.toISOString().split('T')[0];
      } catch (e) {
        return null;
      }
    };

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    // 1. Pre-calculate 'No Interest' arrivals per date for current leads only
    const noInterestArrivals: Record<string, number> = {};
    leads.forEach(lead => {
      const isCurrentlyNoInterest = lead.status && noInterestNames.has(lead.status.trim().toUpperCase());
      if (!isCurrentlyNoInterest) return;

      const history = leadsHistory[lead.id] || [];
      const latestMoveToNoInterest = [...history].reverse().find(h =>
        h.to_column?.name && (
          h.to_column.name.toLowerCase().includes('sem interess') ||
          h.to_column.name.toLowerCase().includes('perdido') ||
          h.to_column.name.toLowerCase().includes('desistiu') ||
          h.to_column.name.toLowerCase().includes('lixo')
        )
      );

      const arrivalDate = latestMoveToNoInterest ? latestMoveToNoInterest.moved_at : lead.created_at;
      const isoArrival = getIsoDate(arrivalDate);
      if (isoArrival) {
        noInterestArrivals[isoArrival] = (noInterestArrivals[isoArrival] || 0) + 1;
      }
    });

    return last30Days.map(dateStr => {
      const dayLeadsCount = leads.filter(l => getIsoDate(l.created_at) === dateStr).length;

      const dayAppointmentsCount = leads.filter(l => {
        const isAgendadoStatus = l.status && l.status.toLowerCase().includes('agendad');
        if (!isAgendadoStatus) return false;

        // If it has a date, use the date to position in the chart
        if (l.dataHora_Agendamento) {
          return getIsoDate(l.dataHora_Agendamento) === dateStr;
        }
        // Fallback to creation date if it's in the status but has no date
        return getIsoDate(l.created_at) === dateStr;
      }).length;

      const dateObj = new Date(dateStr + 'T12:00:00');

      return {
        name: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
        leads: dayLeadsCount,
        appointments: dayAppointmentsCount,
        noInterest: noInterestArrivals[dateStr] || 0
      };
    });
  }, [leads, columns, agendamentoNames, noInterestNames, leadsHistory]);

  // Auto-scroll to the end of the chart (latest data)
  React.useEffect(() => {
    const scrollToLatest = () => {
      if (chartScrollRef.current) {
        chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
      }
    };

    // Use multiple triggers to ensure scroll happens after layout
    scrollToLatest();
    const timer = setTimeout(scrollToLatest, 100);
    const animationFrame = requestAnimationFrame(scrollToLatest);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
    };
  }, [areaChartData]);

  // Distribution by status for Pie Chart
  const statusDistribution = React.useMemo(() => leads.reduce((acc: any, lead) => {
    // Normalize status name based on effective columns if possible, or just uppercase it
    const rawStatus = lead.status?.trim().toUpperCase() || 'SEM STATUS';
    // Find matching column name for display
    const matchingCol = columns.find(c => c.name.trim().toUpperCase() === rawStatus);
    const statusName = matchingCol ? matchingCol.name : rawStatus;

    acc[statusName] = (acc[statusName] || 0) + 1;
    return acc;
  }, {}), [leads, columns]);

  const pieData = React.useMemo(() => Object.entries(statusDistribution).map(([name, value]) => ({
    name,
    value
  })), [statusDistribution]);

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // IMPORTANT: useTheme must be declared BEFORE renderActiveShape to ensure isDark is in scope
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const renderActiveShape = (props: any) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value
    } = props;

    return (
      <g>
        <filter id="glow-pie">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <text x="50%" y="50%" dy={-35} textAnchor="middle" fill="#71717a" fontSize={9} fontWeight="bold" className="uppercase tracking-widest" style={{ transition: 'all 0.3s ease' }}>
          {payload.name.length > 15 ? `${payload.name.substring(0, 12)}...` : payload.name}
        </text>
        <text x="50%" y="50%" dy={10} textAnchor="middle" fill={isDark ? "#fff" : "#18181b"} fontSize={24} fontWeight="bold" style={{ transition: 'all 0.3s ease' }}>
          {value}
        </text>
        <text x="50%" y="50%" dy={30} textAnchor="middle" fill="#10b981" fontSize={11} fontWeight="bold" style={{ transition: 'all 0.3s ease' }}>
          {`${(percent * 100).toFixed(1)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          filter="url(#glow-pie)"
          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          fill={fill}
        />
      </g>
    );
  };

  const [responseTime] = React.useState(() => (Math.random() * (90 - 40) + 40).toFixed(0));

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Nome', 'Telefone', 'Email', 'Status', 'Data Criacao', 'Data Agendamento'];
    const rows = leads.map(l => [l.name, l.phone || '', l.email || '', l.status || '', l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '', l.dataHora_Agendamento ? new Date(l.dataHora_Agendamento).toLocaleString('pt-BR') : '']);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_nero_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="p-4 2xl:p-6 h-full flex flex-col space-y-3 2xl:space-y-4 overflow-hidden [@media(max-height:850px)]:p-3 [@media(max-height:850px)]:space-y-2">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 [@media(max-height:800px)]:mb-1">
        <div>
          <h1 className="text-lg md:text-xl [@media(max-height:800px)]:text-lg font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-[10px] md:text-xs [@media(max-height:800px)]:text-[10px] hidden sm:block">Performance em tempo real.</p>
        </div>
        <div className="flex w-full sm:w-auto justify-between sm:justify-end gap-2 md:gap-4">
          <DashboardClock />
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 md:px-6 py-2 bg-indigo-600 text-white rounded-xl text-[9px] md:text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 [@media(max-height:850px)]:py-1.5"
          >
            Exportar
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-2 md:gap-3 2xl:gap-4 shrink-0 overflow-x-auto pb-1">
        <StatCard title="Total de Leads" value={totalLeads.toLocaleString()} change="+12.5%" isPositive={true} icon={Users} />
        <StatCard title="Novos Leads (24h)" value={newLeads.toLocaleString()} icon={PhoneCall} change="+4.2%" isPositive={true} />
        <StatCard title="Aguardando Decisão" value={leadsWaitingDecision.toLocaleString()} change="+5.4%" isPositive={true} icon={TrendingUp} />
        <StatCard title="Taxa de Agendamento" value={`${conversionRate}%`} change="-1.2%" isPositive={false} icon={Users} />
      </div>


      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 [@media(max-height:800px)]:gap-3 flex-1 min-h-0">
        <div className="col-span-2 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/50 p-4 [@media(max-height:800px)]:p-3 rounded-[1.5rem] [@media(max-height:800px)]:rounded-xl shadow-xl dark:shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 [@media(max-height:800px)]:mb-2 shrink-0">
            <h3 className="text-[10px] [@media(max-height:800px)]:text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">
              Fluxo Estratégico
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">{agendamentoLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Sem Interesse</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0 overflow-x-auto custom-scrollbar" ref={chartScrollRef}>
            <div className="h-full min-w-[800px] md:min-w-[2000px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 5, right: 30, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNoInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27272a" : "#e4e4e7"} opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#52525b" : "#71717a"}
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? "#52525b" : "#71717a" }}
                  />
                  <YAxis
                    stroke={isDark ? "#52525b" : "#71717a"}
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? "#52525b" : "#71717a" }}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                  <Area type="monotone" dataKey="appointments" name={agendamentoLabel} stroke="#10b981" fillOpacity={1} fill="url(#colorAppointments)" strokeWidth={2} />
                  <Area type="monotone" dataKey="noInterest" name="Sem Interesse" stroke="#f43f5e" fillOpacity={1} fill="url(#colorNoInterest)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/50 p-4 [@media(max-height:800px)]:p-3 rounded-[1.5rem] [@media(max-height:800px)]:rounded-xl shadow-xl dark:shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col min-h-0">
          <h3 className="text-[10px] [@media(max-height:800px)]:text-[9px] font-bold text-zinc-400 mb-2 uppercase tracking-widest pl-2 border-l-4 border-indigo-500 shrink-0">
            Distribuição por Status
          </h3>
          <div className="flex-1 w-full min-h-0" style={{ minHeight: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  {...({
                    data: pieData,
                    cx: "50%",
                    cy: "50%",
                    innerRadius: "65%",
                    outerRadius: "85%",
                    paddingAngle: 8,
                    dataKey: "value",
                    stroke: "none",
                    activeIndex: activeIndex !== null ? activeIndex : undefined,
                    activeShape: renderActiveShape,
                    onMouseEnter: onPieEnter,
                    onMouseLeave: onPieLeave,
                    animationDuration: 400,
                    animationEasing: "ease-out"
                  } as any)}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{ transition: 'all 0.3s' }}
                    />
                  ))}
                </Pie>
                {activeIndex === null && (
                  <g style={{ transition: 'all 0.3s ease' }}>
                    <text x="50%" y="50%" dy={-35} textAnchor="middle" fill="#71717a" fontSize={9} fontWeight="bold" className="uppercase tracking-widest" style={{ transition: 'all 0.3s ease' }}>
                      Colunas do Kanban
                    </text>
                    <text x="50%" y="50%" dy={10} textAnchor="middle" fill={isDark ? "#fff" : "#18181b"} fontSize={24} fontWeight="bold" style={{ transition: 'all 0.3s ease' }}>
                      100%
                    </text>
                    <text x="50%" y="50%" dy={30} textAnchor="middle" fill="#10b981" fontSize={11} fontWeight="bold" style={{ transition: 'all 0.3s ease' }}>
                      Visão Geral
                    </text>
                  </g>
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Grid Legend - Two equal columns with scroll if many items */}
          <div className="mt-1 shrink-0 max-h-24 [@media(max-height:800px)]:max-h-16 overflow-y-auto custom-scrollbar pr-1">
            <div className="flex">
              {/* Left column - centered in its 50% */}
              <div className="w-1/2 flex justify-center border-r border-zinc-800/20">
                <div className="flex flex-col items-start gap-1 w-full pl-2">
                  {pieData.slice(0, Math.ceil(pieData.length / 2)).map((entry, index) => (
                    <div key={`legend-l-${index}`} className="flex items-center gap-2 min-w-0 w-full">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight truncate flex-1" title={entry.name}>
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right column - centered in its 50% */}
              <div className="w-1/2 flex justify-center">
                <div className="flex flex-col items-start gap-1 w-full pl-4">
                  {pieData.slice(Math.ceil(pieData.length / 2)).map((entry, index) => {
                    const realIndex = Math.ceil(pieData.length / 2) + index;
                    return (
                      <div key={`legend-r-${index}`} className="flex items-center gap-2 min-w-0 w-full">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[realIndex % COLORS.length] }}
                        />
                        <span className={`text-[9px] font-bold uppercase tracking-tight truncate flex-1 ${isDark ? 'text-zinc-500' : 'text-zinc-700'}`} title={entry.name}>
                          {entry.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 [@media(max-height:800px)]:mt-1 pt-2 [@media(max-height:800px)]:pt-1 border-t border-zinc-800/50 flex justify-between shrink-0">
            <div className="text-center group">
              <p className="text-[9px] [@media(max-height:800px)]:text-[8px] text-zinc-500 uppercase tracking-tighter font-bold">Conv.</p>
              <p className="text-base [@media(max-height:800px)]:text-sm font-bold text-emerald-400">{conversionRate}%</p>
            </div>
            <div className="text-center group">
              <p className="text-[9px] [@media(max-height:800px)]:text-[8px] text-zinc-500 uppercase tracking-tighter font-bold">Rejeição</p>
              <p className="text-base [@media(max-height:800px)]:text-sm font-bold text-rose-400">{rejectionRate}%</p>
            </div>
            <div className="text-center group">
              <p className="text-[9px] [@media(max-height:800px)]:text-[8px] text-zinc-500 uppercase tracking-tighter font-bold">Tempo</p>
              <p className="text-base [@media(max-height:800px)]:text-sm font-bold text-indigo-400">{responseTime}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
