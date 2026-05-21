import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Mail,
  Plus,
  Clock as ClockIcon,
  Trash2
} from 'lucide-react';

const DateTimeDisplay = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-full shadow-lg">
      <ClockIcon className="w-4 h-4 text-indigo-400" />
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-white tabular-nums">{formatTime(time)}</span>
        <span className="text-neutral-500">•</span>
        <span className="text-neutral-400">{formatDate(time)}</span>
      </div>
    </div>
  );
};
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useChatStore, Session } from '../store/chatStore';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const SidebarItem = ({ to, icon: Icon, label, onClick }: SidebarItemProps) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
      isActive 
        ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]" 
        : "text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent"
    )}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </NavLink>
);

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { sessions, setSessions, currentSessionId, setCurrentSessionId, clearChat } = useChatStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to sessions
    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      setSessions(loadedSessions);
    });

    return () => unsubscribe();
  }, [user, setSessions]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      navigate('/');
      addToast('Signed out successfully', 'info');
    } catch (err) {
      addToast('Failed to sign out', 'error');
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionId));
      if (currentSessionId === sessionId) {
        clearChat();
      }
      addToast('Chat deleted', 'info');
    } catch (err) {
      addToast('Failed to delete chat', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-black flex overflow-hidden">
      {/* Sidebar Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-neutral-900 rounded-lg text-white"
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[55] w-72 bg-[#0a0a0a] border-r border-neutral-900 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-8">
            <Logo />
          </div>

          <button 
            onClick={() => {
              clearChat();
              navigate('/chat');
              setIsOpen(false);
              addToast('Initiating new session', 'info');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-8 rounded-xl text-sm font-semibold bg-white text-black hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>New Chat</span>
          </button>

          <nav className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
            <div>
              <div className="px-4 mb-3">
                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Main</span>
              </div>
              <div className="space-y-1">
                <SidebarItem to="/chat" icon={MessageSquare} label="AI Chat" onClick={() => setIsOpen(false)} />
                <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Analytics" onClick={() => setIsOpen(false)} />
                <SidebarItem to="/settings" icon={Settings} label="Preferences" onClick={() => setIsOpen(false)} />
              </div>
            </div>
            
            <div>
              <div className="px-4 mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">History</span>
                <ClockIcon className="w-3 h-3 text-neutral-600" />
              </div>
              <div className="space-y-1">
                {sessions.length === 0 ? (
                   <div className="px-4 py-6 rounded-xl border border-dashed border-neutral-900 text-[10px] text-neutral-700 text-center uppercase tracking-wider font-bold">
                     No chats yet
                   </div>
                ) : (
                  sessions.map((session) => (
                    <div 
                      key={session.id}
                      onClick={() => {
                        clearChat();
                        setCurrentSessionId(session.id);
                        navigate('/chat');
                        setIsOpen(false);
                      }}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 text-xs font-medium border cursor-pointer transition-all rounded-xl",
                        currentSessionId === session.id 
                          ? "bg-neutral-900 border-neutral-800 text-white" 
                          : "border-transparent text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300"
                      )}
                    >
                      <MessageSquare className="w-4 h-4 opacity-50 shrink-0" />
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="truncate block">{session.title || 'New Chat'}</span>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-neutral-800/50 space-y-4">
          <button 
            onClick={() => addToast('Support: manikantasaivootla@gmail.com', 'info')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors border border-transparent hover:border-neutral-800"
          >
            <Mail className="w-5 h-5" />
            <span>Support</span>
          </button>
          
          {user && (
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.displayName || 'Developer'}</p>
                <p className="text-xs text-neutral-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black flex flex-col">
        {/* Top Header with Clock */}
        <header className="sticky top-0 z-40 flex justify-center p-4">
          <DateTimeDisplay />
        </header>

        <div className="flex-1 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
