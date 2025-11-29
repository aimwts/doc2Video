
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene, ScriptResponse } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateStoryContent = async (
  userText: string, 
  audioCtx: AudioContext,
  onProgress: (msg: string) => void
): Promise<Scene[]> => {
  
  // 1. Generate Script
  onProgress("Crafting a 6-scene storyboard...");
  const scriptResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a creative video director. Turn the following text into a dynamic, exactly 6-scene video script. 
    
    Rules:
    - Create exactly 6 scenes.
    - Make the visual prompts highly detailed, focusing on vibrant colors, cinematic lighting, and mood.
    - Keep narration concise and engaging.
    
    Text: "${userText}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                imagePrompt: { type: Type.STRING },
                narration: { type: Type.STRING }
              },
              required: ["imagePrompt", "narration"]
            }
          }
        }
      }
    }
  });

  const scriptData = JSON.parse(scriptResponse.text || '{"scenes": []}') as ScriptResponse;
  
  // Ensure we have exactly 6 or fallback to what we got, but the prompt should enforce it.
  const scenes: Scene[] = scriptData.scenes.map((s, i) => ({
    id: i,
    text: s.narration,
    narration: s.narration,
    imagePrompt: s.imagePrompt,
    visual_prompt: s.imagePrompt
  }));

  // 2. Generate Assets in Parallel
  onProgress("Painting vibrant scenes & recording voiceover...");
  
  const processedScenes: Scene[] = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    onProgress(`Generating Scene ${i + 1}/6...`);

    // Enhance prompt for color and quality
    const enhancedPrompt = `${scene.imagePrompt}, vibrant colors, cinematic lighting, 8k resolution, highly detailed, colorful art style`;

    const [imgBase64, audioBuf] = await Promise.all([
      generateImage(enhancedPrompt),
      generateAudio(scene.text, audioCtx)
    ]);

    processedScenes.push({
      ...scene,
      imageData: imgBase64,
      image: imgBase64,
      audioBuffer: audioBuf
    });
  }

  return processedScenes;
};

async function generateImage(prompt: string): Promise<string | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image gen failed", e);
  }
  return undefined;
}

async function generateAudio(text: string, ctx: AudioContext): Promise<AudioBuffer | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const bytes = decodeBase64(base64);
      // Gemini 2.5 Flash TTS returns raw PCM at 24000Hz, 1 channel
      // We manually decode it because it has no headers
      return decodeAudioData(bytes, ctx, 24000, 1);
    }
  } catch (e) {
    console.error("Audio gen failed", e);
  }
  return undefined;
}
