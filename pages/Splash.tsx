
import React from 'react';
import { translations } from '../types';

interface SplashProps {
  progress: number;
  language: string;
}

const Splash: React.FC<SplashProps> = ({ progress, language }) => {
  const t = translations[language] || translations['English'];
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-between bg-gradient-to-b from-white to-[#e8f5e8] dark:from-background-dark dark:to-[#0a150a] px-8 py-16">
      <div className="h-10"></div>
      <div className="flex flex-col items-center text-center">
        <div className="relative flex items-center justify-center w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"></div>
          <div className="relative flex items-center justify-center w-28 h-28 bg-white dark:bg-zinc-900 rounded-xl shadow-xl shadow-primary/10">
            <div className="flex relative">
              <span className="material-symbols-outlined text-primary text-6xl fill-1">shield</span>
              <span className="material-symbols-outlined absolute -right-1 -top-1 text-[#2d5a27] text-4xl fill-1">eco</span>
            </div>
          </div>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-background-dark dark:text-white mb-3">
          KisanDost
        </h1>
        <p className="text-base text-[#4a6b4a] dark:text-zinc-400 font-semibold tracking-wide uppercase">
          Advisory & Protection
        </p>
      </div>
      <div className="w-full max-w-xs flex flex-col items-center gap-10 mb-8">
        <div className="w-full flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-background-dark/60 dark:text-white/60">{t.securing}</span>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(19,236,19,0.5)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-full">
          <span className="material-symbols-outlined text-primary text-base fill-1">smart_toy</span>
          <span className="text-[11px] font-extrabold tracking-[0.15em] text-background-dark dark:text-white uppercase">Powered by AI</span>
        </div>
      </div>
    </div>
  );
};

export default Splash;
