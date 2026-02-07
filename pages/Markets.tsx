
import React, { useState, useEffect, useCallback } from 'react';
import { MandiPrice, translations } from '../types';
import { getSmartSaleAdvisory, getLocalMarketData, getErrorMessage } from '../geminiService';

const AVAILABLE_MARKETS = [
  'Azadpur Market, Delhi',
  'Sirsa Mandi, Haryana',
  'Ludhiana Mandi, Punjab',
  'Nashik Mandi, Maharashtra',
  'Indore Mandi, Madhya Pradesh',
  'Kurnool Mandi, Andhra Pradesh',
  'Vashi Mandi, Navi Mumbai',
  'Koyambedu Market, Chennai'
];

interface MarketsProps {
  language: string;
  isOnline: boolean;
}

const Markets: React.FC<MarketsProps> = ({ language, isOnline }) => {
  const t = translations[language] || translations['English'];
  const [advisory, setAdvisory] = useState<string>('Analyzing market trends...');
  const [isLoadingAdvisory, setIsLoadingAdvisory] = useState(false);
  const [marketLocation, setMarketLocation] = useState('Azadpur Market, Delhi');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showMarketSelector, setShowMarketSelector] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ time: string; source: 'live' | 'cached'; isStale: boolean } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const [prices, setPrices] = useState<MandiPrice[]>([
    { crop: 'Basmati Rice', price: 3450, unit: 'Quintal', trend: 'up', change: 120, emoji: '🌾', verified: true },
    { crop: 'Wheat (Sharbati)', price: 2100, unit: 'Quintal', trend: 'stable', change: 0, emoji: '🌾', verified: true },
  ]);

  const loadCachedData = useCallback((location: string) => {
    const cachedPricesRaw = localStorage.getItem(`cached_prices_${location}`);
    const cachedAdvisory = localStorage.getItem(`cached_advisory_${location}`);
    
    if (cachedPricesRaw) {
      try {
        const { data, timestamp, rawTimestamp } = JSON.parse(cachedPricesRaw);
        
        // Calculate staleness (24 hours = 86400000ms)
        const isStale = rawTimestamp ? (Date.now() - rawTimestamp > 24 * 60 * 60 * 1000) : true;
        
        setPrices(data);
        setUpdateStatus({ 
          time: timestamp, 
          source: 'cached',
          isStale: isStale
        });
        
        if (cachedAdvisory) setAdvisory(cachedAdvisory);
        return true;
      } catch (e) {
        console.error("Cache parse error", e);
      }
    }
    return false;
  }, []);

  const fetchMarketData = useCallback(async (location: string) => {
    setError(null);
    
    // 1. Try to load cache first for instant feedback
    const hasCache = loadCachedData(location);
    
    // 2. If offline, we stop here
    if (!isOnline) {
      if (!hasCache) {
        setError("No cached data available for this location. Connect to internet to refresh.");
      }
      return;
    }

    // 3. If online, attempt background refresh
    setIsLoadingAdvisory(true);
    try {
      const localPrices = await getLocalMarketData(location, language);
      if (localPrices && localPrices.length > 0) {
        setPrices(localPrices);
        const now = new Date();
        const displayTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const rawTimestamp = now.getTime();
        
        setUpdateStatus({ 
          time: displayTime, 
          source: 'live',
          isStale: false
        });
        
        // Update caches with both readable and numeric timestamps
        localStorage.setItem(`cached_prices_${location}`, JSON.stringify({ 
          data: localPrices, 
          timestamp: displayTime,
          rawTimestamp: rawTimestamp 
        }));

        const advice = await getSmartSaleAdvisory(localPrices[0].crop, localPrices[0].price, language);
        setAdvisory(advice);
        localStorage.setItem(`cached_advisory_${location}`, advice);
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      // Only show error if we have no cached data at all
      if (!hasCache) {
        setError(msg);
      } else {
        console.warn("Background refresh failed, using cache:", msg);
      }
    } finally {
      setIsLoadingAdvisory(false);
    }
  }, [isOnline, language, loadCachedData]);

  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }

    setIsDetectingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // If offline, we can't do reverse geocoding, try to use a generic 'Current' key or last known
          if (!isOnline) {
             const lastDetected = localStorage.getItem('last_detected_location');
             if (lastDetected) {
               setMarketLocation(lastDetected);
               setIsLive(true);
               setIsFavorite(localStorage.getItem('favoriteMarket') === lastDetected);
             } else {
               setError("Cannot identify location while offline.");
             }
             setIsDetectingLocation(false);
             return;
          }

          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.suburb || data.address.state || "Local Area";
          const locationName = `${city} Region Mandi`;
          setMarketLocation(locationName);
          localStorage.setItem('last_detected_location', locationName);
          setIsLive(true);
          setIsFavorite(localStorage.getItem('favoriteMarket') === locationName);
        } catch (err) {
          setMarketLocation("Detected Nearby Mandi");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setError("Location access denied. Please select manually.");
        setIsDetectingLocation(false);
      },
      { timeout: 10000 }
    );
  }, [isOnline]);

  useEffect(() => {
    const savedMarket = localStorage.getItem('favoriteMarket');
    if (savedMarket) {
      setMarketLocation(savedMarket);
      setIsFavorite(true);
    } else if (isOnline) {
      handleDetectLocation();
    } else {
      // If offline and no favorite, check if we have a last detected one
      const lastDetected = localStorage.getItem('last_detected_location');
      if (lastDetected) {
        setMarketLocation(lastDetected);
      }
    }
  }, []);

  useEffect(() => {
    if (marketLocation) {
      fetchMarketData(marketLocation);
    }
  }, [marketLocation, fetchMarketData]);

  const toggleFavorite = () => {
    if (isFavorite) {
      localStorage.removeItem('favoriteMarket');
      setIsFavorite(false);
    } else {
      localStorage.setItem('favoriteMarket', marketLocation);
      setIsFavorite(true);
    }
  };

  const selectMarket = (name: string) => {
    setMarketLocation(name);
    setIsLive(false);
    setShowMarketSelector(false);
    setIsFavorite(localStorage.getItem('favoriteMarket') === name);
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 min-h-screen pb-24 bg-slate-50 dark:bg-zinc-950">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 h-16 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
             <span className="material-symbols-outlined text-white text-xl fill-1">monitoring</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t.priceTracker}</h1>
        </div>
        <div className="flex gap-2">
          {isLive && isOnline && (
            <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 animate-pulse">
              <span className="size-1.5 bg-emerald-500 rounded-full"></span>
              LIVE LOCATION
            </div>
          )}
          {(!isOnline || (updateStatus && updateStatus.source === 'cached')) && (
            <div className={`text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1 border ${updateStatus?.isStale ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'}`}>
              <span className="material-symbols-outlined text-[12px]">{updateStatus?.isStale ? 'warning' : 'history'}</span>
              {updateStatus?.isStale ? 'STALE CACHE' : 'OFFLINE CACHE'}
            </div>
          )}
        </div>
      </nav>

      <main className="p-4 space-y-6">
        {/* Stale Data Warning Banner */}
        {updateStatus?.isStale && (
          <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-lg animate-in slide-in-from-top-full duration-500 flex items-center gap-4">
            <div className="size-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined fill-1">report_problem</span>
            </div>
            <p className="text-xs font-black uppercase tracking-wider leading-tight">
              {t.staleDataWarning}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-xl border border-slate-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
             <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Market Selection</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                  <span className="material-symbols-outlined text-primary text-2xl">location_on</span>
                  {marketLocation}
                </h2>
             </div>
             <button 
                onClick={toggleFavorite} 
                className={`size-12 rounded-full flex items-center justify-center transition-all shadow-md ${isFavorite ? 'bg-orange-500 text-white' : 'bg-slate-50 dark:bg-zinc-800 text-slate-400'}`}
              >
                <span className={`material-symbols-outlined text-2xl ${isFavorite ? 'fill-1' : ''}`}>star</span>
              </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className={`flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all bg-primary text-slate-900 active:scale-95 shadow-lg shadow-primary/20`}
            >
              <span className={`material-symbols-outlined text-lg ${isDetectingLocation ? 'animate-spin' : ''}`}>
                {isDetectingLocation ? 'sync' : 'near_me'}
              </span>
              {isDetectingLocation ? 'Detecting...' : 'Near Me'}
            </button>
            <button 
              onClick={() => setShowMarketSelector(true)} 
              className={`flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all bg-slate-900 dark:bg-white text-white dark:text-slate-900 active:scale-95 shadow-lg`}
            >
              <span className="material-symbols-outlined text-lg">map</span>
              Manual
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-2xl">
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-widest text-center">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Regional Market Rates</h3>
            {updateStatus && (
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${updateStatus.source === 'live' ? 'bg-primary' : updateStatus.isStale ? 'bg-rose-500' : 'bg-amber-400'}`}></span>
                <span className="text-[9px] font-bold text-slate-400">
                  {updateStatus.source === 'live' ? 'Live: ' : updateStatus.isStale ? 'Stale: ' : 'Cached: '}{updateStatus.time}
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {prices.map((p, idx) => (
              <div key={idx} className={`group p-4 rounded-3xl flex items-center justify-between shadow-md border transition-all active:scale-[0.98] ${p.anomaly ? 'bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800'}`}>
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">{p.emoji}</div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">{p.crop}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">₹/{p.unit}</p>
                      {p.verified && <span className="material-symbols-outlined text-primary text-[14px] fill-1">verified</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-900 dark:text-white">₹{p.price.toLocaleString()}</p>
                  <div className={`flex items-center justify-end font-black text-[11px] gap-0.5 ${p.trend === 'up' ? 'text-emerald-500' : p.trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-base">
                      {p.trend === 'up' ? 'trending_up' : p.trend === 'down' ? 'trending_down' : 'remove'}
                    </span>
                    ₹{Math.abs(p.change)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className={`bg-slate-900 dark:bg-primary text-white dark:text-slate-950 p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl transition-all ${!isOnline ? 'opacity-90' : ''}`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 dark:bg-black/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-white/20 dark:bg-black/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <span className="material-symbols-outlined text-2xl">smart_toy</span>
                </div>
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1">AI Market Advisory</h5>
                  <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Contextual insights</p>
                </div>
              </div>
              {!isOnline && <span className="text-[8px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">Cached Data</span>}
            </div>
            
            {isLoadingAdvisory ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-white/20 rounded-full w-full"></div>
                <div className="h-3 bg-white/20 rounded-full w-11/12"></div>
                <div className="h-3 bg-white/20 rounded-full w-4/5"></div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed font-bold italic">
                "{advisory}"
              </p>
            )}
            
            <button className="mt-8 w-full py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl">
              Historical Charts
            </button>
          </div>
        </section>
      </main>

      {/* Market Selector Modal */}
      {showMarketSelector && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setShowMarketSelector(false)}></div>
          <div className="relative w-full bg-white dark:bg-zinc-900 rounded-t-[3rem] p-8 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-500 no-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Select Your Mandi</h2>
              <button onClick={() => setShowMarketSelector(false)} className="size-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="grid gap-4">
              <button 
                onClick={handleDetectLocation}
                className="w-full flex items-center gap-4 p-5 rounded-3xl bg-primary/10 border-2 border-primary/20 text-primary active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-2xl">my_location</span>
                <span className="font-black uppercase tracking-widest text-xs">Use Current Geolocation</span>
              </button>
              
              <div className="h-px bg-slate-100 dark:bg-zinc-800 my-4 flex items-center justify-center relative">
                <span className="absolute bg-white dark:bg-zinc-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Or browse major hubs</span>
              </div>

              {AVAILABLE_MARKETS.map((market) => (
                <button 
                  key={market}
                  onClick={() => selectMarket(market)}
                  className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all active:scale-[0.98] ${marketLocation === market ? 'border-primary bg-primary/5' : 'border-slate-50 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 hover:border-slate-200'}`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <span className={`material-symbols-outlined ${marketLocation === market ? 'text-primary' : 'text-slate-400'}`}>location_city</span>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{market}</span>
                  </div>
                  {marketLocation === market && <span className="material-symbols-outlined text-primary">check_circle</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Markets;
