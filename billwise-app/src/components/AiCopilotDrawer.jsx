import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { copilotApi } from '../api';

const WELCOME_MESSAGE = {
  sender: 'ai',
  text: "Hello! I am your **BillWise AI Financial & GST Assistant**. How can I help you with tax claims, Input Tax Credit (ITC), invoice verification, or statutory GST deadlines today?"
};

function FormattedMessage({ text }) {
  if (!text) return null;

  // Render markdown-style bold and paragraphs cleanly
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Split by ** for bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);

        return (
          <p key={lineIdx} className={line.startsWith('•') || line.startsWith('-') || line.startsWith('* ') ? 'pl-2' : ''}>
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={partIdx} className="font-bold text-slate-900">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={partIdx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function AiCopilotDrawer({ isOpen, onClose, invoices, currentUser }) {
  const currentUsername = currentUser?.username || (() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('billwise_auth') || localStorage.getItem('billwise_auth') || '{}');
      return stored?.username || 'anonymous';
    } catch (e) {
      return 'anonymous';
    }
  })();

  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState(() => copilotApi.getSessionId(currentUsername));
  const chatBottomRef = useRef(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load user's private chat history when drawer opens or user changes
  useEffect(() => {
    if (!isOpen) return;

    const userSessionId = copilotApi.getSessionId(currentUsername);
    setSessionId(userSessionId);

    copilotApi.getHistory(userSessionId)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([WELCOME_MESSAGE]);
        }
      })
      .catch(() => {
        setMessages([WELCOME_MESSAGE]);
      });
  }, [isOpen, currentUsername]);

  if (!isOpen) return null;

  const sampleQuestions = [
    "What is my total ITC available this month?",
    "Which invoices have blocked credit under Sec 17(5)?",
    "When is GSTR-1 & GSTR-3B due?",
    "Show me high-value vendor spend"
  ];

  const handleSend = async (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isSending) return;

    const userMsg = { sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsSending(true);

    try {
      const res = await copilotApi.sendMessage(sessionId, query);
      const replyText = res?.reply || "I couldn't process this request. Please try again.";
      setMessages(prev => [...prev, { sender: 'ai', text: replyText }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `Sorry, I couldn't reach the AI service (${err.message}). Please verify the server is running.`
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await copilotApi.clearHistory(sessionId);
    } catch (e) {}
    const newSession = `${currentUsername}_${crypto.randomUUID()}`;
    const storageKey = `billwise_copilot_session_${currentUsername}`;
    localStorage.setItem(storageKey, newSession);
    setSessionId(newSession);
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                BillWise AI Copilot
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Online
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">GST Compliance & Tax Advisor</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleClearHistory}
              title="Reset conversation"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          
          {/* Quick Chip Prompts */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-500" />
              Suggested Questions
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-rose-700 text-xs text-left transition shadow-2xs font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="space-y-3 pt-2">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                  msg.sender === 'user'
                    ? 'bg-rose-600 text-white rounded-br-none font-medium shadow-xs whitespace-pre-wrap'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                }`}>
                  {msg.sender === 'user' ? (
                    msg.text
                  ) : (
                    <FormattedMessage text={msg.text} />
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl text-xs bg-white text-slate-400 border border-slate-200 rounded-bl-none shadow-2xs italic flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:0.4s]"></span>
                  Analyzing GST ledger…
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input 
              type="text" 
              placeholder="Ask about GST liabilities, ITC claims, or vendor bills..." 
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isSending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:border-rose-500 outline-none disabled:opacity-60"
            />
            <button 
              type="submit"
              disabled={isSending || !inputQuery.trim()}
              className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
