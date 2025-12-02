
import React, { useEffect, useRef, useState } from 'react';
import { Scene } from '../types';
import { Play, Pause, RotateCcw, Download, Settings, Loader2, ChevronDown } from 'lucide-react';

interface Props {
  scenes: Scene[];
  audioCtx: AudioContext;
  onReset: () => void;
}

type Resolution = '720p' | '1080p';
type FPS = 24 | 30 | 60;
type Speed = 0.75 | 1.0 | 1.25 | 1.5;

export const Player: React.FC<Props> = ({ scenes, audioCtx, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  
  // Export Settings
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [fps, setFps] = useState<FPS>(30);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Export Status
  const [isExporting, setIsExporting] = useState(false);
  const isExportingRef = useRef(false); // Ref to access state inside audio callbacks

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Recorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const exportDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Dimensions based on resolution
  const getDimensions = () => resolution === '1080p' ? { w: 1920, h: 1080 } : { w: 1280, h: 720 };
  const { w: width, h: height } = getDimensions();

  // Draw Function (Responsive)
  const drawScene = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scene = scenes[index];
    if (!scene) return;

    // Scale factor relative to 720p baseline for consistent look
    const scale = width / 1280;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw Image
    if (scene.imageData) {
      const img = new Image();
      img.src = scene.imageData;
      
      const renderImage = () => {
         // Cover fit
        const ratio = Math.max(width / img.width, height / img.height);
        const centerShift_x = (width - img.width * ratio) / 2;
        const centerShift_y = (height - img.height * ratio) / 2;
        
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

        // Gradient overlay for text
        const gradient = ctx.createLinearGradient(0, height * 0.6, 0, height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);
        
        // Draw Subtitles Overlay
        const fontSize = 32 * scale;
        ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 2 * scale;

        // Word Wrap
        const text = scene.text;
        const words = text.split(' ');
        let line = '';
        const lines = [];
        const maxWidth = width - (100 * scale);

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
        const lineHeight = 44 * scale;
        const startY = height - (60 * scale) - (lines.length * lineHeight);
        lines.forEach((l, i) => {
          ctx.fillText(l, width / 2, startY + (i * lineHeight));
        });
      };

      if (img.complete) {
        renderImage();
      } else {
        img.onload = renderImage;
      }
    }
  };

  // Redraw when scene or resolution changes
  useEffect(() => {
    drawScene(currentSceneIdx);
  }, [currentSceneIdx, scenes, resolution]);

  // Update playback rate dynamically if changed while playing
  useEffect(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.playbackRate.setValueAtTime(playbackSpeed, audioCtx.currentTime);
      } catch (e) {
        console.warn("Could not update playback rate", e);
      }
    }
  }, [playbackSpeed, audioCtx]);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
  };

  const playScene = (index: number) => {
    if (index >= scenes.length) {
      // End of playback
      setIsPlaying(false);
      setCurrentSceneIdx(0);
      
      // If exporting, finish up
      if (isExportingRef.current) {
        finishExport();
      }
      return;
    }

    setCurrentSceneIdx(index);
    const scene = scenes[index];

    stopAudio();

    if (scene.audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = scene.audioBuffer;
      source.playbackRate.value = playbackSpeed; // Apply speed
      
      // Routing
      source.connect(audioCtx.destination); // Speakers
      if (isExportingRef.current && exportDestRef.current) {
        source.connect(exportDestRef.current); // Recorder
      }

      source.onended = () => {
        // Recursion to next scene
        playScene(index + 1);
      };
      source.start();
      audioSourceRef.current = source;
    } else {
      // Fallback for silent scenes
      setTimeout(() => playScene(index + 1), 3000 / playbackSpeed);
    }
  };

  const togglePlay = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
    } else {
      setIsPlaying(true);
      playScene(currentSceneIdx);
    }
  };

  // --- Export Logic ---

  const handleExport = () => {
    if (!canvasRef.current) return;
    
    // Stop any current playback
    stopAudio();
    setIsPlaying(false);
    setCurrentSceneIdx(0);
    
    setIsExporting(true);
    isExportingRef.current = true;
    setShowSettings(false);

    // 1. Create Audio Destination
    const dest = audioCtx.createMediaStreamDestination();
    exportDestRef.current = dest;

    // 2. Capture Canvas Stream
    const stream = canvasRef.current.captureStream(fps);
    // Add audio track
    if (dest.stream.getAudioTracks().length > 0) {
      stream.addTrack(dest.stream.getAudioTracks()[0]);
    }

    // 3. Setup Recorder
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9' 
      : 'video/webm';
    
    // Higher bitrate for 1080p
    const bitsPerSecond = resolution === '1080p' ? 8000000 : 5000000;

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond });
    mediaRecorderRef.current = recorder;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story-video-${resolution}-${fps}fps.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup
      setIsExporting(false);
      isExportingRef.current = false;
      exportDestRef.current = null;
    };

    recorder.start();

    // 4. Start Playback Sequence
    // We add a tiny delay to ensure recorder is ready
    setTimeout(() => {
      setIsPlaying(true);
      playScene(0);
    }, 100);
  };

  const finishExport = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
        
        <div className="flex items-center gap-3">
          <button 
            onClick={onReset}
            disabled={isExporting}
            className="px-6 py-2 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-purple-500 hover:bg-purple-500/10 transition-all text-sm font-medium disabled:opacity-50"
          >
            Start Over
          </button>
          
          {/* Settings Dropdown */}
          <div className="relative">
             <button
                onClick={() => setShowSettings(!showSettings)}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
             >
               <Settings size={18} />
               <span className="text-sm font-medium hidden sm:inline">{resolution}, {fps}fps, {playbackSpeed}x</span>
               <ChevronDown size={14} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
             </button>

             {showSettings && (
               <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Resolution</label>
                      <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {(['720p', '1080p'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => setResolution(r)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${resolution === r ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Frame Rate</label>
                      <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {([24, 30, 60] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setFps(f)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${fps === f ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Playback Speed</label>
                      <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {([0.75, 1.0, 1.25, 1.5] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => setPlaybackSpeed(s)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${playbackSpeed === s ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
             )}
          </div>

          <button 
             onClick={handleExport}
             disabled={isExporting}
             className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span>{isExporting ? 'Recording...' : 'Download Video'}</span>
          </button>
        </div>
      </div>

      {/* Video Container with Colorful Border */}
      <div className={`relative p-1 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 shadow-2xl shadow-purple-900/40 transition-all duration-500 ${isExporting ? 'scale-[0.98] ring-4 ring-red-500/50' : ''}`}>
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full h-full object-contain"
          />
          
          {/* Big Play Button Overlay (Only when not playing/exporting) */}
          {!isPlaying && !isExporting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer" onClick={togglePlay}>
              <div className="w-24 h-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white shadow-2xl group transition-transform hover:scale-110">
                <Play fill="white" size={40} className="ml-2 drop-shadow-lg" />
              </div>
            </div>
          )}

          {/* Export Overlay */}
          {isExporting && (
             <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse z-20">
               <div className="w-2 h-2 bg-white rounded-full"></div>
               REC
             </div>
          )}
          
          {/* Control Bar (Hide during export to act as clean feed, or keep if controls desired in video? Usually hide) */}
          {/* We keep it visible but disabled during export so user sees progress */}
          <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-6 transition-opacity duration-300 ${isExporting ? 'opacity-0' : 'opacity-100'}`}>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <button 
                     onClick={togglePlay} 
                     disabled={isExporting}
                     className="text-white hover:text-pink-400 transition-colors disabled:opacity-50"
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
                  <button onClick={() => playScene(0)} disabled={isExporting} className="text-slate-400 hover:text-white transition-colors" title="Restart">
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
            onClick={() => !isExporting && playScene(idx)}
            disabled={isExporting}
            className={`
              relative flex-shrink-0 w-48 aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300 group
              ${currentSceneIdx === idx 
                ? 'border-purple-500 scale-105 shadow-lg shadow-purple-500/20' 
                : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'}
              ${isExporting ? 'cursor-not-allowed opacity-40' : ''}
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
