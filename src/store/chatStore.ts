import { create } from 'zustand';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: number;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  currentSessionId: string | null;
  sessions: Session[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsTyping: (isTyping: boolean) => void;
  updateLastMessage: (content: string) => void;
  clearChat: () => void;
  setCurrentSessionId: (id: string | null) => void;
  setSessions: (sessions: Session[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  currentSessionId: null,
  sessions: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsTyping: (isTyping) => set({ isTyping }),
  updateLastMessage: (content) => set((state) => {
    const lastIndex = state.messages.length - 1;
    if (lastIndex < 0) return state;
    
    const newMessages = [...state.messages];
    const last = newMessages[lastIndex];
    newMessages[lastIndex] = { ...last, content: last.content + content };
    return { messages: newMessages };
  }),
  clearChat: () => set({ messages: [], currentSessionId: null }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setSessions: (sessions) => set({ sessions }),
}));
