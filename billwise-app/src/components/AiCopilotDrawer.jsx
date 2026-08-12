import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send
} from 'lucide-react';
import { copilotApi } from '../api';

const WELCOME_MESSAGE = {
  sender: 'ai',
  text: "Hello! I am your BillWise AI Financial & GST Assistant. How can I help you with tax claims, invoice OCR, or GST deadlines today?"
};

export default function AiCopilotDrawer({ isOpen, onClose, invoices }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(() => copilotApi.getSessionId());
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load any previously saved conversation for this session on first open
  useEffect(() => {
    if (!isOpen || historyLoaded) return;

    copilotApi.getHistory(sessionId)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        }
      })
      .catch(() => {
        // If the backend is unreachable, just keep the local welcome message
      })
      .finally(() => setHistoryLoaded(true));
  }, [isOpen, historyLoaded, sessionId]);

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
      const { reply } = await copilotApi.sendMessage(sessionId, query);
      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `Sorry, I couldn't reach the AI backend (${err.message}). Make sure the Spring Boot app is running on port 8081 with a valid GEMINI_API_KEY.`
      }]);
    } finally {
      setIsSending(false);
    }
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

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          
          {/* Quick Chip Prompts */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Suggested Questions</span>
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
                  <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-rose-600 text-white rounded-br-none font-medium shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3.5 rounded-2xl text-xs bg-white text-slate-400 border border-slate-200 rounded-bl-none shadow-2xs italic">
                  Thinking…
                </div>
              </div>
            )}
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
              disabled={isSending}
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
