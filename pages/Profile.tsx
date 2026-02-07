
import React, { useState, useRef } from 'react';
import { Language, translations, languageMeta } from '../types';

interface ProfileProps {
  onBack: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userAvatar: string;
  setUserAvatar: (avatar: string) => void;
  primaryCrops: string;
  setPrimaryCrops: (crops: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (active: boolean) => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  onBack, 
  language, 
  setLanguage,
  userName,
  setUserName,
  userAvatar,
  setUserAvatar,
  primaryCrops,
  setPrimaryCrops,
  isDarkMode,
  setIsDarkMode
}) => {
  const t = translations[language] || translations['English'];
  const currentMeta = languageMeta[language] || languageMeta[Language.ENGLISH];
  const [isEditing, setIsEditing] = useState(false);
  
  // Local Refs for file interaction
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Alert Settings States
  const [marketAlerts, setMarketAlerts] = useState(true);
  const [pestAlerts, setPestAlerts] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);

  // Editable fields local state (for cancel/revert logic)
  const [localName, setLocalName] = useState(userName);
  const [location, setLocation] = useState('Sirsa, Haryana');
  const [localPrimaryCrops, setLocalPrimaryCrops] = useState(primaryCrops);
  const [localAvatar, setLocalAvatar] = useState(userAvatar);
  
  const [backupData, setBackupData] = useState<any>(null);

  const handleEditToggle = () => {
    if (!isEditing) {
      setBackupData({ name: localName, location, primaryCrops: localPrimaryCrops, avatar: localAvatar });
      setIsEditing(true);
    } else {
      // Save changes back to app state
      setUserName(localName);
      setUserAvatar(localAvatar);
      setPrimaryCrops(localPrimaryCrops);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (backupData) {
      setLocalName(backupData.name);
      setLocation(backupData.location);
      setLocalPrimaryCrops(backupData.primaryCrops);
      setLocalAvatar(backupData.avatar);
    }
    setIsEditing(false);
  };

  const handleResetAll = () => {
    const confirmed = window.confirm("Are you sure you want to reset all settings to default?");
    if (confirmed) {
      setMarketAlerts(true);
      setPestAlerts(true);
      setWeatherAlerts(true);
      setIsDarkMode(false);
      
      const defaultName = 'Ramesh Kumar';
      const defaultAvatar = 'https://picsum.photos/seed/farmer/200/200';
      const defaultCrops = 'Rice, Wheat';
      
      setLocalName(defaultName);
      setUserName(defaultName);
      setLocalAvatar(defaultAvatar);
      setUserAvatar(defaultAvatar);
      setLocalPrimaryCrops(defaultCrops);
      setPrimaryCrops(defaultCrops);
      
      setLocation('Sirsa, Haryana');
      setLanguage(Language.ENGLISH);
      
      localStorage.removeItem('favoriteMarket');
      setIsEditing(false);
    }
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangeApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } else {
      alert("API Key selection is not available in this environment.");
    }
  };

  const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <div 
      onClick={onToggle} 
      className={`w-12 h-6 rounded-full p-1 relative transition-colors cursor-pointer ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-800'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute transition-all shadow-sm ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen bg-background-light dark:bg-background-dark animate-in fade-in duration-300 pb-24 transition-colors duration-300`}>
      <header className="flex items-center justify-between p-4 sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 transition-colors duration-300">
        <button onClick={isEditing ? handleCancel : onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">{isEditing ? 'close' : 'arrow_back'}</span>
        </button>
        <h2 className="text-lg font-bold">{t.farmerProfile}</h2>
        <button onClick={handleEditToggle} className="font-bold text-sm px-4 py-1.5 rounded-full bg-primary text-slate-900 shadow-lg active:scale-95 transition-all">
          {isEditing ? t.saveChanges : t.editProfile}
        </button>
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Info with Avatar Changer */}
        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-8 shadow-sm flex flex-col items-center border border-slate-100 dark:border-zinc-800 transition-colors duration-300">
          <div 
            onClick={handleAvatarClick}
            className={`group relative w-32 h-32 rounded-full mb-6 cursor-pointer overflow-hidden transition-all ${isEditing ? 'ring-4 ring-primary ring-offset-4 dark:ring-offset-zinc-900' : 'border-4 border-slate-100 dark:border-zinc-800 shadow-inner'}`}
          >
            <img src={localAvatar} className={`w-full h-full object-cover transition-transform duration-500 ${isEditing ? 'group-hover:scale-110' : ''}`} alt="Profile" />
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-3xl">add_a_photo</span>
              </div>
            )}
            {/* Visual indicator for editability */}
            {isEditing && (
              <div className="absolute bottom-2 right-2 size-8 bg-primary rounded-full flex items-center justify-center text-slate-900 shadow-xl border-2 border-white dark:border-zinc-900 scale-90">
                <span className="material-symbols-outlined text-sm">edit</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          {isEditing ? (
            <input 
              value={localName} 
              onChange={(e) => setLocalName(e.target.value)}
              className="text-center text-2xl font-black bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl w-full max-w-[240px] px-4 py-2 focus:ring-2 focus:ring-primary transition-all"
              placeholder="Enter Name"
            />
          ) : (
            <>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{localName}</h1>
              <p className="text-slate-400 text-xs font-black mt-1 uppercase tracking-widest">KD-92831 • Verified</p>
            </>
          )}
        </div>

        {/* Billing & API Settings */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 space-y-4 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">key</span>
            </div>
            <p className="font-bold text-sm">{t.billingAndApi}</p>
          </div>
          <button 
            onClick={handleChangeApiKey}
            className="w-full py-4 bg-slate-100 dark:bg-zinc-800 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-700 dark:text-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">refresh</span>
            {t.changeApiKey}
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-3 text-center block text-[10px] font-black text-primary uppercase tracking-widest"
          >
            {t.apiKeyDocs}
          </a>
        </div>

        {/* Improved Language Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-zinc-800 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-slate-500">language</span>
              </div>
              <p className="font-bold text-sm">{t.appLanguage}</p>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              <span className="text-base leading-none">{currentMeta.flag}</span>
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">{currentMeta.native}</span>
            </div>
          </div>
          
          <div className="relative">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl px-5 py-3.5 font-bold text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white transition-all shadow-sm"
            >
              {Object.entries(languageMeta).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.flag} {meta.native} ({meta.name})
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
        </div>

        {/* Actionable Alert Settings */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 space-y-5 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-primary fill-1">notifications_active</span>
            </div>
            <p className="font-bold text-sm">{t.alertSettings}</p>
          </div>
          
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold">{t.marketAlerts}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Critical price drops</span>
              </div>
              <Toggle active={marketAlerts} onToggle={() => setMarketAlerts(!marketAlerts)} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold">{t.pestAlerts}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Regional pest risks</span>
              </div>
              <Toggle active={pestAlerts} onToggle={() => setPestAlerts(!pestAlerts)} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold">{t.weatherAlerts}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Storm & rain warnings</span>
              </div>
              <Toggle active={weatherAlerts} onToggle={() => setWeatherAlerts(!weatherAlerts)} />
            </div>
          </div>
        </div>

        {/* Farm Details */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm space-y-4 border border-slate-100 dark:border-zinc-800 transition-colors duration-300">
          <h3 className="font-bold flex items-center gap-2 uppercase text-[10px] text-slate-400 tracking-widest"><span className="material-symbols-outlined text-lg">agriculture</span> Details</h3>
          <div className="space-y-4">
             <div className="flex flex-col">
               <p className="text-[10px] uppercase font-bold text-slate-400">Location</p>
               {isEditing ? (
                 <input value={location} onChange={(e) => setLocation(e.target.value)} className="font-bold bg-slate-50 dark:bg-zinc-800 border-none rounded-xl mt-1 w-full px-4 py-3 focus:ring-2 focus:ring-primary" />
               ) : (
                 <p className="font-bold px-1">{location}</p>
               )}
             </div>
             <div className="flex flex-col">
               <p className="text-[10px] uppercase font-bold text-slate-400">Crops</p>
               {isEditing ? (
                 <input value={localPrimaryCrops} onChange={(e) => setLocalPrimaryCrops(e.target.value)} className="font-bold bg-slate-50 dark:bg-zinc-800 border-none rounded-xl mt-1 w-full px-4 py-3 focus:ring-2 focus:ring-primary" />
               ) : (
                 <p className="font-bold px-1">{localPrimaryCrops}</p>
               )}
             </div>
          </div>
        </div>

        {/* Dark Mode Preference */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">Dark Mode</p>
            <Toggle active={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
          </div>
        </div>

        {/* Danger Zone / Reset Settings */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-red-100 dark:border-red-900/30 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-red-600">settings_backup_restore</span>
            </div>
            <p className="font-bold text-sm text-red-600">Account Management</p>
          </div>
          <button 
            onClick={handleResetAll}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-sm active:scale-[0.98] transition-all hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-900/20 shadow-sm"
          >
            <span className="material-symbols-outlined">restart_alt</span>
            Reset All Settings
          </button>
          <p className="text-[10px] text-slate-400 mt-3 text-center uppercase tracking-wider font-medium">
            This will revert all preferences to factory defaults.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Profile;
