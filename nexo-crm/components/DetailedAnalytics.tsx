import React from 'react';
import { Lead } from '../types';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList
} from 'recharts';
import { Download, Calendar, ArrowUpRight, TrendingUp, Users, Target, DollarSign, Briefcase, Tag, X, Sparkles, Send } from 'lucide-react';

interface DetailedAnalyticsProps {
  leads: Lead[];
  onAction?: (action: 'view-decision-kanban' | 'focus-decision-leads') => void;
}

const STATUS_COLORS: Record<string, string> = {
  'CONCLUIDO': '#10b981',
  'VENDIDO': '#10b981',
  'AGUARDANDO DECISAO': '#6366f1',
  'CALL AGENDADA': '#f59e0b',
  'SEM INTERESSE': '#ef4444',
  'ENCERRADO': '#71717a',
  'NOVO': '#ec4899',
  'QUALIFICADO': '#8b5cf6',
  'EM ATENDIMENTO': '#0ea5e9',
  'FOLLOW UP 1': '#f97316',
  'FOLLOW UP 2': '#22c55e',
  'FOLLOW UP 3': '#d946ef'
};

const BORDER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#0ea5e9', '#f97316', '#22c55e', '#d946ef'];

const VerticalLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;

  // Baseline fixo para todas as etiquetas, começando do fundo de cada barra
  const labelY = y + height - 20;

  // Cor sempre escura no tema dark para contraste com as barras coloridas
  const labelColor = '#0c0c0e';

  return (
    <text
      x={x + width / 2}
      y={labelY}
      fill={labelColor}
      textAnchor="start"
      fontSize={9}
      fontWeight="900"
      transform={`rotate(-90, ${x + width / 2}, ${labelY})`}
      style={{ textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none' }}
    >
      {value.length > 15 ? `${value.substring(0, 12)}...` : value}
    </text>
  );
};

const DetailedAnalytics: React.FC<DetailedAnalyticsProps> = ({ leads, onAction }) => {
  const [ticketRaw, setTicketRaw] = React.useState<string>(() => {
    return localStorage.getItem('crm_ticket_medio') || '1000';
  });
  const [ltvRaw, setLtvRaw] = React.useState<string>(() => {
    return localStorage.getItem('crm_ltv') || '5000';
  });

  const [showStrategyModal, setShowStrategyModal] = React.useState(false);

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
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';

  // Projection logic
  const conversionSimulatedPercent = 30; // 30% conversion for the "opportunity" text
  const projectedExtraLeads = Math.max(
    waitingDecisionLeads > 0 ? 1 : 0,
    Math.round(waitingDecisionLeads * (conversionSimulatedPercent / 100))
  );

  const projectedExtraRevenue = projectedExtraLeads * ticketMedio;
  const projectedExtraLTV = projectedExtraLeads * ltv;

  // Distribution by status for Bar Chart
  const barChartData = React.useMemo(() => {
    const leadsPerStatus = leads.reduce((acc: any, lead) => {
      const status = lead.status || 'Sem Status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(leadsPerStatus).map(([name, value], index) => {
      const color = STATUS_COLORS[name] || BORDER_COLORS[index % BORDER_COLORS.length] || '#3f3f46';
      return {
        name,
        value,
        color
      };
    }).sort((a, b) => (b.value as number) - (a.value as number));
  }, [leads]);

  return (
    <div className="p-8 h-full overflow-y-auto space-y-8 custom-scrollbar">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios e Projeções</h1>
          <p className="text-zinc-500 text-sm">Visão financeira baseada em dados reais e Ticket Médio.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-4 px-5 py-3 bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl shadow-xl dark:shadow-[5px_5px_10px_#050506,-5px_-5px_10px_#131316]">
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
          <div className="flex items-center gap-4 px-5 py-3 bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl shadow-xl dark:shadow-[5px_5px_10px_#050506,-5px_-5px_10px_#131316]">
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
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
              <DollarSign size={16} className="text-indigo-600 dark:text-indigo-400" />
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
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
              <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Projeção (Aguardando)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">R$ {faturamentoPotencialDecisao.toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">{waitingDecisionLeads} leads em decisão</p>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-6 rounded-[2rem] shadow-[10px_10px_20px_#050506,-10px_-10px_20px_#131316]">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
              <Target size={16} className="text-indigo-600 dark:text-indigo-400" />
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
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
              <Target size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Agendamentos</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{scheduledLeads}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Leads com horário marcado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] min-h-[550px] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
          <h3 className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">
            Funil por Etapa
          </h3>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px' }}
                  formatter={(value: any) => [`${value} leads`, 'Quantidade']}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} isAnimationActive={true} barSize={60} minPointSize={10}>
                  {barChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="name" content={<VerticalLabel />} />
                  <LabelList dataKey="value" position="top" fill="#a1a1aa" fontSize={11} offset={12} fontStyle="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[3rem] min-h-[550px] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] flex flex-col justify-center items-center text-center">
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
              Análise de Oportunidade Nero
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
              onClick={() => setShowStrategyModal(true)}
              className="px-8 py-3 bg-zinc-100 dark:bg-zinc-100 text-zinc-950 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:bg-white transition-all shadow-xl active:scale-95 flex items-center gap-2"
            >
              <Sparkles size={14} />
              Focar em Decisão
            </button>
            <button
              onClick={() => onAction?.('view-decision-kanban')}
              className="px-8 py-3 bg-[#0c0c0e] dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all border border-zinc-200 dark:border-zinc-800 active:scale-95"
            >
              Ver no Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Strategy Modal */}
      {showStrategyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/50 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                  <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Estratégia de Ativação</h3>
              </div>
              <button
                onClick={() => setShowStrategyModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                Você tem <span className="font-bold text-zinc-900 dark:text-white">{waitingDecisionLeads} leads</span> aguardando decisão. Aqui estão algumas dicas para reativá-los:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg mt-0.5">
                    <Tag size={14} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Organize com Etiquetas</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">Marque os leads mais importantes para priorizá-los no atendimento.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg mt-0.5">
                    <Send size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Use os Disparos</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">Envie mensagens em massa para tentar reativar esses contatos parados.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg mt-0.5">
                    <Target size={14} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Priorize os Antigos</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">Leads há mais tempo parados podem precisar de atenção imediata.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowStrategyModal(false)}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-all"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowStrategyModal(false);
                  onAction?.('focus-decision-leads');
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                Ver Contatos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedAnalytics;
