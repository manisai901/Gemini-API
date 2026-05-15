import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Trash2, Copy, Check, Loader2, Download, Sparkles, Plus, X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { useChatStore, Message } from '../store/chatStore';
import { cn } from '../lib/utils';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';

const ChatMessage = React.memo(({ message }: { message: Message }) => {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToastStore();
  const isAI = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    addToast('Content copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-4 p-6 rounded-3xl w-full max-w-4xl mx-auto mb-4",
        isAI ? "bg-neutral-900/50 border border-neutral-800" : "bg-transparent"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
        isAI ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-400"
      )}>
        {isAI ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            {isAI ? 'Mani AI' : 'You'}
          </span>
          {isAI && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className="p-1.5 text-neutral-500 hover:text-white transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
        <div className="prose prose-invert prose-sm max-w-none prose-neutral">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeHighlight]}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, addMessage, setMessages, isTyping, setIsTyping, clearChat } = useChatStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamBufferRef = useRef('');
  const [attachments, setAttachments] = useState<{file: File, base64: string, mimeType: string}[]>([]);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = await Promise.all(files.map(async (file) => {
      return new Promise<{file: File, base64: string, mimeType: string}>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ file, base64, mimeType: file.type });
        };
        reader.readAsDataURL(file);
      });
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    clearChat();
    setAttachments([]);
    addToast('New chat started', 'info');
  };

  useEffect(() => {
    if (!user) return;

    const messagesCollection = collection(db, 'users', user.uid, 'sessions', 'default', 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          role: data.role,
          content: data.content,
          timestamp: data.timestamp?.toMillis() || Date.now()
        } as Message;
      });
      
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      }
    }, (error) => {
      console.error('Snapshot error:', error);
    });

    return () => unsubscribe();
  }, [user, setMessages]);

  useEffect(() => {
    // Only scroll if we are not at the bottom or if it's the first message/isTyping
    scrollRef.current?.scrollIntoView({ behavior: 'auto' }); 
  }, [messages.length, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping || !user) return;

    const userMessageContent = input;
    setInput('');
    setIsTyping(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      // 1. Add user message locally
      const userMessage: Message = {
        role: 'user',
        content: userMessageContent,
        timestamp: Date.now()
      };
      addMessage(userMessage);

      // 2. Call backend for AI response (Streaming)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: userMessageContent,
          history: messages,
          attachments: attachments.map(a => ({ base64: a.base64, mimeType: a.mimeType }))
        })
      });

      setAttachments([]);

      if (!response.ok) {
        let errorMessage = 'Failed to connect to AI service';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            errorMessage = errData.details || errData.error || errorMessage;
          } else {
            const textError = await response.text();
            errorMessage = textError || `Server returned error ${response.status}: ${response.statusText}`;
          }
        } catch (e) {
          errorMessage = `Server error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to initialize stream');

      const decoder = new TextDecoder();
      let aiContent = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                if (isFirstChunk) {
                  // Add the initial AI message object
                  const aiMessage: Message = {
                    role: 'assistant',
                    content: parsed.text,
                    timestamp: Date.now()
                  };
                  addMessage(aiMessage);
                  setIsTyping(false); // Stop typing indicator once we start getting content
                  isFirstChunk = false;
                } else {
                  // Update it incrementally
                  useChatStore.getState().updateLastMessage(parsed.text);
                }
                aiContent += parsed.text;
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }

      // 3. Persist to Firestore after completion
      try {
        const sessionRef = doc(db, 'users', user.uid, 'sessions', 'default');
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) {
          await setDoc(sessionRef, {
            userId: user.uid,
            title: 'Main Chat',
            lastMessage: aiContent,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        } else {
          await setDoc(sessionRef, {
            title: 'Main Chat',
            lastMessage: aiContent,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (error) {
        handleFirestoreError(error, 'write', `users/${user.uid}/sessions/default`);
      }

      const messagesCollection = collection(db, 'users', user.uid, 'sessions', 'default', 'messages');
      try {
        await addDoc(messagesCollection, {
          role: 'user',
          content: userMessageContent,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, 'write', `users/${user.uid}/sessions/default/messages`);
      }

      try {
        await addDoc(messagesCollection, {
          role: 'assistant',
          content: aiContent,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, 'write', `users/${user.uid}/sessions/default/messages`);
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      addToast(error.message || 'Failed to process message', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  // Helper for structured error logging as per integration instructions
  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operationType: operation,
      path: path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteChat = async () => {
    if (!user || messages.length === 0) return;
    
    // In a real app, you'd delete individual docs or the whole session.
    // For this simple default session flow, we'll just remove the messages locally
    // and ideally the user would delete the session.
    try {
      clearChat();
      addToast('Chat history cleared from session', 'info');
    } catch (error) {
      addToast('Failed to clear history', 'error');
    }
  };

  const handleExport = () => {
    const content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mani-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    addToast('Conversation exported successfully', 'success');
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-blueprint opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="p-4 border-b border-neutral-800/50 bg-neutral-950/50 backdrop-blur-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">Mani AI Engine</h2>
            <p className="text-[10px] text-neutral-500 font-mono">MODEL: Gemini 3.1 Pro • ACTIVE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExport}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-all"
            title="Export History"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={handleDeleteChat}
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition-all"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 animate-pulse">
              <Sparkles className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Powering Next-Gen Engineering</h3>
            <p className="text-neutral-500 max-w-sm">Ask me any technical question, architectural guidance, or request production-ready code blocks.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 w-full max-w-lg">
              {[
                "Write a secure Express auth middleware",
                "Design a scalable microservices architecture",
                "Explain React 19 concurrent features",
                "Optimal Firestore index strategy"
              ].map((suggestion, i) => (
                <button 
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl text-xs text-neutral-400 hover:bg-neutral-800 hover:text-white text-left transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((m, i) => <ChatMessage key={i} message={m} />)}
        
        {isTyping && (
          <div className="flex gap-4 p-6 rounded-3xl w-full max-w-4xl mx-auto">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="flex-1 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 bg-gradient-to-t from-black via-black to-transparent z-10">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] opacity-20 blur-xl group-focus-within:opacity-40 transition-opacity" />
          
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-[2rem] flex flex-col shadow-2xl focus-within:border-indigo-500/50 transition-colors overflow-hidden">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 px-4 pt-4 pb-2 border-b border-neutral-800 bg-neutral-900/50">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group/att">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={`data:${att.mimeType};base64,${att.base64}`} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-neutral-400 p-1 text-center bg-neutral-800">
                          <FileText className="w-4 h-4 mb-1 text-indigo-400" />
                          <span className="truncate w-full">{att.file.name}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/att:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2 flex items-end gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileSelect} 
                multiple 
                className="hidden" 
                accept="image/*,application/pdf,text/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-4 text-neutral-400 hover:text-white rounded-2xl hover:bg-neutral-800 transition-all mb-1"
              >
                <Plus className="w-5 h-5" />
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Query Mani AI Engine..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-white p-4 resize-none min-h-[56px] max-h-60"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={(!input.trim() && attachments.length === 0) || isTyping}
                className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-600/20 mb-1"
              >
                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-neutral-600 mt-4 uppercase tracking-[0.2em]">
          End-to-End SSL Encrypted • Multi-Modal Gemini 1.5 Flash
        </p>
      </div>
    </div>
  );
}
