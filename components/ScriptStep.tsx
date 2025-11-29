import React from 'react';
import { Scene, VisualStyle } from '../types';
import { Play, Image as ImageIcon, MessageSquare, ArrowRight, Video, Film } from 'lucide-react';

interface ScriptStepProps {
  scenes: Scene[];
  onUpdateScenes: (scenes: Scene[]) => void;
  onConfirm: () => void;
  isLoading: boolean;
  visualStyle: VisualStyle;
  onVisualStyleChange: (style: VisualStyle) => void;
}

export const ScriptStep: React.FC<ScriptStepProps> = ({ 
  scenes, 
  onUpdateScenes, 
  onConfirm, 
  isLoading,
  visualStyle,
  onVisualStyleChange
}) => {
  const handleSceneChange = (id: number, field: keyof Scene, value: string) => {
    const updated = scenes.map(s => s.id === id ? { ...s, [field]: value } : s);
    onUpdateScenes(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Review Storyboard</h2>
          <p className="text-slate-400 mt-2">Edit the narration or visual prompts before generation.</p>
        </div>
        
        <div className="flex flex-col gap-4 w-full md:w-auto">
          {/* Style Selector */}
          <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700">
            <button
              onClick={() => onVisualStyleChange('image')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                visualStyle === 'image' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              <ImageIcon size={16} />
              Static Images
            </button>
            <button
              onClick={() => onVisualStyleChange('video')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                visualStyle === 'video' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Video size={16} />
              Veo Video
            </button>
          </div>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Generating {visualStyle === 'video' ? 'Videos...' : 'Assets...'}
              </span>
            ) : (
              <>
                Generate {visualStyle === 'video' ? 'Video' : 'Image'} Assets <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>

      {visualStyle === 'video' && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
           <Film className="shrink-0 mt-0.5" size={16} />
           <p>
             <strong>Note:</strong> You selected Veo video generation. This process takes significantly longer than image generation (approx 1-2 mins per scene). Please be patient.
           </p>
        </div>
      )}

      <div className="space-y-6">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors group">
            <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Scene {index + 1}</span>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Visual Prompt Section */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-pink-400">
                  {visualStyle === 'video' ? <Video size={16} /> : <ImageIcon size={16} />}
                  {visualStyle === 'video' ? 'Video Prompt' : 'Image Prompt'}
                </label>
                <textarea
                  value={scene.visual_prompt}
                  onChange={(e) => handleSceneChange(scene.id, 'visual_prompt', e.target.value)}
                  className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors resize-none"
                  placeholder="Describe the scene..."
                />
              </div>

              {/* Narration Section */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <MessageSquare size={16} />
                  Voiceover Script
                </label>
                <textarea
                  value={scene.narration}
                  onChange={(e) => handleSceneChange(scene.id, 'narration', e.target.value)}
                  className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                  placeholder="Enter narration text..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
