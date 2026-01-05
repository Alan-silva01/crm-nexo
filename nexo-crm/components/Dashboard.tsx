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
import { Lead } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#0ea5e9', '#f97316', '#22c55e', '#d946ef'];

const DashboardClock = () => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0c0c0e] shadow-[inset_4px_4px_8px_#060607,inset_-4px_-4px_8px_#121215] border border-zinc-800/10">
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

const StatCard = ({ title, value, change, isPositive, icon: Icon, color }: any) => (
  <div className="bg-[#0c0c0e] border border-zinc-800/50 p-4 rounded-[1.5rem] shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316] hover:border-zinc-700/50 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-400 shadow-inner`}>
        <Icon size={18} />
      </div>
      <button className="text-zinc-600 hover:text-zinc-400 p-1 hover:bg-zinc-800/50 rounded-lg transition-colors">
        <MoreHorizontal size={16} />
      </button>
    </div>
    <div>
      <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest mb-1.5">{title}</p>
      <div className="flex items-end gap-2">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        <span className={`flex items-center text-[10px] mb-1 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'} px-2 py-0.5 bg-zinc-900/50 rounded-full border border-zinc-800/50`}>
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
}

const Dashboard: React.FC<DashboardProps> = ({ leads, columns }) => {
  const totalLeads = leads.length;
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const newLeads = leads.filter(l => l.created_at && new Date(l.created_at) > oneDayAgo).length;
  const leadsWaitingDecision = leads.filter(l => l.status === 'AGUARDANDO DECISAO').length;
  const leadsWithAppointment = leads.filter(l => l.dataHora_Agendamento !== null).length;
  const conversionRate = totalLeads > 0 ? ((leadsWithAppointment / totalLeads) * 100).toFixed(1) : '0';

  const areaChartData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(dateStr => {
      const dayLeads = leads.filter(l => l.created_at?.split('T')[0] === dateStr);
      const dateObj = new Date(dateStr + 'T12:00:00');
      return {
        name: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
        leads: dayLeads.length,
        appointments: dayLeads.filter(l => l.dataHora_Agendamento !== null).length
      };
    });
  }, [leads]);

  // Distribution by status for Pie Chart
  const statusDistribution = React.useMemo(() => leads.reduce((acc: any, lead) => {
    const status = lead.status || 'Sem Status';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {}), [leads]);

  const pieData = React.useMemo(() => Object.entries(statusDistribution).map(([name, value]) => ({
    name,
    value
  })), [statusDistribution]);

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

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
        <text x="50%" y="45%" dy={-35} textAnchor="middle" fill="#71717a" fontSize={9} fontWeight="bold" className="uppercase tracking-widest">
          {payload.name.length > 15 ? `${payload.name.substring(0, 12)}...` : payload.name}
        </text>
        <text x="50%" y="45%" dy={10} textAnchor="middle" fill="#fff" fontSize={24} fontWeight="bold">
          {value}
        </text>
        <text x="50%" y="45%" dy={30} textAnchor="middle" fill="#10b981" fontSize={11} fontWeight="bold">
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

  const rejectedLeads = leads.filter(l =>
    l.status === 'SEM INTERESSE' ||
    l.status === 'SERVIÇO NÃO ATENDIDO' ||
    l.status === 'ENCERRADO'
  ).length;
  const rejectionRate = totalLeads > 0 ? ((rejectedLeads / totalLeads) * 100).toFixed(0) : '0';
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
    link.setAttribute('download', `leads_nexo_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4 overflow-hidden">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard de Performance</h1>
          <p className="text-zinc-500 text-xs">Visão geral em tempo real dos seus leads e conversões.</p>
        </div>
        <div className="flex gap-4">
          <DashboardClock />
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <StatCard title="Total de Leads" value={totalLeads.toLocaleString()} change="+12.5%" isPositive={true} icon={Users} color="bg-blue-500" />
        <StatCard title="Novos Leads (24h)" value={newLeads.toLocaleString()} icon={PhoneCall} color="bg-amber-500" change="+4.2%" isPositive={true} />
        <StatCard title="Aguardando Decisão" value={leadsWaitingDecision.toLocaleString()} change="+5.4%" isPositive={true} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard title="Taxa de Agendamento" value={`${conversionRate}%`} change="-1.2%" isPositive={false} icon={Users} color="bg-emerald-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="col-span-2 bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">
              Fluxo Estratégico
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Call Agendada</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #27272a', borderRadius: '15px', padding: '10px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                <Area type="monotone" dataKey="appointments" name="Call Agendada" stroke="#10b981" fillOpacity={1} fill="url(#colorAppointments)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col min-h-0">
          <h3 className="text-xs font-bold text-zinc-400 mb-6 uppercase tracking-widest pl-2 border-l-4 border-indigo-500 shrink-0">
            Distribuição por Status
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* @ts-ignore */}
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
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
                  <g>
                    <text x="50%" y="45%" dy={-35} textAnchor="middle" fill="#71717a" fontSize={9} fontWeight="bold" className="uppercase tracking-widest">
                      Colunas do Kanban
                    </text>
                    <text x="50%" y="45%" dy={10} textAnchor="middle" fill="#fff" fontSize={24} fontWeight="bold">
                      100%
                    </text>
                    <text x="50%" y="45%" dy={30} textAnchor="middle" fill="#10b981" fontSize={11} fontWeight="bold">
                      Visão Geral
                    </text>
                  </g>
                )}
                <Legend
                  iconType="circle"
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  wrapperStyle={{
                    fontSize: '8px',
                    paddingTop: '20px',
                    color: '#71717a',
                    width: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between shrink-0">
            <div className="text-center group">
              <p className="text-[9px] text-zinc-500 uppercase tracking-tighter font-bold">Conv.</p>
              <p className="text-lg font-bold text-emerald-400">{conversionRate}%</p>
            </div>
            <div className="text-center group">
              <p className="text-[9px] text-zinc-500 uppercase tracking-tighter font-bold">Rejeição</p>
              <p className="text-lg font-bold text-rose-400">{rejectionRate}%</p>
            </div>
            <div className="text-center group">
              <p className="text-[9px] text-zinc-500 uppercase tracking-tighter font-bold">Tempo</p>
              <p className="text-lg font-bold text-indigo-400">{responseTime}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
