
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
  Cell
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
  <div className="bg-zinc-900/40 border border-zinc-800/50 p-5 rounded-2xl hover:border-zinc-700 transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-400`}>
        <Icon size={20} />
      </div>
      <button className="text-zinc-600 hover:text-zinc-400">
        <MoreHorizontal size={18} />
      </button>
    </div>
    <div>
      <p className="text-zinc-400 text-xs font-medium mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <h3 className="text-2xl font-semibold">{value}</h3>
        <span className={`flex items-center text-[10px] mb-1 font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {change}
        </span>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ leads }) => {
  // Stats calculations
  const totalLeads = leads.length;

  // Assume first status is "New" or similar. In a real scenario we'd get the columns.
  // For now, let's look at the distribution.
  const newLeads = leads.filter(l => l.status === 'Aguardando' || l.status === 'new').length;

  const totalPipeline = leads.reduce((acc, l) => acc + (l.value || 0), 0);

  // Assume last status is "Vendido" or "closed"
  const closedLeads = leads.filter(l => l.status === 'Vendido' || l.status === 'closed').length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';

  // Group leads by status for the Bar Chart
  const leadsPerStatus = leads.reduce((acc: any, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
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
    const count = leads.filter(l => l.created_at?.split('T')[0] === dateStr).length;
    const dateObj = new Date(dateStr + 'T12:00:00');
    return {
      name: dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }),
      leads: count,
      conversions: leads.filter(l =>
        l.created_at?.split('T')[0] === dateStr &&
        (l.status === 'Vendido' || l.status === 'closed')
      ).length
    };
  });

  return (
    <div className="p-8 h-full overflow-y-auto space-y-8 min-h-0 flex flex-col">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão Geral do Dashboard</h1>
          <p className="text-zinc-500 text-sm">Bem-vindo de volta, aqui estão as métricas de performance.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium hover:bg-zinc-800 transition-colors">
            Últimos 7 dias
          </button>
          <button className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg">
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <StatCard title="Total de Leads" value={totalLeads.toLocaleString()} change="+12.5%" isPositive={true} icon={Users} color="bg-blue-500" />
        <StatCard title="Novos Leads" value={newLeads.toLocaleString()} change="+4.2%" isPositive={true} icon={PhoneCall} color="bg-amber-500" />
        <StatCard title="Pipeline Total" value={`R$ ${(totalPipeline / 1000).toFixed(1)}k`} change="+18.4%" isPositive={true} icon={DollarSign} color="bg-indigo-500" />
        <StatCard title="Conversão Média" value={`${conversionRate}%`} change="-1.2%" isPositive={false} icon={TrendingUp} color="bg-emerald-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[450px]">
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-sm font-semibold text-zinc-300">Fluxo de Leads e Conversões</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] text-zinc-500">Leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] text-zinc-500">Vendas</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#6366f1" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                <Area type="monotone" dataKey="conversions" stroke="#10b981" fillOpacity={1} fill="url(#colorConversions)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-300 mb-6 shrink-0">Leads por Etapa</h3>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#52525b" />
                <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a78bfa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between shrink-0">
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Conversão</p>
              <p className="text-lg font-bold">78%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Rejeição</p>
              <p className="text-lg font-bold">12%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Tempo</p>
              <p className="text-lg font-bold">4.2m</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
