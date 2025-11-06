// Universal AudioRecorder using MediaRecorder API + OpenAI Whisper
// Works on ALL devices including Android Chrome
export class AudioRecorderWhisper {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private transcriptionInterval: NodeJS.Timeout | null = null;
  private fullTranscript = '';
  private isRecording = false;

  constructor(
    private onLiveTranscription: (transcription: string) => void,
    private supabaseUrl: string,
    private supabaseAnonKey: string
  ) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Use webm codec (universally supported)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      this.audioChunks = [];
      this.fullTranscript = '';
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(5000); // Collect data every 5 seconds

      // Send audio chunks for transcription every 10 seconds
      this.transcriptionInterval = setInterval(async () => {
        if (this.audioChunks.length > 0 && this.isRecording) {
          await this.transcribeChunks();
        }
      }, 10000);

      console.log('AudioRecorderWhisper started successfully');
    } catch (error) {
      console.error('Error starting recorder:', error);
      throw error;
    }
  }

  private async transcribeChunks() {
    if (this.audioChunks.length === 0) return;

    try {
      // Create blob from accumulated chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      // Convert to base64
      const base64Audio = await this.blobToBase64(audioBlob);

      // Send to edge function
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
          },
          body: JSON.stringify({ audio: base64Audio }),
        }
      );

      if (response.ok) {
        const { text } = await response.json();
        if (text) {
          this.fullTranscript += ' ' + text;
          this.onLiveTranscription(this.fullTranscript.trim());
        }
      }

      // Clear processed chunks
      this.audioChunks = [];
    } catch (error) {
      console.error('Transcription error:', error);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async stop(): Promise<string> {
    this.isRecording = false;

    // Clear interval
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
    }

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop audio stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Transcribe any remaining chunks
    if (this.audioChunks.length > 0) {
      await this.transcribeChunks();
    }

    console.log('AudioRecorderWhisper stopped');
    return this.fullTranscript.trim();
  }

  getRecordingData(): string {
    return this.fullTranscript.trim();
  }

  clearTranscript() {
    this.fullTranscript = '';
  }
}
