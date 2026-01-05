
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList
} from 'recharts';
import {
  TrendingUp,
  Users,
  PhoneCall,
  DollarSign,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { METRICS_DATA } from '../constants';
import { Lead } from '../types';

interface DashboardProps {
  leads: Lead[];
}

const StatCard = ({ title, value, change, isPositive, icon: Icon, color }: any) => (
  <div className="bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316] hover:border-zinc-700/50 transition-all group">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-400 shadow-inner`}>
        <Icon size={22} />
      </div>
      <button className="text-zinc-600 hover:text-zinc-400 p-1.5 hover:bg-zinc-800/50 rounded-lg transition-colors">
        <MoreHorizontal size={18} />
      </button>
    </div>
    <div>
      <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">{title}</p>
      <div className="flex items-end gap-2">
        <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
        <span className={`flex items-center text-[11px] mb-1.5 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'} px-2 py-0.5 bg-zinc-900/50 rounded-full border border-zinc-800/50`}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ leads }) => {
  // Stats calculations
  const totalLeads = leads.length;

  // Novos Leads: Criados nas últimas 24h
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const newLeads = leads.filter(l => l.created_at && new Date(l.created_at) > oneDayAgo).length;

  // Aguardando Decisão: Leads com status específico
  const leadsWaitingDecision = leads.filter(l => l.status === 'AGUARDANDO DECISAO').length;

  // Conversão: Leads com agendamento (Call Agendada)
  const leadsWithAppointment = leads.filter(l => l.dataHora_Agendamento !== null).length;
  const conversionRate = totalLeads > 0 ? ((leadsWithAppointment / totalLeads) * 100).toFixed(1) : '0';

  // Group leads by status for the Bar Chart
  const leadsPerStatus = leads.reduce((acc: any, lead) => {
    const status = lead.status || 'Sem Status';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const barChartData = Object.entries(leadsPerStatus).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => (b.value as number) - (a.value as number));

  // Generate 7-day flow for Area Chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const areaChartData = last7Days.map(dateStr => {
    const dayLeads = leads.filter(l => l.created_at?.split('T')[0] === dateStr);
    const dateObj = new Date(dateStr + 'T12:00:00');
    return {
      name: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
      leads: dayLeads.length,
      appointments: dayLeads.filter(l => l.dataHora_Agendamento !== null).length
    };
  });

  // Rejection calculation: Leads in negative statuses
  const rejectedLeads = leads.filter(l =>
    l.status === 'SEM INTERESSE' ||
    l.status === 'SERVIÇO NÃO ATENDIDO' ||
    l.status === 'ENCERRADO'
  ).length;
  const rejectionRate = totalLeads > 0 ? ((rejectedLeads / totalLeads) * 100).toFixed(0) : '0';

  // Response Time: Simulated between 40s and 90s
  const [responseTime] = React.useState(() => (Math.random() * (90 - 40) + 40).toFixed(0));

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Nome', 'Telefone', 'Email', 'Status', 'Data Criacao', 'Data Agendamento'];
    const rows = leads.map(l => [
      l.name,
      l.phone || '',
      l.email || '',
      l.status || '',
      l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '',
      l.dataHora_Agendamento ? new Date(l.dataHora_Agendamento).toLocaleString('pt-BR') : ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_nexo_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 h-full overflow-y-auto space-y-10 custom-scrollbar">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard de Performance</h1>
          <p className="text-zinc-500 text-sm">Visão geral em tempo real dos seus leads e conversões.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 shadow-inner">
            <button className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg text-xs font-bold shadow-sm">
              7 dias
            </button>
            <button className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors">
              30 dias
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <StatCard title="Total de Leads" value={totalLeads.toLocaleString()} change="+12.5%" isPositive={true} icon={Users} color="bg-blue-500" />
        <StatCard title="Novos Leads (24h)" value={newLeads.toLocaleString()} icon={PhoneCall} color="bg-amber-500" change="+4.2%" isPositive={true} />
        <StatCard title="Aguardando Decisão" value={leadsWaitingDecision.toLocaleString()} change="+5.4%" isPositive={true} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard title="Taxa de Agendamento" value={`${conversionRate}%`} change="-1.2%" isPositive={false} icon={Users} color="bg-emerald-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[500px]">
        <div className="lg:col-span-2 bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col">
          <div className="flex justify-between items-center mb-10 shrink-0">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">
              Fluxo Estratégico
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Call Agendada</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #27272a', borderRadius: '20px', padding: '15px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                <Area type="monotone" dataKey="appointments" name="Call Agendada" stroke="#10b981" fillOpacity={1} fill="url(#colorAppointments)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col">
          <h3 className="text-sm font-bold text-zinc-400 mb-10 uppercase tracking-widest pl-2 border-l-4 border-indigo-500 shrink-0">
            Funil por Etapa
          </h3>
          <div className="flex-1 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#71717a" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: '#71717a', fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #27272a', borderRadius: '15px' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={35}>
                  {barChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#312e81'} />
                  ))}
                  <LabelList dataKey="value" position="top" fill="#a1a1aa" fontSize={12} offset={12} fontStyle="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-800/50 flex justify-between shrink-0">
            <div className="text-center group">
              <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-bold mb-1">Conv.</p>
              <p className="text-xl font-bold text-emerald-400">{conversionRate}%</p>
            </div>
            <div className="text-center group">
              <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-bold mb-1">Rejeição</p>
              <p className="text-xl font-bold text-rose-400">{rejectionRate}%</p>
            </div>
            <div className="text-center group">
              <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-bold mb-1">Tempo</p>
              <p className="text-xl font-bold text-indigo-400">{responseTime}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
