import React from 'react';
import { Users, FolderCheck, Star, Clock, Trophy, Award, Sparkles } from 'lucide-react';
import { Language } from '../useTranslation';

interface StatsSectionProps {
  lang: Language;
  t: any;
}

export default function StatsSection({ lang, t }: StatsSectionProps) {
  const isRtl = lang === 'ar';

  return (
    <section className="w-full py-16 px-4 sm:px-6 relative overflow-hidden bg-slate-950/60 border-t border-b border-slate-850/80 my-12" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Title & Subtitle */}
        <div className="text-center space-y-2 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.statsTitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t.statsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            {t.statsSubtitle}
          </p>
        </div>

        {/* 4 Responsive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: +30 Happy Clients */}
          <div className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-6 rounded-2xl transition-all duration-300 shadow-xl group hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono tracking-tight">
                +30
              </span>
            </div>
            <h3 className="font-extrabold text-white text-base sm:text-lg mb-1">
              {t.statHappyClients}
            </h3>
            <p className="text-xs text-slate-400">
              {isRtl ? 'عملاء ومؤسسات يثقون برؤيتنا الرقمية' : 'Trusted enterprises & business partners'}
            </p>
          </div>

          {/* Card 2: +50 Projects Delivered */}
          <div className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-6 rounded-2xl transition-all duration-300 shadow-xl group hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderCheck className="w-6 h-6" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                +50
              </span>
            </div>
            <h3 className="font-extrabold text-white text-base sm:text-lg mb-1">
              {t.statProjectsDelivered}
            </h3>
            <p className="text-xs text-slate-400">
              {isRtl ? 'أنظمة وتطبيقات متكاملة تم تسليمها بنجاح' : 'Enterprise software & web applications delivered'}
            </p>
          </div>

          {/* Card 3: Client Satisfaction with 5 Stars */}
          <div className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-6 rounded-2xl transition-all duration-300 shadow-xl group hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              
              {/* 5 Stars Rating Display */}
              <div className="flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <h3 className="font-extrabold text-white text-base sm:text-lg mb-1">
              {t.statClientSatisfaction}
            </h3>
            <p className="text-xs text-slate-400">
              {isRtl ? 'تقييم ممتاز 5 نجوم ودعم فني مستمر' : '5-star rating with continuous premium support'}
            </p>
          </div>

          {/* Card 4: +8 Years Experience */}
          <div className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 p-6 rounded-2xl transition-all duration-300 shadow-xl group hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono tracking-tight">
                +8
              </span>
            </div>
            <h3 className="font-extrabold text-white text-base sm:text-lg mb-1">
              {t.statYearsExperience}
            </h3>
            <p className="text-xs text-slate-400">
              {isRtl ? 'خبرة عميقة في هندسة وتطوير الأنظمة' : 'Years of software architecture & dev experience'}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
