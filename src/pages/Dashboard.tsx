import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar as BarChartComp } from 'react-chartjs-2';
import { Zap, Users, MessageSquare, Clock } from 'lucide-react';
import { motion } from 'motion/react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const StatCard = ({ icon: Icon, title, value, change, color }: any) => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-xl bg-neutral-800 text-indigo-400`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full uppercase">
        {change}
      </span>
    </div>
    <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest">{title}</h3>
    <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
  </div>
);

export default function Dashboard() {
  const lineData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        fill: true,
        label: 'Tokens Used',
        data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const barData = {
    labels: ['Python', 'JS', 'Rust', 'Go', 'SQL', 'TS'],
    datasets: [
      {
        label: 'Context Queries',
        data: [65, 59, 80, 81, 56, 95],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
        },
        ticks: { color: 'rgba(255, 255, 255, 0.2)', font: { size: 10 } }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: { color: 'rgba(255, 255, 255, 0.2)', font: { size: 10 } }
      },
    },
  };

  return (
    <div className="p-8 relative">
      <div className="absolute inset-0 bg-blueprint opacity-20 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col md:row items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Analytics</h1>
          <p className="text-neutral-500 mt-1">Real-time usage metrics and AI performance</p>
        </div>
        <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 p-1.5 rounded-2xl">
          <button className="px-4 py-1.5 bg-neutral-800 text-white text-sm font-medium rounded-xl">7 Days</button>
          <button className="px-4 py-1.5 text-neutral-500 text-sm font-medium hover:text-white transition-colors">30 Days</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Zap} title="Active Sessions" value="1,284" change="+12%" color="indigo" />
        <StatCard icon={MessageSquare} title="AI Queries" value="48.2k" change="+18%" color="purple" />
        <StatCard icon={Users} title="New Developers" value="342" change="+5%" color="blue" />
        <StatCard icon={Clock} title="Latency (avg)" value="1.2s" change="-8%" color="orange" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 h-[400px]"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6">Token Utilization</h3>
          <div className="h-[280px]">
            <Line data={lineData} options={options} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 h-[400px]"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6">Language Contexts</h3>
          <div className="h-[280px]">
            <BarChartComp data={barData} options={options} />
          </div>
        </motion.div>
      </div>

      <div className="mt-8 glass-card p-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-neutral-800 last:border-0">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Complex architectural request solved</p>
                <p className="text-xs text-neutral-500 mt-1">Ref: #ARCH-2930 • 2 minutes ago</p>
              </div>
              <div className="text-xs font-mono text-neutral-600 bg-neutral-950 px-3 py-1 rounded-full border border-neutral-800">
                PRO-MODEL
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
