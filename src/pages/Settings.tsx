import React from 'react';
import { motion } from 'motion/react';
import { User, Shield, Bell, Moon, Sun, Monitor, CreditCard, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

const SettingSection = ({ title, description, children, icon: Icon }: any) => (
  <div className="glass-card overflow-hidden mb-6">
    <div className="p-6 border-b border-neutral-800/50 flex items-center gap-4">
      <div className="p-2 rounded-xl bg-neutral-800 text-indigo-400">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h2>
        <p className="text-xs text-neutral-500 mt-1">{description}</p>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export default function Settings() {
  const { user } = useAuthStore();

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <div className="absolute inset-0 bg-blueprint opacity-10 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-neutral-500 mt-1">Manage your account, security, and interface preferences</p>
        </div>

      <SettingSection 
        title="Profile Information" 
        description="Public information and contact details"
        icon={User}
      >
        <div className="flex flex-col sm:row items-center gap-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center overflow-hidden">
               {user?.photoURL ? (
                <img src={user.photoURL} alt="" />
               ) : (
                <User className="w-10 h-10 text-neutral-500" />
               )}
            </div>
            <button className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full text-xs font-bold text-white">
              Change
            </button>
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Display Name</label>
                <input 
                  type="text" 
                  defaultValue={user?.displayName || ''}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Email Address</label>
                <input 
                  type="email" 
                  readOnly
                  value={user?.email || ''}
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-400 outline-none cursor-not-allowed"
                />
              </div>
            </div>
            <button className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-all">
              Save Changes
            </button>
          </div>
        </div>
      </SettingSection>

      <SettingSection 
        title="Interface Theme" 
        description="Customize the dashboard appearance"
        icon={Monitor}
      >
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'dark', icon: Moon, label: 'Dark' },
            { id: 'light', icon: Sun, label: 'Light' },
            { id: 'system', icon: Monitor, label: 'System' }
          ].map((theme) => (
            <button 
              key={theme.id}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                theme.id === 'dark' ? "bg-neutral-800 border-indigo-500/50" : "bg-black border-neutral-800 hover:border-neutral-700"
              )}
            >
              <theme.icon className={cn("w-6 h-6", theme.id === 'dark' ? "text-indigo-400" : "text-neutral-500")} />
              <span className={cn("text-sm font-medium", theme.id === 'dark' ? "text-white" : "text-neutral-500")}>{theme.label}</span>
            </button>
          ))}
        </div>
      </SettingSection>

      <SettingSection 
        title="Security & Access" 
        description="API keys and instance security"
        icon={Shield}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-black border border-neutral-800 rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-white">Gemini API Connection</p>
              <p className="text-xs text-neutral-500 mt-0.5">Managed via AI Studio Secrets Panel</p>
            </div>
            <a 
              href="#" 
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Configure <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-black border border-neutral-800 rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
              <p className="text-xs text-neutral-500 mt-0.5">Add an extra layer of security</p>
            </div>
            <button className="px-4 py-1.5 bg-neutral-800 text-white text-xs font-bold rounded-lg border border-neutral-700 hover:bg-neutral-700 transition-all">
              Enable
            </button>
          </div>
        </div>
      </SettingSection>

      <SettingSection 
        title="Billing & Subscription" 
        description="Nexus Pro usage and billing history"
        icon={CreditCard}
      >
        <div className="p-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl">
          <h4 className="text-lg font-bold text-white mb-1">Nexus Pro Plan</h4>
          <p className="text-sm text-neutral-400 mb-6">Unlimited Pro context queries and high-priority traffic.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              ACTIVE • RENEWS MAY 24
            </span>
            <button className="text-sm font-bold text-white hover:underline">Manage Plan</button>
          </div>
        </div>
      </SettingSection>

      <div className="pt-10 border-t border-neutral-800 text-center">
        <p className="text-xs text-neutral-600 uppercase tracking-widest">
          Mani AI System v2.4.1 Production Core
        </p>
      </div>
      </div>
    </div>
  );
}
