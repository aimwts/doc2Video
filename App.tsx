
import React, { useState, useEffect } from 'react';
import { AppState, Scene } from './types';
import { generateStoryContent } from './services/geminiService';
import { InputStep } from './components/InputStep';
import { Player } from './components/Player';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>(AppState.INPUT);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Init audio context on interaction
    const initAudio = () => {
      if (!audioCtx) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioCtx(ctx);
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, [audioCtx]);

  const handleGenerate = async (text: string) => {
    if (!audioCtx) {
      alert("Please click anywhere on the page to initialize audio first.");
      return;
    }
    
    setState(AppState.GENERATING);
    try {
      const generatedScenes = await generateStoryContent(text, audioCtx, (msg) => setLoadingMsg(msg));
      setScenes(generatedScenes);
      setState(AppState.PREVIEW);
    } catch (e) {
      console.error(e);
      alert("Something went wrong generating the video. Please check the console.");
      setState(AppState.INPUT);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-fuchsia-500/30 overflow-x-hidden">
      
      {/* Vibrant Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-pink-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '10s'}} />
        <div className="absolute top-[40%] left-[40%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '12s'}} />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 md:py-16">
        
        {state === AppState.INPUT && (
          <InputStep onSubmit={handleGenerate} />
        )}

        {state === AppState.GENERATING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-500">
             <div className="relative">
               {/* Colorful Spinner */}
               <div className="w-20 h-20 border-4 border-slate-800 rounded-full"></div>
               <div className="w-20 h-20 border-4 border-transparent border-t-fuchsia-500 border-r-purple-500 rounded-full animate-spin absolute top-0 left-0"></div>
               <div className="w-20 h-20 border-4 border-transparent border-b-cyan-500 rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
             </div>
             <div className="text-center space-y-2">
               <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400 animate-pulse">
                 {loadingMsg}
               </p>
               <p className="text-slate-500 text-sm">Crafting 6 colorful scenes...</p>
             </div>
          </div>
        )}

        {state === AppState.PREVIEW && audioCtx && (
          <Player 
            scenes={scenes} 
            audioCtx={audioCtx} 
            onReset={() => setState(AppState.INPUT)} 
          />
        )}

      </main>
    </div>
  );
}
