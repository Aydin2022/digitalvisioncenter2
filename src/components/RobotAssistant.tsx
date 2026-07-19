import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, Sparkles, HelpCircle } from 'lucide-react';
import { Language } from '../useTranslation';

interface RobotAssistantProps {
  lang: Language;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export default function RobotAssistant({ lang }: RobotAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load initial bot welcome message
  useEffect(() => {
    const welcomeText = lang === 'ar'
      ? 'أهلاً بكم في مركز الرؤية الرقمية! كيف يمكنني مساعدتك اليوم؟'
      : 'Welcome to Digital Vision Center! How can I assist you with our custom systems today?';
    setMessages([
      { sender: 'bot', text: welcomeText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  }, [lang]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const qaPairs = [
    {
      keywordsAr: ['مرحبا', 'مرحباً', 'هلا', 'السلام عليكم'],
      keywordsEn: ['hello', 'hi', 'hey', 'greetings'],
      answerAr: 'اهلا بكم في مركز الرؤية الرقمية كيف استطيع مساعدتك؟',
      answerEn: 'Hello! Welcome to Digital Vision Center. How can we assist you today?'
    },
    {
      keywordsAr: ['الخدمات', 'خدمات', 'ماذا تقدمون', 'شنو الخدمات'],
      keywordsEn: ['services', 'what do you do', 'what we offer', 'offer', 'products'],
      answerAr: 'نقدم برامج جاهزة و حسب الطلب يمكنك الاطلاع عليها على الصفحة مع الصور و الاسعار للطلب قم بأنشاء حساب ثم اضغط على أي صورة سوف تجد اضافة الى السلة اضغط عليها ثم اذهب الى السلة ثم اضغط على الطلب انتضر قليلا سوف يتصل بك احد موضفوا المركز وللمزيد من المعلومات يرجى الاتصال على الرقم +9647708506036',
      answerEn: 'We offer ready-made & tailored software, interactive web portals, ERP networks, and mobile apps. To order: create an account, select any product card, click "Add to Cart", go to your shopping cart, and place the order. Our managers will contact you shortly! Dial +9647708506036 for info.'
    },
    {
      keywordsAr: ['العنوان', 'عنوان', 'اين', 'مكان', 'موقع', 'وين'],
      keywordsEn: ['address', 'location', 'where', 'office', 'branch', 'kirkuk'],
      answerAr: 'كركوك - طريق بغداد - عمارة مافي مول - طابق الارضي',
      answerEn: 'Kirkuk - Baghdad Road - Mavi Mall Building - Ground Floor'
    },
    {
      keywordsAr: ['شكرا', 'شكراً', 'مع السلامة', 'باي', 'شكرا لكم'],
      keywordsEn: ['thanks', 'thank you', 'goodbye', 'bye', 'thank'],
      answerAr: 'شكرا لاختياركم مركز الرؤية الرقمية',
      answerEn: 'Thank you for choosing Digital Vision Center!'
    }
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text, time: userTime };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');

    // Process Response
    setTimeout(() => {
      const normalized = text.toLowerCase().trim();
      let matchedAnswer = '';

      // Find best match
      for (const pair of qaPairs) {
        const matchesAr = pair.keywordsAr.some(kw => normalized.includes(kw));
        const matchesEn = pair.keywordsEn.some(kw => normalized.includes(kw));
        if (matchesAr || matchesEn) {
          matchedAnswer = lang === 'ar' ? pair.answerAr : pair.answerEn;
          break;
        }
      }

      if (!matchedAnswer) {
        matchedAnswer = lang === 'ar'
          ? 'عذراً، لم أفهم سؤالك تماماً. يمكنك الاستفسار عن "الخدمات"، "العنوان"، أو توديعنا بـ "مع السلامة". أو الاتصال مباشرة على الرقم +9647708506036.'
          : "I'm sorry, I couldn't quite catch that. You can ask about our 'services', 'location', or call us directly at +9647708506036.";
      }

      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { sender: 'bot', text: matchedAnswer, time: botTime }]);
    }, 600);
  };

  const chips = lang === 'ar' ? [
    { text: 'مرحباً بالمركز', query: 'مرحبا' },
    { text: 'ما هي الخدمات؟', query: 'ما هي الخدمات التقدمونها؟' },
    { text: 'أين عنوانكم؟', query: 'اين عنوانكم؟' },
    { text: 'شكراً جزيلاً', query: 'شكرا لكم' }
  ] : [
    { text: 'Hello', query: 'Hello' },
    { text: 'What services?', query: 'What services do you offer?' },
    { text: 'Where are you located?', query: 'Where are you located?' },
    { text: 'Goodbye / Thanks', query: 'Thank you!' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-80 md:w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Bot Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between text-white shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-xl">
                  <Bot className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">
                    {lang === 'ar' ? 'مساعد الرؤية الذكي' : 'DVC Smart Assistant'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-indigo-100 font-mono font-medium">ONLINE</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60 scrollbar-thin scrollbar-thumb-slate-800">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-900 text-slate-100 border border-slate-850 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`block text-[8px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'
                    }`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestion Chips */}
            <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-850 flex flex-wrap gap-1.5 justify-center">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.query)}
                  className="text-[10px] font-medium bg-slate-950 text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/30 rounded-full px-2.5 py-1 transition-all cursor-pointer"
                >
                  {chip.text}
                </button>
              ))}
            </div>

            {/* Message Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputVal);
              }}
              className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب رسالتك هنا...' : 'Type a question...'}
                className="flex-1 bg-slate-950 text-white text-xs border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
              <button
                type="submit"
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-indigo-500/30 transition-all cursor-pointer duration-300 relative group border border-indigo-400/20"
      >
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full animate-ping" />
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
        <Bot className="w-6 h-6 animate-pulse" />
        <span className="hidden md:inline text-xs font-bold font-mono tracking-wider">
          {lang === 'ar' ? 'مساعد الرؤية' : 'DVC Bot'}
        </span>
      </motion.button>
    </div>
  );
}
