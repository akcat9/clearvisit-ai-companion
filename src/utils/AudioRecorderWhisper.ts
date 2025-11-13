// Universal AudioRecorder using MediaRecorder API + OpenAI Whisper
// Works on ALL devices including Android Chrome and iOS PWAs
export class AudioRecorderWhisper {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;

  constructor(
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
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Collect audio data continuously - we'll transcribe only when stopped
      this.mediaRecorder.start();

      console.log('AudioRecorderWhisper started successfully');
    } catch (error) {
      console.error('Error starting recorder:', error);
      throw error;
    }
  }

  private async transcribeAudio(): Promise<string> {
    if (this.audioChunks.length === 0) return '';

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
        return text || '';
      } else {
        console.error('Transcription API error:', response.status);
        return '';
      }
    } catch (error) {
      console.error('Transcription error:', error);
      return '';
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

    // Stop media recorder and wait for final data
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = async () => {
          // Stop audio stream
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }

          // Now transcribe the complete recording
          console.log('AudioRecorderWhisper stopped, transcribing...');
          const transcript = await this.transcribeAudio();
          
          // Clear chunks after transcription
          this.audioChunks = [];
          
          resolve(transcript);
        };
        
        this.mediaRecorder.stop();
      } else {
        resolve('');
      }
    });
  }
}
