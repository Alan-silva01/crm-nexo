import React from 'react';
import { Lead } from '../types';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, Calendar, ArrowUpRight, TrendingUp, Users, Target, DollarSign, Briefcase } from 'lucide-react';

interface DetailedAnalyticsProps {
  leads: Lead[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e'];

const DetailedAnalytics: React.FC<DetailedAnalyticsProps> = ({ leads }) => {
  const [ticketMedio, setTicketMedio] = React.useState<number>(() => {
    const saved = localStorage.getItem('crm_ticket_medio');
    return saved ? parseFloat(saved) : 1000;
  });
  const [ltv, setLtv] = React.useState<number>(() => {
    const saved = localStorage.getItem('crm_ltv');
    return saved ? parseFloat(saved) : 5000;
  });

  const handleTicketChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setTicketMedio(num);
    localStorage.setItem('crm_ticket_medio', num.toString());
  };

  const handleLtvChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setLtv(num);
    localStorage.setItem('crm_ltv', num.toString());
  };

  // Real data calculations
  const totalLeads = leads.length;
  const closedLeads = leads.filter(l => l.status === 'CONCLUIDO' || l.status === 'VENDIDO').length;
  const waitingDecisionLeads = leads.filter(l => l.status === 'AGUARDANDO DECISAO').length;
  const scheduledLeads = leads.filter(l => l.dataHora_Agendamento !== null).length;

  const faturamentoReal = closedLeads * ticketMedio;
  const faturamentoPotencialDecisao = waitingDecisionLeads * ticketMedio;
  const ltvTotal = closedLeads * ltv;

  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';

  // Projection logic
  const conversionSimulatedPerncent = 30; // 30% conversion for the "opportunity" text
  const projectedExtraRevenue = (waitingDecisionLeads * (conversionSimulatedPerncent / 100)) * ticketMedio;

  // Distribution by status for Pie Chart
  const statusDistribution = leads.reduce((acc: any, lead) => {
    const status = lead.status || 'Sem Status';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusDistribution).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="p-8 h-full overflow-y-auto space-y-8 custom-scrollbar">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios e Projeções</h1>
          <p className="text-zinc-500 text-sm">Visão financeira baseada em dados reais e Ticket Médio.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Ticket Médio</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-400">R$</span>
                <input
                  type="number"
                  value={ticketMedio}
                  onChange={(e) => handleTicketChange(e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-bold w-20 focus:ring-0 text-indigo-400"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">LTV Estimado</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-400">R$</span>
                <input
                  type="number"
                  value={ltv}
                  onChange={(e) => handleLtvChange(e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-bold w-20 focus:ring-0 text-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316]">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <DollarSign size={16} className="text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Faturamento Real</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">R$ {faturamentoReal.toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">{closedLeads} vendas concluídas</p>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316]">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp size={16} className="text-amber-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Projeção (Aguardando)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400/90">R$ {faturamentoPotencialDecisao.toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">{waitingDecisionLeads} leads em decisão</p>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316]">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Briefcase size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">LTV Realizado</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">R$ {ltvTotal.toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Valor vitalício dos clientes atuais</p>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316]">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Target size={16} className="text-rose-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Op. de Agendamento</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{scheduledLeads}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Leads com call agendada</p>
        </div>
      </div>

      {/* Analysis Text */}
      <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <TrendingUp size={120} className="text-indigo-500" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h3 className="text-lg font-bold text-indigo-100 mb-4 flex items-center gap-2">
            <ArrowUpRight size={20} />
            Análise de Oportunidade Nexo
          </h3>
          <p className="text-zinc-300 leading-relaxed text-sm">
            Atualmente, você possui <span className="text-white font-bold">{waitingDecisionLeads} leads</span> na etapa de <span className="italic text-indigo-300">Aguardando Decisão</span>.
            Considerando o seu Ticket Médio de <span className="text-white font-bold">R$ {ticketMedio.toLocaleString('pt-BR')}</span>,
            se conseguirmos converter apenas <span className="text-indigo-300 font-bold">{conversionSimulatedPerncent}%</span> desses contatos,
            você terá um incremento imediato de <span className="text-emerald-400 font-bold text-lg">R$ {projectedExtraRevenue.toLocaleString('pt-BR')}</span> no seu faturamento mensal.
          </p>
          <div className="mt-6 flex gap-4">
            <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20">
              Focar em Decisão
            </button>
            <button className="px-6 py-2.5 bg-zinc-900 text-zinc-300 rounded-2xl text-xs font-bold hover:bg-zinc-800 transition-colors border border-zinc-800">
              Ver Leads
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] h-[450px] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
          <h3 className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">
            Distribuição por Status
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #27272a', borderRadius: '20px', padding: '15px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Legend
                  iconType="circle"
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: '11px', paddingLeft: '20px', color: '#71717a' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] h-[450px] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col justify-center items-center text-center">
          <div className="p-6 bg-indigo-500/10 rounded-full mb-6">
            <Target size={48} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Meta de Conversão</h3>
          <p className="text-zinc-500 text-sm max-w-xs mb-8">
            Sua taxa de conversão real atual é de <span className="text-white font-bold">{conversionRate}%</span>.
            A meta do setor é manter acima de 25%.
          </p>
          <div className="w-full max-w-xs h-3 bg-zinc-900 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000"
              style={{ width: `${Math.min(parseFloat(conversionRate) * 2, 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Progresso da Meta</span>
        </div>
      </div>
    </div>
  );
};

export default DetailedAnalytics;
