import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Trash2, Copy, Check, Loader2, Download, Plus, X, FileText, LayoutDashboard, Sparkles, Square } from 'lucide-react';
import { Logo } from '../components/Logo';
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
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "group flex flex-col gap-3 w-full max-w-3xl mx-auto mb-8 px-4",
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
          isAI 
            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
            : "bg-neutral-800 border-neutral-700 text-neutral-400"
        )}>
          {isAI ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {isAI ? 'Mani AI' : 'You'}
        </span>
        {isAI && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            <button 
              onClick={handleCopy}
              className="p-1.5 text-neutral-500 hover:text-white transition-colors bg-neutral-900 border border-neutral-800 rounded-lg"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      <div className={cn(
        "flex-1 min-w-0 prose prose-invert prose-sm max-w-none prose-neutral leading-relaxed",
        isAI ? "text-neutral-200" : "text-neutral-300"
      )}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeHighlight]}
          components={{
            code({ node, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
                <div className="relative group/code my-4">
                  <div className="absolute right-3 top-3 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                        addToast('Code copied', 'success');
                      }}
                      className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <pre className={cn("rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 overflow-auto", className)}>
                    <code {...props}>{children}</code>
                  </pre>
                </div>
              ) : (
                <code className={cn("bg-neutral-800 px-1.5 py-0.5 rounded text-indigo-400", className)} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, addMessage, setMessages, isTyping, setIsTyping, clearChat, currentSessionId, setCurrentSessionId } = useChatStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamBufferRef = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);
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
    if (!user || !currentSessionId) return;

    const messagesCollection = collection(db, 'users', user.uid, 'sessions', currentSessionId, 'messages');
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
      
      setMessages(loadedMessages);
    }, (error) => {
      console.error('Snapshot error:', error);
    });

    return () => unsubscribe();
  }, [user, currentSessionId, setMessages]);

  useEffect(() => {
    // Only scroll if we are not at the bottom or if it's the first message/isTyping
    scrollRef.current?.scrollIntoView({ behavior: 'auto' }); 
  }, [messages.length, isTyping]);

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping || !user) return;

    const userMessageContent = input;
    setInput('');
    setIsTyping(true);

    let activeSessionId = currentSessionId;
    let isNewSession = false;
    let aiContent = '';
    
    if (!activeSessionId) {
      activeSessionId = `sess_${Date.now()}`;
      setCurrentSessionId(activeSessionId);
      isNewSession = true;
    }

    try {
      abortControllerRef.current = new AbortController();
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
        signal: abortControllerRef.current.signal,
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Chat generation stopped');
      } else {
        console.error('Chat error:', error);
        addToast(error.message || 'Failed to process message', 'error');
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
      
      // 3. Persist to Firestore after completion/abort
      try {
        const sessionRef = doc(db, 'users', user.uid, 'sessions', activeSessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        const title = isNewSession ? userMessageContent.substring(0, 30) + (userMessageContent.length > 30 ? '...' : '') : undefined;
        
        // Final message payload
        const finalAiContent = aiContent || '*(message interrupted/failed)*';
        
        if (!sessionSnap.exists()) {
          await setDoc(sessionRef, {
            userId: user.uid,
            title: title || 'New Chat',
            lastMessage: finalAiContent,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        } else {
          await setDoc(sessionRef, {
            lastMessage: finalAiContent,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        const messagesCollection = collection(db, 'users', user.uid, 'sessions', activeSessionId, 'messages');
        
        // Persist User Message
        await addDoc(messagesCollection, {
          role: 'user',
          content: userMessageContent,
          timestamp: serverTimestamp()
        });

        // Persist Assistant Message
        if (aiContent) {
          await addDoc(messagesCollection, {
            role: 'assistant',
            content: aiContent,
            timestamp: serverTimestamp()
          });
        }
        
      } catch (error) {
        console.error('Failed to persist session to Firestore:', error);
      }
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
    if (!user || !currentSessionId) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'sessions', currentSessionId));
      clearChat();
      addToast('Chat session deleted', 'info');
    } catch (error) {
      addToast('Failed to delete session', 'error');
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
    <div className="flex flex-col h-screen bg-[#050505] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b,transparent)] opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-blueprint opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 border-b border-neutral-900 bg-black/40 backdrop-blur-2xl z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="h-4 w-[1px] bg-neutral-800 mx-2 hidden sm:block"></div>
          <div className="flex items-center gap-2 hidden sm:flex">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em]">v1.0 Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleExport}
            className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-900/50 rounded-xl transition-all border border-transparent hover:border-neutral-800"
            title="Export History"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={handleDeleteChat}
            className="p-2.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-10 pb-32 space-y-4 relative z-10 scroll-smooth">
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center text-center px-6"
          >
            <div className="relative mb-10">
              <div className="absolute -inset-10 bg-indigo-500/20 blur-[100px] rounded-full opacity-50" />
              <Logo size="lg" iconOnly className="hover:scale-105 transition-transform cursor-pointer" />
            </div>
            
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">
              What can I help you <br className="hidden sm:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-[length:200%_auto] animate-gradient">build today?</span>
            </h3>
            <p className="text-neutral-500 max-w-md text-xs leading-relaxed mb-10 font-medium">
              Professional technical engineering framework for high-performance code generation and architectural design.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
              {[
                { text: "Write a high-performance Express server", icon: Bot },
                { text: "Explain React Server Components benefits", icon: Sparkles },
                { text: "Optimize TypeScript generic patterns", icon: FileText },
                { text: "Design a scalable Firestore schema", icon: LayoutDashboard }
              ].map((item, i) => (
                <button 
                  key={i}
                  onClick={() => setInput(item.text)}
                  className="p-4 bg-neutral-900/30 border border-neutral-800/80 rounded-2xl text-xs text-neutral-400 hover:bg-indigo-600/10 hover:border-indigo-500/30 hover:text-white text-left transition-all group flex items-start gap-3 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700 group-hover:border-indigo-500/30 group-hover:bg-indigo-600/20 transition-colors">
                    <item.icon className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400" />
                  </div>
                  <span className="pt-1.5 font-medium">{item.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        
        <div className="space-y-6">
          {messages.map((m, i) => <ChatMessage key={i} message={m} />)}
        </div>
        
        {isTyping && (
          <div className="w-full max-w-3xl mx-auto px-4 mb-20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center border border-indigo-500 shadow-lg shadow-indigo-500/20">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Mani AI Thinking...</span>
            </div>
            <div className="flex gap-1.5 ml-11">
              <span className="w-2 h-2 bg-indigo-500/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-indigo-500/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} className="h-20" />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:pb-12 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-30">
        <div className="max-w-3xl mx-auto relative group">
          
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-14 left-0 right-0 flex justify-center"
              >
                <button
                  onClick={handleStopGenerating}
                  className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shadow-lg"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Generating
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] opacity-20 blur-xl group-focus-within:opacity-40 transition-opacity" />
          
          <div className="relative bg-neutral-900/90 border border-neutral-800/80 backdrop-blur-2xl rounded-[2.5rem] flex flex-col shadow-2xl focus-within:border-indigo-500/50 transition-all overflow-hidden ring-1 ring-white/5">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 px-6 pt-5 pb-3 border-b border-neutral-800/50 bg-black/20">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group/att">
                    <div className="w-16 h-16 rounded-[1rem] overflow-hidden border border-neutral-700 bg-neutral-800 shadow-md ring-2 ring-transparent group-hover/att:ring-indigo-500/50 transition-all">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={`data:${att.mimeType};base64,${att.base64}`} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-neutral-400 p-2 text-center bg-neutral-800">
                          <FileText className="w-6 h-6 mb-1 text-indigo-400" />
                          <span className="truncate w-full font-medium">{att.file.name}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover/att:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95"
                    >
                      <X className="w-3 h-3" />
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
                className="p-4 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-all mb-1 shrink-0"
              >
                <Plus className="w-6 h-6" />
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message Mani AI..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-white p-4 resize-none min-h-[64px] max-h-60 text-base placeholder:text-neutral-500"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={(!input.trim() && attachments.length === 0) || isTyping}
                className="p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-600/20 mb-1 shrink-0"
              >
                {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-6">
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] font-medium">
            Mani AI Platform 2026 • Encrypted
          </p>
          <span className="w-1 h-1 bg-neutral-800 rounded-full"></span>
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] font-medium">
            Gemini 1.5 Professional
          </p>
        </div>
      </div>
    </div>
  );
}
