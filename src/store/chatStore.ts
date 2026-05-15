import { create } from 'zustand';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsTyping: (isTyping: boolean) => void;
  updateLastMessage: (content: string) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
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
  clearChat: () => set({ messages: [] }),
}));
