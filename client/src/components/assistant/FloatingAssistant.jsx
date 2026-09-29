import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bot, Mic, MicOff, Send, Sparkles, X } from 'lucide-react';

// Format markdown-like bold indicators without displaying raw asterisks
function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i} className="font-bold">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

export default function FloatingAssistant() {
  const { user, token, lang, t } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: lang === 'hi' 
        ? 'नमस्ते! मैं CoalGuard AI सहायक हूँ। आप मुझसे खान अनुपालन, गैस सेंसर, जोखिम स्कोर या ठेकेदार स्थिति के बारे में पूछ सकते हैं।' 
        : 'Hello! I am CoalGuard AI Assistant. Ask me about live compliance status, gas sensor telemetry, risk scores, or contractor licenses.'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const text = queryText || input;
    if (!text.trim()) return;

    const userMsg = { id: `usr-${Date.now()}`, sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query: text,
          language: lang
        })
      });

      const data = await res.json();
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Data retrieved.',
        suggestedNext: data.suggestedNext
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'assistant', text: 'Error contacting AI engine. Please check connection.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const spoken = e.results[0][0].transcript;
        setInput(spoken);
        handleSend(spoken);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const quickPrompts = lang === 'hi'
    ? [
        'खान का जोखिम स्कोर क्या है?',
        'क्या कोई गैस रिसाव या सीमा उल्लंघन है?',
        'अतिदेय अनुपालन की स्थिति बताएं'
      ]
    : [
        "What is our mine's AI risk score?",
        'Any gas leaks or sensor breaches?',
        'Show overdue compliance items'
      ];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#1F6B45] hover:bg-[#17512F] text-white shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/20 hover:scale-105 cursor-pointer"
          title={t('askAiAssistant') || 'Ask CoalGuard AI Assistant'}
          aria-label="Ask CoalGuard AI Assistant"
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="w-3 h-3 rounded-full bg-[#B8860B] border-2 border-white animate-ping absolute top-0 right-0" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B] absolute top-0.5 right-0.5" />
        </button>
      ) : (
        <div className="w-[calc(100vw-24px)] sm:w-96 max-w-sm h-[480px] max-h-[calc(100vh-80px)] bg-[#FFFFFF] border border-[#DDD6C7] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6">
          
          {/* Header */}
          <div className="bg-[#1F6B45] p-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5 font-heading">
                  <span>CoalGuard AI Assistant</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">Live</span>
                </h4>
                <p className="text-[10px] text-[#E3EFE8]">Multilingual Statutory Intelligence</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-[#F7F5F0]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#1F6B45] text-white shadow-xs'
                      : 'bg-[#FFFFFF] text-[#1E1B16] border border-[#DDD6C7] shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{renderFormattedText(m.text)}</p>
                  {m.suggestedNext && (
                    <button
                      onClick={() => handleSend(m.suggestedNext)}
                      className="mt-2 block text-[11px] text-[#1F6B45] hover:underline font-bold"
                    >
                      👉 {m.suggestedNext}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[#6B6558] text-xs p-2">
                <Sparkles className="w-3.5 h-3.5 text-[#1F6B45] animate-spin" />
                <span>Analyzing statutory database...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-[#FFFFFF] border-t border-[#DDD6C7] flex gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#F7F5F0] hover:bg-[#EFEBE2] text-[#1E1B16] border border-[#DDD6C7] shrink-0 transition font-medium"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input & Voice Controls */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-[#FFFFFF] border-t border-[#DDD6C7] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2 rounded-xl transition ${
                isListening
                  ? 'bg-[#A13D2F] text-white animate-pulse'
                  : 'bg-[#F7F5F0] text-[#6B6558] hover:bg-[#EFEBE2] border border-[#DDD6C7]'
              }`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === 'hi' ? 'प्रश्न टाइप करें या बोलें...' : 'Ask question or speak...'}
              className="flex-1 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl px-3 py-2 text-xs text-[#1E1B16] placeholder-[#6B6558] focus:outline-none focus:border-[#1F6B45]"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-[#1F6B45] hover:bg-[#17512F] text-white disabled:opacity-40 transition shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
