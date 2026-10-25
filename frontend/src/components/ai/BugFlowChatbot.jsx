import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import { 
  Bot, X, Send, Sparkles, MessageSquare, ExternalLink, 
  Trash2, ChevronDown, BookOpen, BarChart3, PlusCircle, UserCheck
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'Show open critical defects',
  'What is developer workload right now?',
  'How do role permissions work in BugFlow?',
  'How to fix JWT authentication errors?',
  'Open analytics dashboard'
];

export const BugFlowChatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am **BugFlow AI Assistant**. I can help you query live defects, check developer workloads, navigate pages, and search historical defect resolutions. How can I assist you today?',
      nav_action: null,
      rag_references: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend = null) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Build conversation history format for API
      const history = messages
        .filter((m) => m.sender === 'user' || m.sender === 'bot')
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

      const res = await aiService.sendChatMessage(query, history);

      const botMsg = {
        sender: 'bot',
        text: res.reply || 'I processed your request.',
        nav_action: res.nav_action || null,
        rag_references: res.rag_references || []
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Sorry, I encountered an error retrieving data. Please make sure the backend is reachable.',
          nav_action: null,
          rag_references: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavClick = (navAction) => {
    if (!navAction) return;
    if (navAction.route) {
      navigate(navAction.route);
    } else if (navAction.action === 'open_create_issue_modal') {
      navigate('/issues');
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: 'Chat history cleared. How can I help you next?',
        nav_action: null,
        rag_references: []
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-full shadow-2xl shadow-indigo-600/50 flex items-center gap-2 border border-indigo-400/30 transition-all hover:scale-105 group"
          title="Open BugFlow AI Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-bold pr-1 hidden sm:inline">BugFlow AI</span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900/80 via-purple-900/70 to-slate-900 border-b border-indigo-800/40 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/40">
                <Bot className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                  BugFlow AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </h3>
                <p className="text-[10px] text-indigo-300 font-medium">System-Aware RAG & Natural Language Navigator</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-all"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-all"
                title="Close Window"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/60 text-xs">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                  {/* Grounded RAG References if available */}
                  {msg.rag_references && msg.rag_references.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                        Grounded Defect Context:
                      </span>
                      {msg.rag_references.map((ref, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => navigate(`/issues/${ref.defect_id}`)}
                          className="text-[11px] text-slate-300 hover:text-indigo-300 flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 w-full text-left"
                        >
                          <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="font-bold text-indigo-400">{ref.defect_key}:</span>
                          <span className="truncate">{ref.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Action / Route Button */}
                  {msg.nav_action && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleNavClick(msg.nav_action)}
                        className="w-full bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 text-xs transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {msg.nav_action.label || 'Open Requested View'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 w-max">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>BugFlow AI is thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 overflow-x-auto flex gap-1.5 scrollbar-none">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[11px] whitespace-nowrap bg-slate-800/80 hover:bg-indigo-950/80 hover:border-indigo-700/60 border border-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full transition-all shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about defects, workloads, or navigation..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default BugFlowChatbot;
