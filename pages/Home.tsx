
import React, { useState, useEffect, useMemo } from 'react';
import { AppTab, translations, WeatherData, languageMeta, AppNotification, APP_GUIDES, Guide } from '../types';
import { getWeatherData } from '../geminiService';

interface HomeProps {
  onNavigate: (tab: AppTab) => void;
  onOpenChat: () => void;
  language: string;
  isOnline: boolean;
  unreadCount?: number;
  userName: string;
  userAvatar: string;
  primaryCrops: string;
  onGuideClick: (guide: Guide) => void;
  notifications: AppNotification[];
  onNotificationAction: (n: AppNotification) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Home: React.FC<HomeProps> = ({ 
  onNavigate, 
  onOpenChat, 
  language, 
  isOnline, 
  unreadCount = 0,
  userName,
  userAvatar,
  primaryCrops,
  onGuideClick,
  notifications,
  onNotificationAction,
  isDarkMode,
  toggleDarkMode
}) => {
  const t = translations[language] || translations['English'];
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Dynamic recommendations logic
  const recommendedGuides = useMemo(() => {
    const cropTerms = primaryCrops.toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (cropTerms.length === 0) return APP_GUIDES; 

    const scored = APP_GUIDES.map(guide => {
      let score = 0;
      guide.keywords?.forEach(k => {
        if (cropTerms.some(term => term.includes(k) || k.includes(term))) {
          score += 10;
        }
      });
      return { guide, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map(s => s.guide)
      .slice(0, 3);
  }, [primaryCrops]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!isOnline) return;
      setLoadingWeather(true);
      
      let loc = "Sirsa, Haryana";
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            const data = await res.json();
            loc = data.address.city || data.address.town || data.address.suburb || data.address.state || loc;
            const weatherData = await getWeatherData(loc, language);
            if (weatherData) setWeather(weatherData);
          } catch (e) {
            console.error("Location error", e);
            const weatherData = await getWeatherData(loc, language);
            if (weatherData) setWeather(weatherData);
          } finally {
            setLoadingWeather(false);
          }
        }, async () => {
          const weatherData = await getWeatherData(loc, language);
          if (weatherData) setWeather(weatherData);
          setLoadingWeather(false);
        });
      } else {
        const weatherData = await getWeatherData(loc, language);
        if (weatherData) setWeather(weatherData);
        setLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [isOnline, language]);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col bg-background-light dark:bg-background-dark min-h-screen transition-colors duration-300">
      {/* Side Menu Drawer */}
      {isSideMenuOpen && (
        <div className="fixed inset-0 z-[110] flex animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSideMenuOpen(false)}></div>
          <div className="relative w-72 bg-white dark:bg-zinc-900 h-full p-6 shadow-2xl animate-in slide-in-from-left duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 bg-primary rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl fill-1">eco</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">KisanDost</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Market Trends', icon: 'trending_up', tab: AppTab.MARKETS },
                { label: 'AI Guides', icon: 'psychology', tab: AppTab.GUIDES },
                { label: 'Integrity Vault', icon: 'verified_user', tab: AppTab.CERTIFICATIONS },
                { label: 'Vendor Radar', icon: 'forum', tab: AppTab.REVIEWS },
                { label: 'Farmer Profile', icon: 'account_circle', tab: AppTab.PROFILE },
              ].map((item) => (
                <button 
                  key={item.label}
                  onClick={() => { onNavigate(item.tab); setIsSideMenuOpen(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">{item.icon}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-[110] flex items-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)}></div>
          <div className="relative w-full bg-white dark:bg-zinc-900 rounded-t-[3rem] p-8 space-y-6 animate-in slide-in-from-bottom-full duration-500 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900">
                  <span className="material-symbols-outlined fill-1">notifications</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Recent Alerts</h2>
              </div>
              <button onClick={() => setShowNotifications(false)} className="size-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition-transform">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => { onNotificationAction(n); setShowNotifications(false); }}
                    className={`p-5 rounded-3xl border transition-all active:scale-[0.98] cursor-pointer group ${n.read ? 'bg-slate-50 dark:bg-zinc-800/50 border-transparent' : 'bg-white dark:bg-zinc-800 border-slate-100 dark:border-zinc-700 shadow-sm'}`}
                  >
                    <div className="flex gap-4">
                      <div className={`size-12 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${n.type === 'price_drop' ? 'bg-rose-100 text-rose-500' : n.type === 'pest_warning' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'}`}>
                        <span className="material-symbols-outlined fill-1">
                          {n.type === 'price_drop' ? 'trending_down' : n.type === 'pest_warning' ? 'bug_report' : 'tsunami'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-sm font-black leading-tight ${n.read ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{n.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{getTimeAgo(n.timestamp)}</span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${n.read ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{n.description}</p>
                        {!n.read && (
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            {n.actionLabel}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-20 bg-slate-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-slate-300">notifications_off</span>
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="flex items-center p-4 justify-between sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-zinc-800 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSideMenuOpen(true)}
            className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-slate-50 dark:border-zinc-700 active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-200">menu</span>
          </button>
          <div className="hidden xs:flex flex-col">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{t.welcome}</p>
            <h2 className="text-slate-900 dark:text-white text-sm font-black leading-none mt-0.5">{userName}</h2>
          </div>
        </div>

        <div className="flex gap-2.5 items-center">
          <div className="relative">
            <button 
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-full border border-slate-100 dark:border-zinc-700 shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary text-xl">language</span>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{languageMeta[language]?.flag || '🌐'}</span>
            </button>
            
            {isLanguageMenuOpen && (
              <div className="absolute top-12 right-0 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2rem] p-3 shadow-2xl z-50 min-w-[160px] animate-in fade-in slide-in-from-top-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 py-2">Select Language</p>
                {Object.keys(languageMeta).map((langKey) => (
                  <button 
                    key={langKey}
                    onClick={() => { setIsLanguageMenuOpen(false); onNavigate(AppTab.PROFILE); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${language === langKey ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    <span className="text-lg">{languageMeta[langKey].flag}</span>
                    <span className="text-xs font-black uppercase tracking-wider">{languageMeta[langKey].native}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={toggleDarkMode}
            className="flex items-center justify-center rounded-full size-10 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-primary shadow-sm active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined text-xl">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button 
            className="relative flex items-center justify-center rounded-full size-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl active:scale-90 transition-transform"
            onClick={() => setShowNotifications(true)}
          >
            <span className="material-symbols-outlined text-2xl fill-0">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-background-light dark:border-background-dark shadow-lg ring-2 ring-rose-500/20 px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div 
            onClick={() => onNavigate(AppTab.PROFILE)}
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary shadow-sm active:scale-90 cursor-pointer transition-transform overflow-hidden" 
          >
            <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" />
          </div>
        </div>
      </header>

      {/* Hero / Banner Section - FIXED OVERLAP & CLICKABILITY */}
      <div className="p-4">
        <div className="relative overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 transition-all duration-300">
          {/* Top Visual Half */}
          <div className="relative w-full min-h-[160px] sm:min-h-[200px] bg-center bg-cover flex flex-col justify-center px-6 sm:px-10 py-8" 
               style={{ backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=800")' }}>
            <div className="space-y-2 sm:space-y-4">
              <span className="inline-block bg-primary/20 backdrop-blur-md text-primary text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-primary/30">
                Anti-Fraud Protection
              </span>
              <h3 className="text-white text-2xl sm:text-4xl font-black leading-tight">Verify Your Supplies</h3>
              <p className="text-white/80 text-xs sm:text-base font-medium max-w-[80%]">Instant AI check for seeds, equipment & fertilizers.</p>
            </div>
          </div>

          {/* Bottom Action Half */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 gap-6 bg-white dark:bg-zinc-900">
            <div className="flex flex-col gap-1">
              <p className="text-slate-900 dark:text-white font-black text-xl leading-none">SafeScan AI</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold leading-relaxed max-w-[280px]">
                {isOnline ? 'Direct link to manufacturer database' : 'Offline Forensic Node - Scans will sync later'}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                onNavigate(AppTab.SCAN);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl px-8 py-5 font-black uppercase tracking-widest text-[10px] shadow-xl transition-all bg-primary text-slate-900 active:scale-95 shadow-primary/20 hover:shadow-primary/40 z-10"
            >
              <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
              <span>Open Scanner</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
        <h3 className="text-slate-900 dark:text-white text-lg font-black leading-tight mb-5 flex items-center gap-3">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">grid_view</span>
          </div>
          {t.toolkit}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div onClick={() => onNavigate(AppTab.MARKETS)} className="cursor-pointer group relative overflow-hidden flex flex-col gap-4 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl active:scale-95 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-8xl">trending_up</span>
            </div>
            <div className="size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex">
              <span className="material-symbols-outlined text-3xl">trending_up</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-slate-900 dark:text-white text-base font-black uppercase tracking-tight leading-none">{t.priceTracker}</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{!isOnline ? 'Cached' : t.mandiPrice}</p>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-primary font-black text-sm">₹2,125</span>
                <span className="text-[9px] font-black text-slate-400 uppercase">/Qtl</span>
              </div>
            </div>
          </div>
          
          <div onClick={() => onNavigate(AppTab.CERTIFICATIONS)} className="cursor-pointer group relative overflow-hidden flex flex-col gap-4 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl active:scale-95 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-8xl">verified_user</span>
            </div>
            <div className="size-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-slate-900 dark:text-white text-base font-black uppercase tracking-tight leading-none">Certifications</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Integrity Score</p>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-blue-500 font-black text-sm">Level 9</span>
                <span className="material-symbols-outlined text-xs text-blue-500 fill-1">stars</span>
              </div>
            </div>
          </div>

          <div onClick={() => onNavigate(AppTab.GUIDES)} className="cursor-pointer group relative overflow-hidden flex flex-col gap-4 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl active:scale-95 transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-8xl">psychology</span>
            </div>
            <div className="size-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex">
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-slate-900 dark:text-white text-base font-black uppercase tracking-tight leading-none">{t.aiGuides}</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Expert Advice</p>
              <div className="mt-2 text-orange-500 font-black text-[10px] uppercase">New Tip: Wheat</div>
            </div>
          </div>

          <div onClick={() => onNavigate(AppTab.REVIEWS)} className="cursor-pointer group relative overflow-hidden flex flex-col gap-4 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl active:scale-95 transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-8xl">forum</span>
            </div>
            <div className="size-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex">
              <span className="material-symbols-outlined text-3xl">forum</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-slate-900 dark:text-white text-base font-black uppercase tracking-tight leading-none">Reviews</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Vendor Radar</p>
              <div className="mt-2 text-purple-500 font-black text-[10px] uppercase">12 Nearby Shop</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <h3 className="text-slate-900 dark:text-white text-lg font-black leading-tight mb-5 flex items-center gap-3">
          <div className="size-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-500 text-xl">recommend</span>
          </div>
          {t.recommended}
        </h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
          {recommendedGuides.map((guide) => (
            <div 
              key={guide.id} 
              onClick={() => onGuideClick(guide)}
              className="min-w-[280px] w-[280px] relative overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url("${guide.imageUrl}")` }}>
                <div className="absolute top-3 left-3 px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30">
                  <p className="text-[8px] font-black text-primary uppercase tracking-widest">Relevant to your crops</p>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1">{guide.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 line-clamp-2 font-medium">{guide.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">play_circle</span>
                    Listen Guide
                  </span>
                  <span className="material-symbols-outlined text-slate-300">arrow_forward_ios</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        <h3 className="text-slate-900 dark:text-white text-lg font-black leading-tight mb-5 flex items-center gap-3">
          <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-500 text-xl">cloudy_snowing</span>
          </div>
          {t.localForecast}
        </h3>
        
        {loadingWeather ? (
          <div className="h-56 rounded-[2.5rem] bg-slate-200 dark:bg-zinc-900 animate-pulse flex flex-col items-center justify-center gap-4">
            <div className="size-12 bg-white/20 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Syncing Atmospherics...</p>
          </div>
        ) : weather ? (
          <div className="rounded-[2.5rem] p-8 bg-slate-900 dark:bg-primary text-white dark:text-slate-950 shadow-2xl overflow-hidden relative group transition-colors duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[150px]">{weather.icon}</span>
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/60 dark:text-slate-800 text-xs font-black uppercase tracking-[0.2em]">{weather.location}</p>
                  <h4 className="text-6xl font-black mt-2 leading-none tabular-nums">{weather.temp}°</h4>
                  <p className="text-white/80 dark:text-slate-800 text-sm font-black uppercase mt-2 tracking-widest">{weather.condition}</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-7xl drop-shadow-2xl animate-pulse">{weather.icon}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-8 py-6 border-y border-white/10 dark:border-black/10">
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-2xl mb-2 opacity-60">humidity_percentage</span>
                  <p className="text-[9px] uppercase font-black opacity-40 tracking-widest mb-1">{t.humidity}</p>
                  <p className="text-base font-black tabular-nums">{weather.humidity}%</p>
                </div>
                <div className="flex flex-col items-center border-x border-white/10 dark:border-black/10">
                  <span className="material-symbols-outlined text-2xl mb-2 opacity-60">air</span>
                  <p className="text-[9px] uppercase font-black opacity-40 tracking-widest mb-1">{t.wind}</p>
                  <p className="text-base font-black tabular-nums">{weather.windSpeed}<span className="text-[10px] ml-0.5">k/h</span></p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-2xl mb-2 opacity-60">wb_sunny</span>
                  <p className="text-[9px] uppercase font-black opacity-40 tracking-widest mb-1">{t.uvIndex}</p>
                  <p className="text-base font-black tabular-nums">{weather.uvIndex}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4 bg-white/10 dark:bg-black/10 rounded-3xl p-5 backdrop-blur-md">
                <div className="size-10 rounded-2xl bg-white/20 dark:bg-black/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary dark:text-slate-900 text-2xl">smart_toy</span>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary dark:text-slate-800 mb-1">{t.weatherAdvice}</p>
                  <p className="text-xs font-bold leading-relaxed">{weather.agriAdvice}</p>
                </div>
              </div>

              <div className="mt-8 flex justify-between overflow-x-auto no-scrollbar gap-6">
                {weather.forecast.map((f, idx) => (
                  <div key={idx} className="text-center flex-shrink-0 min-w-[60px] bg-white/5 dark:bg-black/5 p-3 rounded-2xl">
                    <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">{f.day}</p>
                    <span className="material-symbols-outlined block my-2 text-2xl">
                      {f.icon}
                    </span>
                    <p className="text-sm font-black tabular-nums">{f.temp}°</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 rounded-[2.5rem] bg-slate-100 dark:bg-zinc-900 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800">
             <span className="material-symbols-outlined text-slate-400 text-5xl mb-3">cloud_off</span>
             <p className="text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-widest">Environment link severed</p>
          </div>
        )}
      </div>

      {/* AI Advisor Floating Action Card */}
      <div className="px-4 py-4 mb-2">
        <div className={`rounded-[2rem] p-6 flex items-center justify-between border-l-8 transition-all shadow-xl ${isOnline ? 'bg-slate-900 dark:bg-white border-primary' : 'bg-slate-100 dark:bg-zinc-900 border-slate-300'}`}>
          <div className="flex items-center gap-4">
            <div className={`${isOnline ? 'bg-primary/20 dark:bg-primary/10' : 'bg-slate-200 dark:bg-zinc-800'} size-14 rounded-2xl flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-3xl ${isOnline ? 'text-primary' : 'text-slate-400'}`}>smart_toy</span>
            </div>
            <div>
              <p className={`font-black uppercase tracking-tight text-base ${isOnline ? 'text-white dark:text-slate-900' : 'text-slate-500'}`}>{t.askAi}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isOnline ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400'}`}>{isOnline ? 'Active Explanation Node' : 'Communication Link Down'}</p>
            </div>
          </div>
          <button 
            disabled={!isOnline}
            onClick={onOpenChat}
            className={`rounded-full px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${isOnline ? 'bg-primary text-slate-900 active:scale-95 shadow-primary/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isOnline ? 'Initialize' : 'Offline'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
