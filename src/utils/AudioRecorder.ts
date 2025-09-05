import { RealTimeSpeechRecognition } from './SpeechRecognition';

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;
  private readonly SAMPLE_RATE = 24000;
  private speechRecognition: RealTimeSpeechRecognition | null = null;

  constructor(
    private onAudioData: (audioData: Float32Array) => void,
    private onLiveTranscription?: (transcription: string, isFinal: boolean) => void
  ) {
    // Initialize speech recognition for real-time transcription
    if (this.onLiveTranscription && RealTimeSpeechRecognition.isSupported()) {
      this.speechRecognition = new RealTimeSpeechRecognition(
        this.onLiveTranscription,
        (error) => console.error('Speech recognition error:', error)
      );
    }
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: this.SAMPLE_RATE,
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
      
      // Start real-time speech recognition
      if (this.speechRecognition) {
        this.speechRecognition.start();
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }


  private combineChunks(chunks: Float32Array[]): Float32Array {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  stop(): Float32Array {
    this.isRecording = false;
    
    // Stop speech recognition
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
    
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
    const combinedAudio = this.combineChunks(this.audioChunks);
    return combinedAudio;
  }

  getRecordingData(): Float32Array {
    return this.combineChunks(this.audioChunks);
  }

  clearChunks() {
    this.audioChunks = [];
    if (this.speechRecognition) {
      this.speechRecognition.clearTranscript();
    }
  }

  getLiveTranscript(): string {
    return this.speechRecognition?.getTranscript() || '';
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  // Convert Float32 to Int16 PCM
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Create WAV file format
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = int16Array.length * 2;
  const fileSize = 36 + dataSize;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write PCM data
  for (let i = 0; i < int16Array.length; i++) {
    view.setInt16(44 + i * 2, int16Array[i], true);
  }
  
  // Convert to base64
  const uint8Array = new Uint8Array(buffer);
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