
import React, { useState } from 'react';
import { Sparkles, FileText, Palette, Music } from 'lucide-react';

interface Props {
  onSubmit: (text: string) => void;
}

export const InputStep: React.FC<Props> = ({ onSubmit }) => {
  const [text, setText] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl mx-auto text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="space-y-6">
        <div className="inline-block p-2 bg-slate-900/50 rounded-2xl backdrop-blur-sm border border-slate-800 mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 font-bold px-4 py-1">
            ✨ AI Video Studio
          </span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-tight">
          <span className="block text-white mb-2">Turn Text into</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500">
            Vibrant Stories
          </span>
        </h1>
        <p className="text-slate-400 text-xl max-w-xl mx-auto leading-relaxed">
          Paste your text below. We'll generate a colorful <strong className="text-slate-200">6-scene</strong> video with narrated voiceovers and cinematic art.
        </p>
      </div>

      <div className="w-full relative group perspective-1000">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 rounded-2xl opacity-50 group-hover:opacity-100 transition duration-1000 blur group-hover:blur-md"></div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Once upon a time in a neon-lit cyber city..."
          className="relative w-full h-56 bg-slate-950/90 rounded-xl border border-slate-800 p-8 text-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all shadow-2xl"
        />
        
        {/* Decorative corner accents */}
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-pink-500 animate-ping"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
      </div>

      <button
        onClick={() => text.trim() && onSubmit(text)}
        disabled={!text.trim()}
        className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-300 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 rounded-full hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
      >
        <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
        <span className="mr-3 text-lg">Generate 6 Scenes</span>
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform text-yellow-300" />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400 w-full pt-8 border-t border-slate-800/50">
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-900/50 transition-colors">
          <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 mb-1">
            <FileText size={24} />
          </div>
          <span className="font-semibold text-slate-200">Auto-Scripting</span>
          <span className="text-sm">Splits text into 6 scenes</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-900/50 transition-colors">
          <div className="p-3 bg-pink-500/10 rounded-lg text-pink-400 mb-1">
            <Palette size={24} />
          </div>
          <span className="font-semibold text-slate-200">Vibrant Art</span>
          <span className="text-sm">Cinematic 16:9 visuals</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-900/50 transition-colors">
          <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400 mb-1">
            <Music size={24} />
          </div>
          <span className="font-semibold text-slate-200">Pro Narration</span>
          <span className="text-sm">AI Voiceover (Kore)</span>
        </div>
      </div>
    </div>
  );
};
