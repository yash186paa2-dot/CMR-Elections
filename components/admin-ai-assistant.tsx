'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, X, Loader2, Sparkles, Search, Vote, BarChart2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  { label: 'Show turnout', icon: BarChart2 },
  { label: 'Open election', icon: Sparkles },
  { label: 'Close election', icon: X },
  { label: 'Top candidates', icon: Vote },
  { label: 'Search student', icon: Search },
  { label: 'Publish results', icon: Eye },
];

export function AdminAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'System Initialized. I am your Gemini-powered Election Intelligence Agent. I can query live voting data and execute administrative commands. How may I assist you?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const userMessage = overrideInput || input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages.slice(-10)
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Intelligence Link Interrupted. Please check system environment variables.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all hover:scale-110 hover:bg-blue-600 active:scale-95 border border-white/10 group"
      >
        <Bot className="h-8 w-8 group-hover:animate-pulse" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[700px] w-[500px] flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-8 duration-500 ease-out">
          {/* Header */}
          <div className="flex items-center justify-between bg-slate-900 px-8 py-7 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 text-white">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.15em] leading-tight">Election Intelligence</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secure Neural Channel</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-xl p-2.5 hover:bg-white/10 transition-all active:scale-90">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-blue-600 border border-slate-200'}`}>
                    {msg.role === 'user' ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div className={`rounded-[1.5rem] px-5 py-3.5 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/10' 
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-3' : ''}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-4 bg-white rounded-[1.5rem] px-5 py-4 border border-slate-200 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Processing Intelligence...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-100 bg-white p-6">
            <div className="mb-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSubmit(undefined, s.label)}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  <s.icon className="h-3 w-3" />
                  {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Query system or issue command..."
                className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 pl-6 pr-16 py-5 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-2xl bg-slate-900 p-3.5 text-white shadow-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-90"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            <div className="mt-5 flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-slate-100" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                Authorized Administrative Interface
              </p>
              <div className="h-px w-8 bg-slate-100" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
