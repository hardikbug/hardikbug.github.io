
import React from 'react';
import { translations } from '../types';

interface CertificationsProps {
  onBack: () => void;
  language: string;
}

const Certifications: React.FC<CertificationsProps> = ({ onBack, language }) => {
  const t = translations[language] || translations['English'];

  const badges = [
    {
      id: '1',
      title: 'Original Sower',
      desc: 'Verified use of authentic seeds for 3 consecutive seasons.',
      level: 'Gold',
      icon: 'stars',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      date: 'Jan 2024'
    },
    {
      id: '2',
      title: 'Scam Slayer',
      desc: 'Reported 5+ counterfeit products helping protect the community.',
      level: 'Elite',
      icon: 'security',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      date: 'Dec 2023'
    },
    {
      id: '3',
      title: 'Mandi Navigator',
      desc: 'Active monitoring of local market rates for over 1 year.',
      level: 'Silver',
      icon: 'explore',
      color: 'text-slate-500',
      bgColor: 'bg-slate-50',
      date: 'Mar 2024'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen animate-in slide-in-from-right duration-300 bg-slate-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-black uppercase tracking-widest">{t.integrityVault}</h2>
        <div className="w-10"></div>
      </header>

      <main className="p-6 space-y-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary/30 mb-4">
              <span className="material-symbols-outlined text-primary text-4xl fill-1">workspace_premium</span>
            </div>
            <h3 className="text-2xl font-black mb-1">Integrity Score: 98</h3>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Top 1% in Sirsa Region</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t.earnedShields}</h4>
          {badges.map((badge) => (
            <div key={badge.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center gap-5 transition-transform active:scale-[0.98]">
              <div className={`size-16 shrink-0 rounded-2xl ${badge.bgColor} flex items-center justify-center ${badge.color}`}>
                <span className="material-symbols-outlined text-4xl fill-1">{badge.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-black text-slate-900 dark:text-white">{badge.title}</h5>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${badge.color} border-current opacity-70`}>{badge.level}</span>
                </div>
                <p className="text-xs text-slate-500 leading-tight mb-2">{badge.desc}</p>
                <p className="text-[10px] font-bold text-slate-400">Awarded: {badge.date}</p>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full py-5 bg-primary text-slate-900 rounded-full font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all">
          Share My Profile
        </button>
      </main>
    </div>
  );
};

export default Certifications;
