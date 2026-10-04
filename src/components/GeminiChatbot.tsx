import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ChevronDown,
  Minimize2,
  Maximize2,
  RefreshCw,
  Zap,
  TrendingUp,
  Moon
} from 'lucide-react';
import { ChatMessage, sendChatMessage } from '../services/geminiChat';

interface GeminiChatbotProps {
  initialOpen?: boolean;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Hello! I am your **Gemini AI Quantitative Analyst & Financial Astrology Researcher**.\n\nI can analyze live price action, market structure (BOS, CHoCH, Order Blocks), calculate mathematical risk sizing, and evaluate statistical correlations with planetary transits and lunar cycles.\n\nHow can I assist your market analysis today?`,
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const replyText = await sendChatMessage(messages, text.trim());
      const botMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        content: 'Conversation history reset. Ask me anything about market setups, indicators, or astrological cycles.',
        timestamp: 'Just now'
      }
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-bold font-mono text-xs rounded-full shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 border border-amber-300/40"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span>Gemini Quant Chat</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-96 bg-[#0B0E17] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans transition-all duration-200 ${
            isMinimized ? 'h-14' : 'h-[520px]'
          }`}
        >
          {/* Header */}
          <div className="p-3 bg-[#0F1420] border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/40 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>Gemini Quant AI</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">gemini-3.5-flash · Multi-Turn</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Reset conversation"
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          {!isMinimized && (
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs text-slate-300">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-6 h-6 rounded-full bg-purple-950 border border-purple-500/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] p-3 rounded-xl leading-relaxed whitespace-pre-line ${
                          isUser
                            ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none shadow-sm'
                            : 'bg-[#07090E] border border-slate-800 text-slate-200 rounded-bl-none shadow-inner'
                        }`}
                      >
                        {m.content}
                        <div
                          className={`text-[9px] mt-1 text-right ${
                            isUser ? 'text-slate-900/60 font-mono' : 'text-slate-500 font-mono'
                          }`}
                        >
                          {m.timestamp}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-mono py-1">
                    <div className="w-6 h-6 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                    </div>
                    <span>Analyzing order flow & astro ephemeris...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Strip */}
              <div className="px-3 py-1.5 bg-[#07090E] border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
                <span className="text-slate-500 shrink-0">TRY:</span>
                <button
                  onClick={() => handleSend('Analyze the Gold (XAU/USD) setup')}
                  className="px-2 py-0.5 rounded bg-slate-800/90 text-amber-300 hover:bg-slate-700 shrink-0 border border-slate-700"
                >
                  🌕 Gold Setup
                </button>
                <button
                  onClick={() => handleSend('How do Lunar Phases correlate with Bitcoin?')}
                  className="px-2 py-0.5 rounded bg-slate-800/90 text-purple-300 hover:bg-slate-700 shrink-0 border border-slate-700"
                >
                  🌑 Lunar Correlation
                </button>
                <button
                  onClick={() => handleSend('Explain the 1% risk position sizing formula')}
                  className="px-2 py-0.5 rounded bg-slate-800/90 text-cyan-300 hover:bg-slate-700 shrink-0 border border-slate-700"
                >
                  📐 1% Position Sizing
                </button>
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-[#0F1420] border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Gemini about setups or astro cycles..."
                  className="flex-1 bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
