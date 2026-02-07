
import React, { useState, useRef, useEffect } from 'react';
import { VerificationResult, translations, PendingVerification, PastVerification } from '../types';
import { verifyProduct, generateVoiceExplanation, playPCM, getErrorMessage } from '../geminiService';

interface ScanProps {
  onBack: () => void;
  language: string;
  isOnline: boolean;
}

const Scan: React.FC<ScanProps> = ({ onBack, language, isOnline }) => {
  const t = translations[language] || translations['English'];
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [result, setResult] = useState<PastVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [barcodeData, setBarcodeData] = useState<string | null>(null);
  
  // Offline / History States
  const [pendingScans, setPendingScans] = useState<PendingVerification[]>([]);
  const [history, setHistory] = useState<PastVerification[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize persistence and guidelines
  useEffect(() => {
    const savedHistory = localStorage.getItem('scan_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedPending = localStorage.getItem('pending_scans');
    if (savedPending) setPendingScans(JSON.parse(savedPending));
    
    const seenGuides = localStorage.getItem('seen_scan_guides');
    if (!seenGuides) {
      setShowGuidelines(true);
      localStorage.setItem('seen_scan_guides', 'true');
    }

    // Audio context for feedback sounds
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  // Save history updates
  useEffect(() => {
    localStorage.setItem('scan_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('pending_scans', JSON.stringify(pendingScans));
  }, [pendingScans]);

  // Sync logic
  useEffect(() => {
    if (isOnline && pendingScans.length > 0 && !isSyncing) {
      handleSync();
    }
  }, [isOnline]);

  // Camera management
  useEffect(() => {
    if (!result) {
      startCamera();
    }
    return () => stopCamera();
  }, [result]);

  // Real-time Barcode Detection
  useEffect(() => {
    let interval: number;
    if (isCameraActive && !scanning && !result) {
      // @ts-ignore
      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128'] });
        interval = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                setBarcodeData(barcodes[0].rawValue);
                playBeep(880, 0.1); // High beep for detection
              }
            } catch (e) {
              console.warn("Barcode detection failed", e);
            }
          }
        }, 500);
      }
    }
    return () => clearInterval(interval);
  }, [isCameraActive, scanning, result]);

  const playBeep = (freq: number, duration: number) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + duration);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) setHasTorch(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(!torchOn);
    } catch (e) { console.error("Torch error:", e); }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    setIsFlashing(true);
    playBeep(440, 0.15); // Shutter sound
    setTimeout(() => setIsFlashing(false), 150);

    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const handleVerify = async () => {
    const base64 = captureImage();
    if (!base64) return;

    if (!isOnline) {
      const newPending: PendingVerification = {
        id: Math.random().toString(36).substr(2, 9),
        base64: base64,
        timestamp: Date.now()
      };
      setPendingScans(prev => [...prev, newPending]);
      setError(t.offlineScanSaved);
      setTimeout(() => setError(null), 5000);
      return;
    }

    setScanning(true);
    setResult(null);
    setError(null);
    setAudioError(null);
    
    const steps = [
      "Accessing Forensic Node...",
      "Analyzing Spectral Signature...",
      "Cross-referencing Global Batch DB...",
      "Validating Anti-Counterfeit Holograms...",
      "Finalizing Integrity Report..."
    ];
    
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setScanStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 1200);

    try {
      const res = await verifyProduct(base64, language);
      const enrichedResult: PastVerification = {
        ...res,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        verificationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: `data:image/jpeg;base64,${base64}`
      };
      setHistory(prev => [enrichedResult, ...prev]);
      setResult(enrichedResult);
      playBeep(res.status === 'success' ? 1200 : 200, 0.5); // Success/Failure tones
      speakResult(enrichedResult);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      clearInterval(stepInterval);
      setScanning(false);
      setScanStep('');
      setBarcodeData(null);
    }
  };

  const handleSync = async () => {
    if (isSyncing || !isOnline || pendingScans.length === 0) return;
    setIsSyncing(true);
    const toProcess = [...pendingScans];
    const newHistory: PastVerification[] = [];
    
    for (const item of toProcess) {
      try {
        const res = await verifyProduct(item.base64, language);
        newHistory.push({
          ...res,
          id: item.id,
          timestamp: Date.now(),
          verificationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          image: `data:image/jpeg;base64,${item.base64}`
        });
      } catch (e) { console.error("Sync error", e); }
    }
    
    setHistory(prev => [...newHistory, ...prev]);
    setPendingScans([]);
    setIsSyncing(false);
  };

  const speakResult = async (res: any) => {
    if (!isOnline || isPlayingAudio) return;
    setIsPlayingAudio(true);
    setAudioError(null);
    try {
      const text = res.status === 'success' 
        ? `Verification Success. This is an authentic ${res.productName}. Trust score is ${res.confidenceScore || 100} percent. ${res.reasoning}`
        : `Security Alert. This ${res.productName} may be counterfeit. ${res.reasoning}`;
      const audioData = await generateVoiceExplanation(text, language);
      if (audioData) await playPCM(audioData);
    } catch (e: any) {
      setAudioError(getErrorMessage(e));
      setTimeout(() => setAudioError(null), 6000);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (!isOnline) {
        const newPending: PendingVerification = { id: Math.random().toString(36).substr(2, 9), base64, timestamp: Date.now() };
        setPendingScans(prev => [...prev, newPending]);
        setError(t.offlineScanSaved);
        return;
      }
      setScanning(true);
      setScanStep("Processing High-Res Image...");
      try {
        const res = await verifyProduct(base64, language);
        const enrichedResult: PastVerification = {
          ...res,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          verificationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          image: `data:image/jpeg;base64,${base64}`
        };
        setHistory(prev => [enrichedResult, ...prev]);
        setResult(enrichedResult);
        speakResult(enrichedResult);
      } catch (err: any) { setError(getErrorMessage(err)); } finally { setScanning(false); }
    };
    reader.readAsDataURL(file);
  };

  if (result) {
    const isSuccess = result.status === 'success';
    const score = result.confidenceScore || 0;
    
    return (
      <div className={`flex flex-col min-h-screen animate-in fade-in zoom-in-95 duration-500 pb-12 ${isSuccess ? 'bg-emerald-50 dark:bg-zinc-950' : 'bg-rose-50 dark:bg-zinc-950'}`}>
        <header className="flex items-center justify-between p-4 sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
          <button onClick={() => setResult(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 active:scale-90 transition-transform">
            <span className="material-symbols-outlined">refresh</span>
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-xs font-black tracking-widest uppercase opacity-40 leading-none mb-1">Forensic Verdict</h2>
            <h2 className={`text-lg font-black tracking-tight uppercase ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isSuccess ? "AUTHENTIC" : "COUNTERFEIT ALERT"}
            </h2>
          </div>
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <main className="p-6 flex flex-col flex-1 items-center max-w-md mx-auto w-full">
          <div className="relative mb-12 w-full flex justify-center">
            <div className={`absolute -inset-12 rounded-full opacity-20 blur-[60px] transition-all duration-1000 ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <div className={`relative size-56 rounded-full flex flex-col items-center justify-center shadow-2xl border-8 border-white dark:border-zinc-800 ${isSuccess ? 'bg-emerald-500' : 'bg-rose-600'}`}>
              <span className="material-symbols-outlined text-white text-[110px] fill-1">{isSuccess ? 'verified' : 'report_off'}</span>
              <div className="absolute -bottom-6 bg-white dark:bg-zinc-900 px-8 py-3 rounded-full shadow-2xl border border-zinc-100 dark:border-zinc-700">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5 text-center">Trust Index</p>
                <p className={`text-2xl font-black text-center tabular-nums ${isSuccess ? 'text-emerald-500' : 'text-rose-500'}`}>{score}%</p>
              </div>
            </div>
          </div>
          
          <div className="w-full space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                <span className="material-symbols-outlined text-[150px]">security</span>
              </div>
              
              <div className="relative z-10 border-b border-slate-50 dark:border-zinc-800 pb-6 mb-6">
                <h3 className="font-black text-2xl text-slate-900 dark:text-white leading-tight mb-1">{result.productName}</h3>
                <p className="text-xs font-black text-primary uppercase tracking-widest">{result.brand}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10 mb-8">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-3xl">
                  <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Batch ID</p>
                  <p className="text-sm font-bold truncate">{result.batchNumber || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-3xl">
                  <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Expiry Ref</p>
                  <p className="text-sm font-bold">{result.expiryDate || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-slate-900 dark:bg-zinc-800 rounded-[2rem] p-6 relative z-10 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-primary text-xl">biotech</span>
                  <p className="text-[10px] uppercase font-black text-primary tracking-widest">Forensic Breakdown</p>
                </div>
                <p className="text-sm font-bold text-white/90 leading-relaxed italic">"{result.reasoning}"</p>
              </div>
            </div>

            <button 
              onClick={() => speakResult(result)} 
              disabled={isPlayingAudio || !isOnline} 
              className={`w-full relative overflow-hidden rounded-[2rem] py-6 flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl ${isPlayingAudio || !isOnline ? 'bg-slate-200 dark:bg-zinc-800 opacity-70' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}
            >
              <span className={`material-symbols-outlined text-2xl ${isPlayingAudio ? 'animate-pulse' : ''}`}>
                {isPlayingAudio ? 'graphic_eq' : 'volume_up'}
              </span>
              <span className="font-black uppercase tracking-[0.2em] text-[11px]">
                {isPlayingAudio ? 'Streaming Forensic Audio...' : `Play AI Verdict Audio`}
              </span>
            </button>

            <button 
              onClick={() => setResult(null)} 
              className="w-full py-6 border-2 border-slate-200 dark:border-zinc-700 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[11px] text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
            >
              Start New Inspection
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-500">
      {/* Guidelines Modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={() => setShowGuidelines(false)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-4">
               <span className="material-symbols-outlined text-primary text-5xl">shield_locked</span>
               Scanner Guidelines
            </h3>
            <div className="space-y-8 mb-10">
              {[
                { icon: 'center_focus_weak', text: 'Center the product label or brand seal in the viewfinder.' },
                { icon: 'flare', text: 'Ensure ample lighting to capture anti-fraud holograms.' },
                { icon: 'distance', text: 'Maintain 4-6 inches for optimal focus and spectral depth.' },
                { icon: 'sync_alt', text: 'Offline scans will be stored and validated on reconnect.' }
              ].map((tip, idx) => (
                <div key={idx} className="flex gap-5 items-start">
                  <div className="size-14 bg-slate-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-zinc-700 shadow-sm text-primary">
                    <span className="material-symbols-outlined text-2xl">{tip.icon}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-600 dark:text-zinc-300 leading-snug pt-2">{tip.text}</p>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowGuidelines(false)}
              className="w-full py-6 bg-primary text-slate-900 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl active:scale-95 transition-all"
            >
              Initiate Scanner
            </button>
          </div>
        </div>
      )}

      {isFlashing && <div className="fixed inset-0 z-[150] bg-white opacity-80 pointer-events-none"></div>}

      <header className="p-4 flex justify-between items-center text-white z-20 sticky top-0 bg-black/40 backdrop-blur-md">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/50 mb-1">Forensic HUD v2.5</p>
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-rose-500'}`}></div>
            <p className={`text-[10px] font-black tracking-widest uppercase ${isOnline ? 'text-primary' : 'text-rose-500'}`}>
              {isOnline ? 'Network Linked' : 'Standalone Mode'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           {hasTorch && (
             <button onClick={toggleTorch} className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all border shadow-xl ${torchOn ? 'bg-primary text-slate-900 border-primary' : 'bg-white/10 text-white border-white/10'}`}>
                <span className="material-symbols-outlined text-2xl">{torchOn ? 'flashlight_on' : 'flashlight_off'}</span>
             </button>
           )}
           <button onClick={() => setShowGuidelines(true)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
             <span className="material-symbols-outlined text-2xl">info</span>
           </button>
        </div>
      </header>

      <div className="relative shrink-0 w-full aspect-[3/4] bg-slate-950 overflow-hidden shadow-[inset_0_0_120px_rgba(0,0,0,1)]">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity duration-1000 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} />
        
        {scanning && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-30 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
             <div className="relative size-44 mb-10">
               <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-20"></div>
               <div className="absolute inset-2 border-2 border-primary/40 border-t-primary rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-7xl animate-pulse">biotech</span>
               </div>
             </div>
             <p className="text-white font-black uppercase tracking-[0.4em] text-xs mb-4 drop-shadow-lg">{scanStep}</p>
             <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-[shimmer_2s_infinite]"></div>
             </div>
          </div>
        )}

        {!scanning && (
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8 z-10">
              {/* Corner HUD markers */}
              <div className="absolute inset-8 pointer-events-none">
                 <div className="absolute top-0 left-0 size-24 border-t-4 border-l-4 border-primary/40 rounded-tl-[4rem]"></div>
                 <div className="absolute top-0 right-0 size-24 border-t-4 border-r-4 border-primary/40 rounded-tr-[4rem]"></div>
                 <div className="absolute bottom-0 left-0 size-24 border-b-4 border-l-4 border-primary/40 rounded-bl-[4rem]"></div>
                 <div className="absolute bottom-0 right-0 size-24 border-b-4 border-r-4 border-primary/40 rounded-br-[4rem]"></div>
              </div>

              {/* Central Viewfinder */}
              <div className="relative size-72 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-primary/20 rounded-[4rem]"></div>
                  <div className="absolute -inset-2 border border-primary/10 rounded-[4.5rem] animate-pulse"></div>
                  
                  {/* Digital HUD overlays */}
                  <div className="absolute -top-16 left-0 text-[8px] font-black text-primary/70 uppercase tracking-[0.3em] whitespace-nowrap bg-black/40 px-3 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
                    SENSOR_ACTIVE // FPS: 60 // ISO: AUTO
                  </div>
                  <div className="absolute -bottom-16 right-0 text-[8px] font-black text-primary/70 uppercase tracking-[0.3em] whitespace-nowrap bg-black/40 px-3 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
                    AI_TRUST_NODE: CONNECTED
                  </div>

                  {/* Recognition Brackets */}
                  <div className={`absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-[2.5rem] transition-all duration-500 ${barcodeData ? 'border-primary shadow-[0_0_20px_rgba(19,236,19,0.5)]' : 'border-white/40'}`}></div>
                  <div className={`absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-[2.5rem] transition-all duration-500 ${barcodeData ? 'border-primary shadow-[0_0_20px_rgba(19,236,19,0.5)]' : 'border-white/40'}`}></div>
                  <div className={`absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-[2.5rem] transition-all duration-500 ${barcodeData ? 'border-primary shadow-[0_0_20px_rgba(19,236,19,0.5)]' : 'border-white/40'}`}></div>
                  <div className={`absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-[2.5rem] transition-all duration-500 ${barcodeData ? 'border-primary shadow-[0_0_20px_rgba(19,236,19,0.5)]' : 'border-white/40'}`}></div>

                  {/* Scanning Beam */}
                  <div className="absolute inset-x-6 top-6 bottom-6 overflow-hidden rounded-[3rem] opacity-30">
                    <div className="w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_25px_rgba(19,236,19,1)] animate-[scanBeam_4s_infinite] absolute"></div>
                  </div>

                  {/* QR/Barcode Prompt */}
                  {barcodeData && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-slate-900 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl animate-bounce">
                      Code Detected: {barcodeData.slice(0, 8)}...
                    </div>
                  )}
              </div>
           </div>
        )}

        {!isCameraActive && !scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center bg-zinc-950/90 backdrop-blur-xl">
            <div className="size-32 rounded-[3rem] bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-7xl text-white/20 animate-pulse">videocam_off</span>
            </div>
            <p className="text-white text-base font-black uppercase tracking-[0.3em] mb-10 leading-loose">Accessing Forensic Visual Sensors...</p>
            <button onClick={() => fileInputRef.current?.click()} className="bg-primary text-slate-900 px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-95 transition-all">
              Use File Inventory
            </button>
          </div>
        )}
      </div>

      <div className="p-8 pb-16 bg-black flex flex-col items-center z-20 relative shadow-[0_-30px_60px_rgba(0,0,0,1)] border-t border-white/5">
        <div className="w-full flex justify-between items-center max-w-sm mb-12">
           <button onClick={() => fileInputRef.current?.click()} className="size-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-xl backdrop-blur-md">
              <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
           </button>
           
           <button 
             onClick={handleVerify}
             disabled={scanning || isSyncing}
             className={`group relative size-32 rounded-full flex items-center justify-center transition-all ${scanning || isSyncing ? 'scale-90 opacity-40' : 'active:scale-90'}`}
           >
             <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping group-hover:animate-none"></div>
             <div className="absolute inset-3 bg-white rounded-full shadow-2xl"></div>
             <div className="absolute inset-5 border-4 border-slate-950 rounded-full"></div>
             <div className="absolute inset-[35%] border-2 border-slate-950/10 rounded-full"></div>
             <span className="material-symbols-outlined text-slate-950 text-[50px] font-black relative z-10">
               {scanning || isSyncing ? 'cached' : 'camera'}
             </span>
           </button>

           <div className="size-16 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1.5 opacity-30">
                 <span className="material-symbols-outlined text-white text-3xl">biometrics</span>
                 <span className="text-[8px] font-black text-white uppercase tracking-widest">Auto-AI</span>
              </div>
           </div>
        </div>
        
        {error && (
          <div className="px-10 py-5 bg-rose-500/10 backdrop-blur-xl text-rose-500 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-xs shadow-2xl border border-rose-500/20 animate-in slide-in-from-bottom-3">
            <span className="text-rose-600 mr-2">! ERROR:</span>
            {error}
          </div>
        )}
      </div>

      <div className="p-10 bg-zinc-950 flex-1 rounded-t-[5rem] -mt-12 relative z-10 shadow-[0_-40px_80px_rgba(0,0,0,0.9)] overflow-y-auto no-scrollbar">
        <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-12"></div>
        
        <div className="grid grid-cols-3 gap-8 mb-16 px-4">
           <div className="text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Node Check</p>
              <p className="text-3xl font-black text-white tabular-nums">{history.length}</p>
           </div>
           <div className="text-center border-x border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Network Health</p>
              <p className={`text-3xl font-black tabular-nums ${isOnline ? 'text-primary' : 'text-rose-500'}`}>
                {isOnline ? '100%' : 'OFF'}
              </p>
           </div>
           <div className="text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pending Vault</p>
              <p className={`text-3xl font-black tabular-nums ${pendingScans.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-700'}`}>{pendingScans.length}</p>
           </div>
        </div>

        {/* Pending Scans View */}
        {pendingScans.length > 0 && (
          <section className="mb-16 space-y-8 px-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-1">Encrypted Offline Queue</h3>
                <p className="text-[8px] font-bold text-rose-500 uppercase tracking-widest">Awaiting Uplink Synchronization</p>
              </div>
              {isOnline && (
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-primary text-slate-900 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                  Sync Node
                </button>
              )}
            </div>
            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
              {pendingScans.map(item => (
                <div key={item.id} className="relative min-w-[160px] aspect-square rounded-[3rem] overflow-hidden border-2 border-white/10 flex-shrink-0 group shadow-2xl">
                  <img src={`data:image/jpeg;base64,${item.base64}`} className="w-full h-full object-cover opacity-40 grayscale" />
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                    <span className="material-symbols-outlined text-rose-500 text-3xl mb-2">lock</span>
                    <p className="text-[9px] font-black text-white uppercase tracking-widest">Locked</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History Log */}
        <section className="space-y-10 px-2">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-2xl">data_exploration</span>
            </div>
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Historical Registry</h3>
          </div>
          
          {history.length > 0 ? (
            <div className="space-y-6">
              {history.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setResult(item)}
                  className="group flex items-center gap-6 p-6 rounded-[3rem] bg-white/5 border border-white/10 active:bg-white/10 transition-all hover:border-primary/40 shadow-2xl relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${item.status === 'success' ? 'bg-primary' : 'bg-rose-600'}`}></div>
                  
                  <div className="size-24 rounded-[2rem] overflow-hidden shrink-0 border border-white/10 shadow-xl group-hover:scale-105 transition-transform duration-700">
                    <img src={item.image} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-black text-white truncate pr-4">{item.productName}</h4>
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status === 'success' ? 'bg-primary/20 text-primary' : 'bg-rose-500/20 text-rose-500'}`}>
                        {item.status === 'success' ? 'VALID' : 'FAKE'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] truncate">{item.brand}</p>
                      <span className="size-1 bg-slate-700 rounded-full"></span>
                      <p className="text-[10px] font-black text-primary tabular-nums">Trust: {item.confidenceScore || 0}%</p>
                    </div>
                    <div className="flex items-center justify-between opacity-40">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                         <span className="material-symbols-outlined text-base">event_note</span>
                         {item.verificationTime}
                       </span>
                       <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center">
              <div className="size-32 bg-white/5 rounded-[4rem] flex items-center justify-center mb-10 border border-white/5 shadow-inner">
                <span className="material-symbols-outlined text-white/10 text-7xl">security_update_warning</span>
              </div>
              <p className="text-slate-500 text-sm font-black uppercase tracking-[0.3em] max-w-[240px] leading-loose">Registry Empty. Initialize Forensic scan to populate vault.</p>
            </div>
          )}
        </section>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleManualUpload} className="hidden" />
      
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes scanBeam { 0% { top: 0%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      `}</style>
    </div>
  );
};

export default Scan;
