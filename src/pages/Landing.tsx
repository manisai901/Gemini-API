import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Cpu, Zap, Layout, Shield, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '../components/Logo';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (user && !loading) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);
  return (
    <div className="min-h-screen bg-black text-neutral-100 selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-blueprint opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b,transparent)] opacity-40 pointer-events-none" />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-neutral-900 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-8">
            <Link to="/login" className="text-sm font-semibold text-neutral-400 hover:text-white transition-colors">Sign In</Link>
            <Link to="/login" className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
              Production-Ready AI <br /> Engineering Partner
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Mani AI delivers intelligent coding answers, architectural guidance, and technical suggestions powered by Google Gemini.
            </p>
            <div className="flex flex-col sm:row items-center justify-center gap-4">
              <Link to="/login" className="group flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                Start Building Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Shield className="w-4 h-4" />
                Enterprise-grade security on Google Cloud
              </div>
            </div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-32">
            {[
              { icon: Cpu, title: "Advanced Logic", desc: "Complex reasoning and STEM problem-solving with Gemini Pro." },
              { icon: Zap, title: "Real-time Insights", desc: "Streaming AI responses for immediate feedback and iteration." },
              { icon: Layout, title: "Modern UI", desc: "Professional, responsive interface built for technical workflows." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-neutral-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 py-12 px-4 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-6 opacity-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold tracking-tight">Mani AI</span>
          </div>
          <div className="text-sm font-mono">
            &copy; {new Date().getFullYear()} Mani AI Framework. Production Ready.
          </div>
        </div>
      </footer>
    </div>
  );
}
