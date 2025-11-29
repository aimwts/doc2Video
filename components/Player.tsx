
import React, { useEffect, useRef, useState } from 'react';
import { Scene } from '../types';
import { Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react';

interface Props {
  scenes: Scene[];
  audioCtx: AudioContext;
  onReset: () => void;
}

export const Player: React.FC<Props> = ({ scenes, audioCtx, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Draw current frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scene = scenes[currentSceneIdx];
    if (!scene) return;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Image
    const img = new Image();
    img.src = scene.imageData || '';
    
    const draw = () => {
       // Cover fit
      const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;
      
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
      
      // Cinematic Letterbox (optional aesthetic)
      // ctx.fillStyle = 'black';
      // ctx.fillRect(0, 0, canvas.width, 40);
      // ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

      // Gradient overlay for text
      const gradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
      
      // Draw Subtitles Overlay
      ctx.font = '600 32px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Word Wrap
      const text = scene.text;
      const words = text.split(' ');
      let line = '';
      const lines = [];
      const maxWidth = canvas.width - 100;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      // Draw Lines
      const lineHeight = 44;
      const startY = canvas.height - 60 - (lines.length * lineHeight);
      lines.forEach((l, i) => {
        ctx.fillText(l, canvas.width / 2, startY + (i * lineHeight));
      });
    }

    if (img.complete) {
        draw();
    } else {
        img.onload = draw;
    }

  }, [currentSceneIdx, scenes]);

  const playScene = (index: number) => {
    if (index >= scenes.length) {
      setIsPlaying(false);
      setCurrentSceneIdx(0);
      return;
    }

    setCurrentSceneIdx(index);
    const scene = scenes[index];

    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }

    if (scene.audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = scene.audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        playScene(index + 1);
      };
      source.start();
      audioSourceRef.current = source;
    } else {
      setTimeout(() => playScene(index + 1), 3000);
    }
  };

  const togglePlay = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (isPlaying) {
      setIsPlaying(false);
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
    } else {
      setIsPlaying(true);
      playScene(currentSceneIdx);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Preview Video
          </h2>
          <p className="text-slate-400 mt-1">
            Generated {scenes.length} vibrant scenes from your story.
          </p>
        </div>
        <button 
          onClick={onReset}
          className="px-6 py-2 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-purple-500 hover:bg-purple-500/10 transition-all text-sm font-medium"
        >
          Start Over
        </button>
      </div>

      {/* Video Container with Colorful Border */}
      <div className="relative p-1 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 shadow-2xl shadow-purple-900/40">
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain"
          />
          
          {/* Big Play Button Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer" onClick={togglePlay}>
              <div className="w-24 h-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white shadow-2xl group transition-transform hover:scale-110">
                <Play fill="white" size={40} className="ml-2 drop-shadow-lg" />
              </div>
            </div>
          )}
          
          {/* Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <button 
                     onClick={togglePlay} 
                     className="text-white hover:text-pink-400 transition-colors"
                   >
                     {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                   </button>
                   
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-white tracking-widest">SCENE</span>
                     <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                       {(currentSceneIdx + 1).toString().padStart(2, '0')}
                     </span>
                     <span className="text-slate-500 text-lg">/</span>
                     <span className="text-slate-500 text-lg">{scenes.length.toString().padStart(2, '0')}</span>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => playScene(0)} className="text-slate-400 hover:text-white transition-colors" title="Restart">
                    <RotateCcw size={24} />
                  </button>
                </div>
             </div>
             
             {/* Progress Bar */}
             <div className="w-full h-1 bg-slate-800 mt-4 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${((currentSceneIdx + 1) / scenes.length) * 100}%` }}
                ></div>
             </div>
          </div>
        </div>
      </div>

      {/* Scene Strip */}
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {scenes.map((scene, idx) => (
          <button
            key={scene.id}
            onClick={() => playScene(idx)}
            className={`
              relative flex-shrink-0 w-48 aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300 group
              ${currentSceneIdx === idx 
                ? 'border-purple-500 scale-105 shadow-lg shadow-purple-500/20' 
                : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'}
            `}
          >
            <img src={scene.imageData} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <span className="text-xs font-bold text-white">Scene {idx + 1}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
