import { supabase } from "@/integrations/supabase/client";

export class AudioRecorderGoogleCloud {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onTranscriptionUpdate: (text: string) => void;
  private stream: MediaStream | null = null;

  constructor(onTranscriptionUpdate: (text: string) => void) {
    this.onTranscriptionUpdate = onTranscriptionUpdate;
  }

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.sendChunkForTranscription(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Capture chunks every 1 second
      console.log('Recording started with Google Cloud streaming');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  private async sendChunkForTranscription(audioBlob: Blob) {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      const { data, error } = await supabase.functions.invoke('stream-transcription', {
        body: { audio: base64Audio }
      });

      if (error) {
        console.error('Transcription error:', error);
        return;
      }

      if (data?.text) {
        this.onTranscriptionUpdate(data.text);
      }
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          // Stop all tracks
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
          }
          
          resolve('Recording stopped');
        };

        this.mediaRecorder.stop();
      } else {
        resolve('No active recording');
      }
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}
