export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputData);
        this.audioChunks.push(chunk);
        this.onAudioData(chunk);
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
      
      console.log('Audio recording started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop(): Float32Array {
    this.isRecording = false;
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Combine all chunks into one array
    const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }
    
    console.log('Audio recording stopped, total length:', combinedAudio.length);
    return combinedAudio;
  }

  getRecordingData(): Float32Array {
    const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combinedAudio;
  }

  clearChunks() {
    this.audioChunks = [];
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  // Convert Float32 to Int16 for API
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Convert to base64
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

// Helper function to split large audio into chunks for processing
export const chunkAudio = (audioData: Float32Array, chunkSizeInSeconds: number = 30): Float32Array[] => {
  const sampleRate = 24000; // 24kHz
  const chunkSizeInSamples = chunkSizeInSeconds * sampleRate;
  const chunks: Float32Array[] = [];
  
  for (let i = 0; i < audioData.length; i += chunkSizeInSamples) {
    const chunk = audioData.slice(i, Math.min(i + chunkSizeInSamples, audioData.length));
    chunks.push(chunk);
  }
  
  return chunks;
};