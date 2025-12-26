
import React from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, Calendar, ArrowUpRight, TrendingUp, Users, Target } from 'lucide-react';
import { METRICS_DATA } from '../constants';

const PIE_DATA = [
  { name: 'Orgânico', value: 400 },
  { name: 'Ads Google', value: 300 },
  { name: 'Ads Meta', value: 300 },
  { name: 'Referral', value: 200 },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

const DetailedAnalytics: React.FC = () => {
  return (
    <div className="p-8 h-full overflow-y-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios e Performance</h1>
          <p className="text-zinc-500 text-sm">Análise detalhada do seu ROI e performance de vendas.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium hover:bg-zinc-800 transition-colors">
            <Calendar size={14} />
            Jan 2024 - Dez 2024
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/10">
            <Download size={14} />
            Gerar PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl">
           <div className="flex items-center gap-2 text-zinc-400 mb-2">
             <Target size={14} className="text-indigo-400" />
             <span className="text-[11px] font-semibold uppercase tracking-wider">Taxa de Conversão</span>
           </div>
           <div className="flex items-baseline gap-2">
             <span className="text-3xl font-bold">24.8%</span>
             <span className="text-emerald-400 text-xs font-medium flex items-center">
               <ArrowUpRight size={12} /> +2.1%
             </span>
           </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl">
           <div className="flex items-center gap-2 text-zinc-400 mb-2">
             <Users size={14} className="text-emerald-400" />
             <span className="text-[11px] font-semibold uppercase tracking-wider">Custo por Lead (CPL)</span>
           </div>
           <div className="flex items-baseline gap-2">
             <span className="text-3xl font-bold">R$ 4.20</span>
             <span className="text-rose-400 text-xs font-medium flex items-center">
               <ArrowUpRight size={12} /> +R$ 0.15
             </span>
           </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl">
           <div className="flex items-center gap-2 text-zinc-400 mb-2">
             <TrendingUp size={14} className="text-amber-400" />
             <span className="text-[11px] font-semibold uppercase tracking-wider">LTV (Life Time Value)</span>
           </div>
           <div className="flex items-baseline gap-2">
             <span className="text-3xl font-bold">R$ 1.840</span>
             <span className="text-emerald-400 text-xs font-medium flex items-center">
               <ArrowUpRight size={12} /> +8%
             </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/20 border border-zinc-800/50 p-8 rounded-3xl h-[400px]">
          <h3 className="text-sm font-semibold mb-6">Crescimento de Receita (Mensal)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={METRICS_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#52525b" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#52525b" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
                <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-800/50 p-8 rounded-3xl h-[400px]">
          <h3 className="text-sm font-semibold mb-6">Distribuição de Fontes</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedAnalytics;
