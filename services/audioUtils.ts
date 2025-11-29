
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data from Gemini TTS.
 * Gemini 2.5 Flash TTS returns raw 16-bit signed integer PCM data at 24kHz.
 * It does NOT return a WAV header, so ctx.decodeAudioData will fail.
 */
export function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  // Ensure we have an even number of bytes for 16-bit PCM
  if (data.byteLength % 2 !== 0) {
    const newData = new Uint8Array(data.byteLength + 1);
    newData.set(data);
    data = newData;
  }

  // Convert Uint8Array to Int16Array (16-bit samples)
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  
  // Create an AudioBuffer
  const buffer = ctx.createBuffer(numChannels, dataInt16.length / numChannels, sampleRate);

  // Fill the buffer
  for (let channel = 0; channel < numChannels; channel++) {
    // getChannelData returns a Float32Array (values between -1.0 and 1.0)
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < channelData.length; i++) {
      // Convert 16-bit int (-32768 to 32767) to float (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }

  return buffer;
}
