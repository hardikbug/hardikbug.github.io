
import React, { useState, useEffect, useCallback } from 'react';
import { AppTab, translations, AppNotification, Guide } from './types';
import Splash from './pages/Splash';
import Home from './pages/Home';
import Markets from './pages/Markets';
import Scan from './pages/Scan';
import Guides from './pages/Guides';
import Advisory from './pages/Advisory';
import Profile from './pages/Profile';
import Certifications from './pages/Certifications';
import Reviews from './pages/Reviews';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [language, setLanguage] = useState('English');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Shared User Profile State
  const [userName, setUserName] = useState('Ramesh Kumar');
  const [userAvatar, setUserAvatar] = useState('https://picsum.photos/seed/farmer/200/200');
  const [primaryCrops, setPrimaryCrops] = useState('Rice, Wheat');
  const [selectedGuideFromHome, setSelectedGuideFromHome] = useState<Guide | null>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeBanner, setActiveBanner] = useState<AppNotification | null>(null);

  const t = translations[language] || translations['English'];

  // Handle Theme Side Effects
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const timer = setTimeout(() => {
      setShowSplash(false);
      // Simulate a first notification after splash
      setTimeout(() => {
        triggerSampleNotification();
      }, 5000);
    }, 2500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timer);
    };
  }, []);

  const triggerSampleNotification = useCallback(() => {
    const isHindi = language === 'Hindi';
    const newAlert: AppNotification = {
      id: Math.random().toString(),
      type: 'price_drop',
      title: isHindi ? 'मूल्य गिरावट अलर्ट' : 'Price Drop Alert',
      description: isHindi ? 'बासमती चावल के दाम सरसा मंडी में 10% गिर गए हैं।' : 'Basmati Rice prices dropped by 10% in Sirsa Mandi.',
      timestamp: new Date(),
      read: false,
      actionLabel: isHindi ? 'बाजार देखें' : 'View Markets',
      targetTab: AppTab.MARKETS
    };
    setNotifications(prev => [newAlert, ...prev]);
    setActiveBanner(newAlert);
    
    // Auto-dismiss banner after 8 seconds
    setTimeout(() => {
      setActiveBanner(prev => prev?.id === newAlert.id ? null : prev);
    }, 8000);
  }, [language]);

  const handleNotificationAction = (notification: AppNotification) => {
    setActiveTab(notification.targetTab);
    setActiveBanner(null);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
  };

  const handleDismissBanner = () => {
    setActiveBanner(null);
  };

  const handleGuideClick = (guide: Guide) => {
    setSelectedGuideFromHome(guide);
    setActiveTab(AppTab.GUIDES);
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  if (showSplash) return <Splash progress={65} language={language} />;

  const renderContent = () => {
    if (showAdvisory) return <Advisory onBack={() => setShowAdvisory(false)} language={language} isOnline={isOnline} />;
    
    switch (activeTab) {
      case AppTab.HOME:
        return <Home 
          onNavigate={setActiveTab} 
          onOpenChat={() => setShowAdvisory(false)} 
          language={language} 
          isOnline={isOnline} 
          unreadCount={notifications.filter(n => !n.read).length}
          userName={userName}
          userAvatar={userAvatar}
          primaryCrops={primaryCrops}
          onGuideClick={handleGuideClick}
          notifications={notifications}
          onNotificationAction={handleNotificationAction}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />;
      case AppTab.MARKETS:
        return <Markets language={language} isOnline={isOnline} />;
      case AppTab.SCAN:
        return <Scan onBack={() => setActiveTab(AppTab.HOME)} language={language} isOnline={isOnline} />;
      case AppTab.GUIDES:
        return <Guides 
          onBack={() => {
            setActiveTab(AppTab.HOME);
            setSelectedGuideFromHome(null);
          }} 
          language={language} 
          isOnline={isOnline} 
          initialGuide={selectedGuideFromHome}
        />;
      case AppTab.PROFILE:
        return <Profile 
          onBack={() => setActiveTab(AppTab.HOME)} 
          language={language} 
          setLanguage={setLanguage}
          userName={userName}
          setUserName={setUserName}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
          primaryCrops={primaryCrops}
          setPrimaryCrops={setPrimaryCrops}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />;
      case AppTab.CERTIFICATIONS:
        return <Certifications onBack={() => setActiveTab(AppTab.HOME)} language={language} />;
      case AppTab.REVIEWS:
        return <Reviews onBack={() => setActiveTab(AppTab.HOME)} language={language} />;
      default:
        return <Home 
          onNavigate={setActiveTab} 
          onOpenChat={() => setShowAdvisory(true)} 
          language={language} 
          isOnline={isOnline}
          unreadCount={notifications.filter(n => !n.read).length}
          userName={userName}
          userAvatar={userAvatar}
          primaryCrops={primaryCrops}
          onGuideClick={handleGuideClick}
          notifications={notifications}
          onNotificationAction={handleNotificationAction}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 transition-colors duration-300">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-[10px] font-bold py-1 px-4 text-center sticky top-0 z-[60] flex items-center justify-center gap-2 uppercase tracking-widest animate-pulse">
          <span className="material-symbols-outlined text-sm">cloud_off</span>
          Offline Mode - Using Cached Data
        </div>
      )}

      {/* Actionable In-App Notification Banner */}
      {activeBanner && (
        <div className="fixed top-4 left-4 right-4 z-[100] animate-in slide-in-from-top-full duration-500">
          <div className="bg-slate-900/95 dark:bg-white/95 backdrop-blur-md border border-white/10 dark:border-slate-200 rounded-2xl p-4 shadow-2xl flex items-start gap-4">
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${activeBanner.type === 'price_drop' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
              <span className="material-symbols-outlined fill-1">
                {activeBanner.type === 'price_drop' ? 'trending_down' : 'warning'}
              </span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-white dark:text-slate-900 text-sm leading-tight">{activeBanner.title}</h4>
              <p className="text-white/70 dark:text-slate-500 text-xs mt-0.5 line-clamp-2">{activeBanner.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <button 
                  onClick={() => handleNotificationAction(activeBanner)}
                  className="bg-primary text-slate-900 text-[10px] font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
                >
                  {activeBanner.actionLabel}
                </button>
                <button 
                  onClick={handleDismissBanner}
                  className="bg-white/10 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
                >
                  {t.dismiss}
                </button>
              </div>
            </div>
            <button onClick={handleDismissBanner} className="text-white/40 dark:text-slate-400">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {renderContent()}
      
      {/* Bottom Navigation */}
      {!showAdvisory && ![AppTab.SCAN, AppTab.CERTIFICATIONS, AppTab.REVIEWS].includes(activeTab) && (
        <nav className="fixed bottom-6 left-4 right-4 bg-slate-900/95 backdrop-blur-md dark:bg-white/95 border border-white/10 dark:border-slate-200 rounded-full h-16 px-2 flex items-center justify-between shadow-2xl z-50 transition-colors duration-300">
          <button 
            onClick={() => setActiveTab(AppTab.HOME)}
            className={`flex flex-col items-center justify-center w-1/5 ${activeTab === AppTab.HOME ? 'text-primary' : 'text-white dark:text-slate-500'}`}
          >
            <span className={`material-symbols-outlined ${activeTab === AppTab.HOME ? 'fill-1' : ''}`}>home</span>
            <span className="text-[10px] font-bold mt-0.5">{t.home}</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.MARKETS)}
            className={`flex flex-col items-center justify-center w-1/5 ${activeTab === AppTab.MARKETS ? 'text-primary' : 'text-white dark:text-slate-500'}`}
          >
            <span className={`material-symbols-outlined ${activeTab === AppTab.MARKETS ? 'fill-1' : ''}`}>monitoring</span>
            <span className="text-[10px] font-bold mt-0.5">{t.markets}</span>
          </button>
          
          <div className="relative w-1/5 flex justify-center">
            <button 
              onClick={() => setActiveTab(AppTab.SCAN)}
              className={`absolute -top-12 rounded-full size-14 flex items-center justify-center border-4 border-background-light dark:border-background-dark shadow-lg shadow-primary/40 active:scale-90 transition-transform bg-primary`}
            >
              <span className="material-symbols-outlined text-slate-900 text-3xl font-bold">qr_code_scanner</span>
            </button>
            <span className="text-[10px] font-bold mt-8 text-white dark:text-slate-500 uppercase tracking-tighter">{t.scan}</span>
          </div>

          <button 
            onClick={() => setActiveTab(AppTab.GUIDES)}
            className={`flex flex-col items-center justify-center w-1/5 ${activeTab === AppTab.GUIDES ? 'text-primary' : 'text-white dark:text-slate-500'}`}
          >
            <span className={`material-symbols-outlined ${activeTab === AppTab.GUIDES ? 'fill-1' : ''}`}>menu_book</span>
            <span className="text-[10px] font-bold mt-0.5">{t.guides}</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.PROFILE)}
            className={`flex flex-col items-center justify-center w-1/5 ${activeTab === AppTab.PROFILE ? 'text-primary' : 'text-white dark:text-slate-500'}`}
          >
            <span className={`material-symbols-outlined ${activeTab === AppTab.PROFILE ? 'fill-1' : ''}`}>account_circle</span>
            <span className="text-[10px] font-bold mt-0.5">{t.profile}</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
