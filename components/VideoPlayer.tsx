import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { Play, Pause, RotateCcw, Download, Loader2, Settings, ChevronDown } from 'lucide-react';

interface VideoPlayerProps {
  scenes: Scene[];
  audioContext: AudioContext | null;
}

interface ExportSettings {
  resolution: '720p' | '1080p';
  fps: 24 | 30 | 60;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ scenes, audioContext }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: '1080p',
    fps: 30
  });
  const [showSettings, setShowSettings] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null); // Hidden video element for Veo clips
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  // Export refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const exportDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Derived dimensions
  const getCanvasDimensions = () => {
    switch (exportSettings.resolution) {
      case '720p': return { width: 1280, height: 720 };
      case '1080p': default: return { width: 1920, height: 1080 };
    }
  };
  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions();

  // Load video source when scene changes
  useEffect(() => {
    const video = videoElementRef.current;
    const currentScene = scenes[currentSceneIndex];
    
    if (video && currentScene?.video) {
      video.src = currentScene.video;
      video.load();
      if (isPlaying) {
        video.play().catch(console.error);
      }
    } else if (video) {
      video.pause();
      video.src = "";
    }
  }, [currentSceneIndex, scenes]);

  // Handle Play/Pause for video element
  useEffect(() => {
    const video = videoElementRef.current;
    if (video && scenes[currentSceneIndex]?.video) {
      if (isPlaying) {
        video.play().catch(e => console.log("Video play interrupted", e));
      } else {
        video.pause();
      }
    }
  }, [isPlaying, currentSceneIndex]);

  // Draw a single frame to the canvas
  const drawFrame = (scene: Scene) => {
    const canvas = canvasRef.current;
    const video = videoElementRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw Background Content (Video or Image)
    if (scene.video && video) {
        // Draw video frame
        // Note: For export to work smoothly, the video element must be playing or seeked
        drawImageCover(ctx, video, canvasWidth, canvasHeight);
    } else if (scene.image) {
        // Draw static image
        const img = new Image();
        img.src = scene.image;
        if (img.complete) {
            drawImageCover(ctx, img, canvasWidth, canvasHeight);
        }
    }

    // Draw Subtitles
    drawSubtitles(ctx, scene.narration, canvasWidth, canvasHeight);
  };

  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLVideoElement, w: number, h: number) => {
    // If video is not ready (width=0), don't draw
    if (img instanceof HTMLVideoElement && (img.videoWidth === 0 || img.readyState < 2)) return;

    const sourceW = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
    const sourceH = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
    
    const ratio = Math.max(w / sourceW, h / sourceH);
    const newW = sourceW * ratio;
    const newH = sourceH * ratio;
    const offsetX = (w - newW) / 2;
    const offsetY = (h - newH) / 2;

    ctx.drawImage(img, offsetX, offsetY, newW, newH);
  };

  const drawSubtitles = (ctx: CanvasRenderingContext2D, text: string, w: number, h: number) => {
    // Gradient overlay for better text readability
    const gradient = ctx.createLinearGradient(0, h * 0.7, 0, h);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    // Text styling
    const fontSize = Math.floor(w / 40);
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Word wrapping
    const words = text.split(' ');
    let line = '';
    const lines = [];
    const maxWidth = w * 0.8;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Draw lines
    const lineHeight = fontSize * 1.4;
    const bottomMargin = h * 0.1;
    lines.forEach((l, i) => {
      // Calculate Y position from bottom up
      const y = h - bottomMargin - ((lines.length - 1 - i) * lineHeight);
      ctx.fillText(l, w / 2, y);
    });
  };

  // Main playback loop
  useEffect(() => {
    const renderLoop = () => {
      if (scenes[currentSceneIndex]) {
        drawFrame(scenes[currentSceneIndex]);
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [currentSceneIndex, scenes, canvasWidth, canvasHeight]); // Re-bind when settings change

  const playScene = (index: number) => {
    if (!audioContext || index >= scenes.length) {
      setIsPlaying(false);
      setCurrentSceneIndex(0);
      return;
    }

    setCurrentSceneIndex(index);
    const scene = scenes[index];

    // Audio setup
    if (activeSourceRef.current) {
      activeSourceRef.current.stop();
    }
    
    if (scene.audioBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = scene.audioBuffer;
      source.connect(audioContext.destination);
      
      // If exporting, also connect to the destination stream
      if (exportDestRef.current) {
        source.connect(exportDestRef.current);
      }

      source.onended = () => {
        if (index < scenes.length - 1) {
          playScene(index + 1);
        } else {
          setIsPlaying(false);
          setCurrentSceneIndex(0);
          if (isExporting) stopExport();
        }
      };

      source.start();
      activeSourceRef.current = source;
      startTimeRef.current = audioContext.currentTime;
    } else {
      // If no audio, just wait a default duration
      setTimeout(() => {
        if (index < scenes.length - 1) playScene(index + 1);
        else {
           setIsPlaying(false);
           if (isExporting) stopExport();
        }
      }, 5000);
    }
  };

  const handlePlayPause = () => {
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (activeSourceRef.current) activeSourceRef.current.stop();
    } else {
      setIsPlaying(true);
      playScene(currentSceneIndex);
    }
  };

  // --- Export Logic ---

  const handleExportVideo = async () => {
    if (!audioContext || !canvasRef.current) return;
    setIsExporting(true);
    setProgress(0);

    // 1. Setup MediaRecorder
    const stream = canvasRef.current.captureStream(exportSettings.fps);
    exportDestRef.current = audioContext.createMediaStreamDestination();
    
    // Add audio track to stream
    const audioTrack = exportDestRef.current.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9' 
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: exportSettings.resolution === '1080p' ? 8000000 : 5000000
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doc-to-video-${exportSettings.resolution}.webm`;
      a.click();
      
      // Cleanup
      recordedChunksRef.current = [];
      exportDestRef.current = null;
      setIsExporting(false);
      setIsPlaying(false);
      setCurrentSceneIndex(0);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();

    // 2. Play through all scenes
    setIsPlaying(true);
    playScene(0);
  };

  const stopExport = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Preview Video</h2>
          <p className="text-slate-400 mt-2">Watch your generated video.</p>
        </div>
        
        {/* Export Controls */}
        <div className="flex gap-2 relative">
          <div className="relative">
             <button 
               onClick={() => setShowSettings(!showSettings)}
               disabled={isExporting}
               className="h-full px-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
             >
               <Settings size={20} />
             </button>
             
             {showSettings && (
               <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-4 z-50 space-y-4">
                 <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Resolution</label>
                   <div className="flex bg-slate-900 rounded-lg p-1">
                     {(['720p', '1080p'] as const).map(res => (
                       <button
                         key={res}
                         onClick={() => setExportSettings(s => ({...s, resolution: res}))}
                         className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${exportSettings.resolution === res ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                       >
                         {res}
                       </button>
                     ))}
                   </div>
                 </div>
                 
                 <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Frame Rate</label>
                   <div className="flex bg-slate-900 rounded-lg p-1">
                     {([24, 30, 60] as const).map(fps => (
                       <button
                         key={fps}
                         onClick={() => setExportSettings(s => ({...s, fps}))}
                         className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${exportSettings.fps === fps ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                       >
                         {fps}
                       </button>
                     ))}
                   </div>
                 </div>
               </div>
             )}
          </div>

          <button
            onClick={handleExportVideo}
            disabled={isExporting}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg transition-all
              ${isExporting 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105'}
            `}
          >
            {isExporting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Recording...
              </>
            ) : (
              <>
                <Download size={20} />
                Download Video
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain"
        />
        {/* Hidden Video Element for Veo Playback */}
        <video 
          ref={videoElementRef}
          className="hidden"
          crossOrigin="anonymous"
          playsInline
          muted // Audio handled by AudioContext
        />

        {/* Playback Controls Overlay */}
        {!isExporting && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <button
                  onClick={() => playScene(0)}
                  className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
              <span className="text-white font-medium">
                Scene {currentSceneIndex + 1} / {scenes.length}
              </span>
            </div>
          </div>
        )}
        
        {/* Export Progress Overlay */}
        {isExporting && (
           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
             <div className="text-white text-xl font-bold mb-4 flex items-center gap-3">
               <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
               Rendering Video...
             </div>
             <p className="text-slate-300 text-sm">Please do not close this tab.</p>
           </div>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {scenes.map((scene, idx) => (
          <button
            key={scene.id}
            onClick={() => playScene(idx)}
            className={`
              flex-shrink-0 w-48 aspect-video rounded-lg overflow-hidden border-2 transition-all relative group
              ${currentSceneIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-700 opacity-60 hover:opacity-100'}
            `}
          >
            {scene.video ? (
                <video src={scene.video} className="w-full h-full object-cover" />
            ) : (
                <img src={scene.image} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={24} className="text-white" />
            </div>
            <div className="absolute bottom-2 left-2 text-xs font-bold text-white shadow-black drop-shadow-md">
              Scene {idx + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};