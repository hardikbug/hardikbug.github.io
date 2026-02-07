
import React, { useState, useRef, useEffect } from 'react';
import { getAdvisoryResponse, generateVoiceExplanation, playPCM, getErrorMessage } from '../geminiService';
import { translations } from '../types';

interface Message {
  role: 'user' | 'bot';
  text: string;
  isAudioLoading?: boolean;
}

interface AdvisoryProps {
  onBack: () => void;
  language: string;
  isOnline: boolean;
}

const Advisory: React.FC<AdvisoryProps> = ({ onBack, language, isOnline }) => {
  const t = translations[language] || translations['English'];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: language === 'Hindi' ? 'बुवाई के टिप्स' : 'Sowing Tips', query: 'Give me sowing tips for Wheat' },
    { label: language === 'Hindi' ? 'कीट नियंत्रण' : 'Pest Control', query: 'How to control stem borer in Rice?' },
    { label: language === 'Hindi' ? 'उर्वरक सलाह' : 'Fertilizer Advice', query: 'Explain fertilizer requirements for Cotton' },
    { label: language === 'Hindi' ? 'बाजार विश्लेषण' : 'Market Analysis', query: 'Analyze current market trends for Mustard' }
  ];

  useEffect(() => {
    const greetings: Record<string, string> = {
      'English': 'Namaste! I am your AI Advisor KisanDost. I provide detailed agricultural explanations. How can I help you today?',
      'Hindi': 'नमस्ते! मैं आपका एआई सलाहकार किसानदोस्त हूं। मैं विस्तृत कृषि स्पष्टीकरण प्रदान करता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
      'Punjabi': 'ਨਮਸਤੇ! ਮੈਂ ਤੁਹਾਡਾ ਏਆਈ ਸਲਾਹਕਾਰ ਹਾਂ। ਮੈਂ ਅੱਜ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?',
      'Haryanvi': 'राम राम! मैं थारा एआई सलाहकार हूं। आज के मदद कर सकूँ?',
      'Marathi': 'नमस्कार! मी तुमचा एआय सल्लागार आहे. मी तुम्हाला आज कशी मदत करू शकतो?',
      'Telugu': 'నమస్తే! నేను మీ AI సలహాదారుని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?'
    };
    
    const initialMessage = greetings[language] || greetings['English'];
    setMessages([{ role: 'bot', text: initialMessage }]);

    if (!isOnline) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: language === 'Hindi' ? 'क्षमा करें, एआई चैट के लिए इंटरनेट कनेक्शन की आवश्यकता है।' : 'Sorry, AI chat requires an active internet connection.' 
      }]);
    }
  }, [language, isOnline]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (customQuery?: string) => {
    const queryToUse = customQuery || input;
    if (!queryToUse.trim() || isLoading || !isOnline) return;
    const userMsg = queryToUse.trim();
    if (!customQuery) setInput('');
    setChatError(null);
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    try {
      const response = await getAdvisoryResponse(userMsg, language);
      setMessages(prev => [...prev, { role: 'bot', text: response || "..." }]);
    } catch (e: any) {
      setChatError(getErrorMessage(e));
      setMessages(prev => [...prev, { role: 'bot', text: "I'm having trouble connecting to my brain right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async (index: number, text: string) => {
    if (!isOnline) return;
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, isAudioLoading: true } : m));
    try {
      const audioData = await generateVoiceExplanation(text, language);
      if (audioData) await playPCM(audioData);
    } catch (err: any) {
      console.error("Audio playback error", err);
      setChatError(getErrorMessage(err));
      setTimeout(() => setChatError(null), 5000);
    } finally {
      setMessages(prev => prev.map((m, i) => i === index ? { ...m, isAudioLoading: false } : m));
    }
  };

  const openWhatsApp = () => {
    const phone = '919876543210'; 
    const text = encodeURIComponent(`Hello KisanDost Support, I need help with...`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const callExpert = () => {
    // Using the real Kisan Call Center number (1800-180-1551) for added realism
    window.location.href = 'tel:18001801551';
  };

  const emailSupport = () => {
    window.location.href = 'mailto:support@kisandost.ai?subject=Farmer Support Request';
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-zinc-950">
      <header className="flex items-center p-4 bg-white dark:bg-zinc-900 border-b border-slate-200 sticky top-0 z-10 shadow-sm gap-2">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 dark:text-white active:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="font-bold text-slate-900 dark:text-white leading-none mb-1 truncate">{t.askAi}</h2>
          {chatError && <p className="text-[10px] text-rose-500 font-bold uppercase animate-pulse leading-none truncate">{chatError}</p>}
        </div>
        
        <div className="flex items-center gap-2">
          {/* New Quick Call Expert Button */}
          <button 
            onClick={callExpert}
            className="flex items-center justify-center size-10 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-90 transition-transform"
            title="Call Expert"
          >
            <span className="material-symbols-outlined text-xl">call</span>
          </button>
          
          <button 
            onClick={() => setShowSupport(true)} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">support_agent</span>
            <span className="hidden xs:inline">{t.contactSupport}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative max-w-[90%] p-4 rounded-3xl shadow-sm ${m.role === 'user' ? 'bg-primary text-slate-900 rounded-tr-none' : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-tl-none'}`}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {m.text.split('\n').map((line, lineIdx) => (
                  <p key={lineIdx} className="m-0 leading-relaxed font-medium">
                    {line}
                  </p>
                ))}
              </div>
              {m.role === 'bot' && isOnline && (
                <button onClick={() => handlePlayAudio(i, m.text)} className="absolute right-3 bottom-3 text-slate-400 hover:text-primary transition-colors">
                  <span className={`material-symbols-outlined text-xl ${m.isAudioLoading ? 'animate-pulse text-primary' : ''}`}>{m.isAudioLoading ? 'graphic_eq' : 'volume_up'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl animate-pulse flex gap-2">
              <div className="size-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white dark:bg-zinc-900 flex flex-col gap-4 border-t border-slate-100 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickActions.map((action, idx) => (
            <button 
              key={idx}
              disabled={isLoading || !isOnline}
              onClick={() => handleSend(action.query)}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 active:scale-95 transition-all hover:bg-primary/10 hover:border-primary/30"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input 
            disabled={!isOnline}
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
            className={`flex-1 rounded-2xl px-5 py-4 border-none focus:ring-2 focus:ring-primary transition-colors text-sm font-medium ${isOnline ? 'bg-slate-100 dark:bg-zinc-800' : 'bg-slate-200 dark:bg-zinc-900 cursor-not-allowed'}`} 
            placeholder={isOnline ? "Ask about crops, pests, fertilizers..." : "Chat disabled while offline"} 
          />
          <button 
            disabled={!isOnline || (!input.trim() && !isLoading)}
            onClick={() => handleSend()} 
            className={`size-14 rounded-2xl flex items-center justify-center transition-all ${isOnline ? 'bg-primary text-slate-900 active:scale-95 shadow-lg shadow-primary/20' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
          >
            <span className="material-symbols-outlined text-2xl">{isOnline ? 'send' : 'cloud_off'}</span>
          </button>
        </div>
      </div>

      {showSupport && (
        <div className="fixed inset-0 z-[100] flex items-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSupport(false)}></div>
          <div className="relative w-full bg-white dark:bg-zinc-900 rounded-t-[3rem] p-8 space-y-8 animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-2">{t.contactSupport}</h3>
                <p className="text-sm font-bold text-slate-400">{t.supportDesc}</p>
              </div>
              <button onClick={() => setShowSupport(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid gap-4">
              <button 
                onClick={openWhatsApp}
                className="w-full flex items-center gap-5 p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-900/30 active:scale-[0.98] transition-all group"
              >
                <div className="size-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">chat</span>
                </div>
                <div className="text-left">
                  <p className="font-black text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-widest mb-1">Deep Integration</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{t.whatsappSupport}</p>
                </div>
              </button>

              <button 
                onClick={callExpert}
                className="w-full flex items-center gap-5 p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-100 dark:border-blue-900/30 active:scale-[0.98] transition-all group"
              >
                <div className="size-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">call</span>
                </div>
                <div className="text-left">
                  <p className="font-black text-blue-600 dark:text-blue-400 uppercase text-[10px] tracking-widest mb-1">Human Expert</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{t.callSupport}</p>
                </div>
              </button>

              <button 
                onClick={emailSupport}
                className="w-full flex items-center gap-5 p-6 rounded-[2rem] bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 active:scale-[0.98] transition-all group"
              >
                <div className="size-14 rounded-2xl bg-slate-700 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">mail</span>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest mb-1">{t.supportDesc}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{t.emailSupport}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Advisory;
