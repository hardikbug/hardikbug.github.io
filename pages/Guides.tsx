
import React, { useState, useRef, useEffect } from 'react';
import { Guide, translations, APP_GUIDES } from '../types';
import { generateVoiceExplanation, decodeBase64, decodeAudioData, formatTime } from '../geminiService';

interface GuidesProps {
  onBack: () => void;
  language: string;
  isOnline: boolean;
  initialGuide?: Guide | null;
}

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

const Guides: React.FC<GuidesProps> = ({ onBack, language, isOnline, initialGuide }) => {
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(initialGuide || null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  const t = translations[language] || translations['English'];

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const progressIntervalRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // If initialGuide changes, update selected guide
  useEffect(() => {
    if (initialGuide) {
      setSelectedGuide(initialGuide);
    }
  }, [initialGuide]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [selectedGuide]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPlaybackStatus('idle');
    setCurrentTime(0);
    audioBufferRef.current = null;
    pausedAtRef.current = 0;
    startTimeRef.current = 0;
    gainNodeRef.current = null;
  };

  const startProgressTracking = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = window.setInterval(() => {
      if (audioContextRef.current && playbackStatus === 'playing') {
        const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * playbackSpeed;
        setCurrentTime(elapsed);
        if (elapsed >= duration) {
          setPlaybackStatus('ended');
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
      }
    }, 50);
  };

  const initAudio = async (text: string) => {
    setPlaybackStatus('loading');
    try {
      const base64 = await generateVoiceExplanation(text, language);
      if (!base64) throw new Error("No audio data");
      
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      
      const bytes = decodeBase64(base64);
      const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
      audioBufferRef.current = buffer;
      setDuration(buffer.duration);
      
      startPlayback(0);
    } catch (err: any) {
      console.error("Audio init error:", err);
      setPlaybackStatus('error');
      setTimeout(() => setPlaybackStatus('idle'), 4000);
    }
  };

  const startPlayback = (offset: number) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    // Cleanup old source if it exists
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = playbackSpeed;

    const gain = audioContextRef.current.createGain();
    gain.gain.value = volume;
    gainNodeRef.current = gain;

    source.connect(gain);
    gain.connect(audioContextRef.current.destination);
    
    startTimeRef.current = audioContextRef.current.currentTime - (offset / playbackSpeed);
    
    source.start(0, offset);
    sourceNodeRef.current = source;
    setPlaybackStatus('playing');
    startProgressTracking();
  };

  const handleTogglePlay = async () => {
    if (playbackStatus === 'idle' || playbackStatus === 'ended' || playbackStatus === 'error') {
      if (selectedGuide) {
        stopAudio();
        await initAudio(`${selectedGuide.title}. ${selectedGuide.content}`);
      }
    } else if (playbackStatus === 'playing') {
      if (sourceNodeRef.current && audioContextRef.current) {
        pausedAtRef.current = currentTime;
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
        setPlaybackStatus('paused');
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    } else if (playbackStatus === 'paused') {
      startPlayback(pausedAtRef.current);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioBufferRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * duration;
    
    setCurrentTime(newTime);
    if (playbackStatus === 'playing') {
      startPlayback(newTime);
    } else {
      pausedAtRef.current = newTime;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioBufferRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    if (playbackStatus === 'playing') {
      startPlayback(newTime);
    } else {
      pausedAtRef.current = newTime;
    }
  };

  const handleSpeedChange = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = nextSpeed;
      if (audioContextRef.current) {
        startTimeRef.current = audioContextRef.current.currentTime - (currentTime / nextSpeed);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = v;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (selectedGuide) {
    return (
      <div className="flex flex-col bg-white dark:bg-background-dark min-h-screen animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col">
            <div className="flex items-center p-4 justify-between">
              <button onClick={() => setSelectedGuide(null)} className="flex items-center gap-2 text-slate-900 dark:text-white font-bold active:scale-95 transition-transform group">
                <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
                <span className="hidden sm:inline">{language === 'English' ? 'Back' : 'वापस'}</span>
              </button>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSpeedChange}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest active:scale-90 transition-all border border-slate-200 dark:border-zinc-700"
                >
                  {playbackSpeed}x
                </button>

                <div className="relative flex items-center">
                  <button 
                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    className="size-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 active:scale-90"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                    </span>
                  </button>
                  {showVolumeSlider && (
                    <div className="absolute top-12 right-0 bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 z-20 animate-in fade-in slide-in-from-top-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume} 
                        onChange={handleVolumeChange} 
                        className="w-32 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full appearance-none accent-primary"
                      />
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleTogglePlay}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-xs transition-all shadow-lg active:scale-95 ${playbackStatus === 'loading' ? 'bg-primary/50 animate-pulse' : playbackStatus === 'error' ? 'bg-rose-500 text-white' : 'bg-primary text-slate-900'}`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {playbackStatus === 'playing' ? 'pause' : playbackStatus === 'loading' ? 'hourglass_top' : playbackStatus === 'error' ? 'warning' : 'play_arrow'}
                  </span>
                  <span className="hidden xs:inline">
                    {playbackStatus === 'playing' ? 'Pause' : playbackStatus === 'paused' ? 'Resume' : playbackStatus === 'loading' ? 'Loading' : 'Listen'}
                  </span>
                </button>
              </div>
            </div>

            {(playbackStatus !== 'idle' && playbackStatus !== 'loading' && playbackStatus !== 'error') && (
              <div className="px-6 pb-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-500">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleSkip(-10)} className="size-8 flex items-center justify-center rounded-full text-slate-400 hover:text-primary active:scale-90 transition-all">
                      <span className="material-symbols-outlined text-xl">replay_10</span>
                    </button>
                    <button onClick={() => handleSkip(10)} className="size-8 flex items-center justify-center rounded-full text-slate-400 hover:text-primary active:scale-90 transition-all">
                      <span className="material-symbols-outlined text-xl">forward_10</span>
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-primary tabular-nums tracking-widest">{formatTime(currentTime)}</span>
                      <span className="text-[10px] font-black text-slate-400 tabular-nums tracking-widest">{formatTime(duration)}</span>
                    </div>
                    <div 
                      ref={progressBarRef}
                      onClick={handleSeek}
                      className="h-2.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full cursor-pointer overflow-hidden relative group"
                    >
                      <div 
                        className="h-full bg-primary transition-all duration-100 ease-linear relative" 
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 size-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 pb-12">
          <div className="w-full aspect-[16/10] bg-center bg-cover relative" style={{ backgroundImage: `url("${selectedGuide.imageUrl}")` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-background-dark via-transparent to-transparent"></div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                Crop Health
              </span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                5 min read
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight">{selectedGuide.title}</h1>
            <div className="flex items-center gap-2 mb-8 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <span className="material-symbols-outlined text-emerald-500 fill-1">verified</span>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">AI Expert Verified Agricultural Content</p>
            </div>
            
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg text-slate-700 dark:text-zinc-300 leading-relaxed font-bold mb-8">
                {selectedGuide.description}
              </p>
              <div className="grid gap-6">
                {selectedGuide.content?.split('. ').map((sentence, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 transition-all hover:border-primary/30">
                    <div className="size-8 shrink-0 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center font-black text-xs text-primary shadow-sm">
                      {idx + 1}
                    </div>
                    <p className="text-base text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                      {sentence}.
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-12 p-8 bg-slate-900 dark:bg-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 size-40 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="relative z-10">
                <h3 className="font-black text-xl text-white dark:text-slate-900 mb-2">Need a voice explanation?</h3>
                <p className="text-sm text-white/60 dark:text-slate-500 mb-6 font-medium">Use our AI Audio feature to hear the full guide in your native language with expert persona.</p>
                <button 
                  onClick={handleTogglePlay}
                  className="w-full py-4 bg-primary text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                >
                  {playbackStatus === 'playing' ? 'Pause Playback' : 'Start Audio Guide'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-300 pb-24">
      <div className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center p-4 justify-between">
          <button onClick={onBack} className="text-gray-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-all">
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </button>
          <h2 className="text-gray-900 dark:text-white text-xl font-black uppercase tracking-widest flex-1 text-center">{t.aiGuides}</h2>
          <div className="flex size-10 items-center justify-center"><span className="material-symbols-outlined text-slate-400">info</span></div>
        </div>
        <div className="px-4 pb-4">
          <div className="flex w-full h-14 items-stretch rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden focus-within:border-primary transition-all">
            <div className="text-primary flex items-center justify-center pl-5 pr-2"><span className="material-symbols-outlined text-2xl fill-1">search</span></div>
            <input className="flex w-full border-none bg-transparent focus:ring-0 placeholder:text-slate-400 text-sm font-black uppercase tracking-widest" placeholder="Search crops or diseases..." />
            <div className="flex items-center pr-5 pl-2 text-slate-400 active:text-primary transition-colors cursor-pointer"><span className="material-symbols-outlined">mic</span></div>
          </div>
        </div>
      </div>

      <main className="p-4 space-y-6">
        {APP_GUIDES.map((g) => (
          <div key={g.id} onClick={() => setSelectedGuide(g)} className="relative group cursor-pointer overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-900 shadow-lg active:scale-[0.98] transition-all border border-slate-100 dark:border-zinc-800">
            <div className="w-full aspect-[16/9] bg-center bg-no-repeat bg-cover transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url("${g.imageUrl}")` }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-2">
                 <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20 backdrop-blur-md">Verified</span>
                 <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md">Featured</span>
              </div>
              <h3 className="text-white text-2xl font-black tracking-tight leading-none mb-1">{g.title}</h3>
              <p className="text-white/60 text-sm font-medium line-clamp-1 mb-4">{g.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white/40">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">4 min</span>
                </div>
                <button 
                  className="bg-white text-slate-900 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 group-hover:bg-primary transition-all"
                >
                  Learn Now
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Guides;
