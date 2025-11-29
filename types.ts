
export enum AppState {
  INPUT = 'INPUT',
  GENERATING = 'GENERATING',
  PREVIEW = 'PREVIEW',
}

export type VisualStyle = 'image' | 'video';

export interface Scene {
  id: number;
  text: string;
  narration: string;
  imagePrompt: string;
  visual_prompt: string;
  imageData?: string; // base64
  image?: string;
  video?: string;
  audioBuffer?: AudioBuffer;
}

export interface ScriptResponse {
  scenes: {
    imagePrompt: string;
    narration: string;
  }[];
}