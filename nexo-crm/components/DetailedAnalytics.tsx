import React from 'react';
import { Lead } from '../types';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Sector
} from 'recharts';
import { Download, Calendar, ArrowUpRight, TrendingUp, Users, Target, DollarSign, Briefcase } from 'lucide-react';

interface DetailedAnalyticsProps {
  leads: Lead[];
  onAction?: (action: 'view-decision-kanban' | 'focus-decision') => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e'];

const DetailedAnalytics: React.FC<DetailedAnalyticsProps> = ({ leads, onAction }) => {
  const [ticketRaw, setTicketRaw] = React.useState<string>(() => {
    return localStorage.getItem('crm_ticket_medio') || '1000';
  });
  const [ltvRaw, setLtvRaw] = React.useState<string>(() => {
    return localStorage.getItem('crm_ltv') || '5000';
  });

  const ticketMedio = parseFloat(ticketRaw) || 0;
  const ltv = parseFloat(ltvRaw) || 0;

  const handleTicketChange = (val: string) => {
    setTicketRaw(val);
    const num = parseFloat(val) || 0;
    localStorage.setItem('crm_ticket_medio', num.toString());
  };

  const handleLtvChange = (val: string) => {
    setLtvRaw(val);
    const num = parseFloat(val) || 0;
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
  const conversionSimulatedPercent = 30; // 30% conversion for the "opportunity" text
  // Round to nearest whole person, minimum 1 if there are leads
  const projectedExtraLeads = Math.max(
    waitingDecisionLeads > 0 ? 1 : 0,
    Math.round(waitingDecisionLeads * (conversionSimulatedPercent / 100))
  );

  const projectedExtraRevenue = projectedExtraLeads * ticketMedio;
  const projectedExtraLTV = projectedExtraLeads * ltv;

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
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#71717a" fontSize={10} fontWeight="bold" className="uppercase tracking-widest">
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#fff" fontSize={22} fontWeight="bold">
          {value}
        </text>
        <text x={cx} y={cy} dy={25} textAnchor="middle" fill="#10b981" fontSize={10} fontWeight="bold">
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
                  value={ticketRaw}
                  onChange={(e) => handleTicketChange(e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-bold w-20 focus:ring-0 text-indigo-400"
                  placeholder="0"
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
                  value={ltvRaw}
                  onChange={(e) => handleLtvChange(e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-bold w-20 focus:ring-0 text-emerald-400"
                  placeholder="0"
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
              <Target size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Taxa de Conversão</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{conversionRate}%</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Total de leads vs concluídos</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] h-[450px] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
          <h3 className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">
            Distribuição por Status
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* @ts-ignore */}
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={(data, index) => {
                    console.log('Clicked slice:', data);
                    // Selection logic could go here
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{ filter: activeIndex === index ? 'drop-shadow(0 0 8px currentColor)' : 'none', transition: 'all 0.3s' }}
                    />
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

      {/* Analysis Text */}
      <div className="bg-[#0c0c0e] border border-zinc-800/50 p-10 rounded-[3rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] relative overflow-hidden group border-l-4 border-l-indigo-500/50">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
          <Briefcase size={160} className="text-white" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <ArrowUpRight size={20} className="text-indigo-400" />
            </div>
            <h3 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">
              Análise de Oportunidade Nexo
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-zinc-400 leading-relaxed text-[15px] font-medium">
              Identificamos <span className="text-zinc-100 font-bold underline decoration-indigo-500/40 underline-offset-4">{waitingDecisionLeads} {waitingDecisionLeads === 1 ? 'cliente' : 'clientes'}</span> estagnados na etapa de decisão.
            </p>

            {waitingDecisionLeads > 0 ? (
              <p className="text-zinc-500 leading-loose text-sm">
                Com base na sua taxa histórica, a conversão de apenas {projectedExtraLeads} deles injetaria
                <span className="text-emerald-400 font-bold mx-1.5">R$ {projectedExtraRevenue.toLocaleString('pt-BR')}</span>
                imediatamente em seu caixa. Em valor de vida útil (LTV), o impacto estratégico é de
                <span className="text-indigo-400 font-bold ml-1.5">R$ {projectedExtraLTV.toLocaleString('pt-BR')}</span>.
              </p>
            ) : (
              <p className="text-zinc-500 text-sm italic">
                Sua fila de decisão está vazia. Mova leads qualificados para esta etapa para gerar novas projeções de faturamento.
              </p>
            )}
          </div>

          <div className="mt-10 flex gap-4">
            <button
              onClick={() => onAction?.('focus-decision')}
              className="px-8 py-3 bg-zinc-100 text-zinc-950 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:bg-white transition-all shadow-xl active:scale-95"
            >
              Focar em Decisão
            </button>
            <button
              onClick={() => onAction?.('view-decision-kanban')}
              className="px-8 py-3 bg-zinc-900 text-zinc-400 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800 active:scale-95"
            >
              Ver Leads
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedAnalytics;
