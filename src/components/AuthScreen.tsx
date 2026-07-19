import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Mail, Key, User, Lock, LogIn, UserPlus, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Phone, MapPin, Globe } from 'lucide-react';
import { db } from '../dbManager';
import { Language, translations } from '../useTranslation';
// @ts-ignore
import logoImage from '../assets/images/digital_vision_center_logo_1784451081564.jpg';

interface AuthScreenProps {
  lang: Language;
  onAuthSuccess: (user: any) => void;
  onLanguageToggle: () => void;
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function AuthScreen({
  lang,
  onAuthSuccess,
  onLanguageToggle,
  addLog
}: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Fields for Sign In
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Additional Fields for Sign Up
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    setTimeout(() => {
      if (isSignUp) {
        // Sign Up Flow
        if (!username || !password || !email || !phone || !address) {
          setErrorMsg(lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all requested parameters.');
          setIsLoading(false);
          return;
        }

        const res = db.registerUser({
          username,
          password,
          email,
          phone,
          address,
          role: 'user' // default role
        });

        if (res.success && res.user) {
          addLog(`New account created successfully for username: ${username}`, 'success');
          setSuccessMsg(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...' : 'Account registered! Auto-authenticating...');
          setTimeout(() => {
            onAuthSuccess(res.user);
          }, 1500);
        } else {
          setErrorMsg(res.error || 'Registration failed');
          addLog(`Failed registration attempt for username: ${username}`, 'error');
          setIsLoading(false);
        }
      } else {
        // Sign In Flow
        if (!username || !password) {
          setErrorMsg(lang === 'ar' ? 'اسم المستخدم وكلمة المرور مطلوبان' : 'Credentials are required.');
          setIsLoading(false);
          return;
        }

        const res = db.loginUser(username, password);
        if (res.success && res.user) {
          addLog(`User authentication approved for session role: ${res.user.role}`, 'success');
          setSuccessMsg(lang === 'ar' ? 'تم تسجيل الدخول بنجاح! جاري التحميل...' : 'Session verified. Welcome back!');
          setTimeout(() => {
            onAuthSuccess(res.user);
          }, 1200);
        } else {
          setErrorMsg(lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid username or password credentials.');
          addLog(`Invalid credentials entered for username: ${username}`, 'error');
          setIsLoading(false);
        }
      }
    }, 1000);
  };

  const triggerAdminBypass = () => {
    // Quick administrator entry helper for easy testing
    const adminUser = db.getUsers().find(u => u.username === 'admin');
    if (adminUser) {
      addLog('Bypassing standard OAuth verification... Admin session starting.', 'success');
      onAuthSuccess(adminUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative font-sans overflow-hidden select-none" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {/* Absolute Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Language Switch floating */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={onLanguageToggle}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md"
        >
          <Globe className="w-4 h-4 text-indigo-400" />
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      <div className="w-full max-w-md z-20 space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500/30 shadow-xl mb-2 bg-slate-900 justify-center items-center">
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight font-display bg-gradient-to-r from-indigo-200 via-white to-purple-200 bg-clip-text text-transparent">
            {t.appName}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {t.brandDescription}
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
          
          <div className="flex items-center justify-between pb-6 border-b border-slate-850">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isSignUp ? t.navSignUp : t.navSignIn}
            </h2>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
            >
              {isSignUp ? lang === 'ar' ? 'لديك حساب؟ سجل الدخول' : 'Have account? Sign In' : lang === 'ar' ? 'ليس لديك حساب؟ سجل الآن' : 'New here? Register'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-6">
            
            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                {t.username} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: aydin99' : 'e.g. john_doe'}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none transition-all font-sans"
                />
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              </div>
            </div>

            {/* Email (only sign up) */}
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                  {t.email} *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none transition-all font-sans"
                  />
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                </div>
              </div>
            )}

            {/* Phone Number (only sign up) */}
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                  {t.phone} *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9647708506036"
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none transition-all font-sans font-mono"
                  />
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                </div>
              </div>
            )}

            {/* Address (only sign up) */}
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                  {t.address} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={lang === 'ar' ? 'كركوك - طريق بغداد' : 'Kirkuk - Baghdad Road'}
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none transition-all font-sans"
                  />
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                {t.password} *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none transition-all font-sans"
                />
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>{lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span>
              ) : (
                <>
                  <span>{isSignUp ? t.navSignUp : t.navSignIn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Admin bypass footer */}
          <div className="mt-6 pt-5 border-t border-slate-850 text-center">
            <button
              onClick={triggerAdminBypass}
              className="text-[10px] font-mono font-bold text-slate-500 hover:text-indigo-400 transition-all cursor-pointer uppercase tracking-wider"
            >
              ⚡ {t.adminBypass} (user: admin, pass: admin1234)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
