// Simple AudioRecorder using browser's SpeechRecognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class AudioRecorder {
  private recognition: any = null;
  private isRecording = false;
  private fullTranscript = '';

  constructor(
    private onLiveTranscription: (transcription: string) => void
  ) {}

  async start() {
    try {
      // Check if SpeechRecognition is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser');
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isRecording = true;
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update full transcript with final results
        if (finalTranscript) {
          this.fullTranscript += finalTranscript;
        }

        // Send live updates (final + interim)
        const currentText = this.fullTranscript + interimTranscript;
        this.onLiveTranscription(currentText.trim());
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          return;
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if still recording (unless manually stopped)
        if (this.isRecording && this.recognition) {
          this.recognition.start();
        }
      };

      this.recognition.start();
    } catch (error) {
      throw error;
    }
  }

  stop(): string {
    this.isRecording = false;
    
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    return this.fullTranscript.trim();
  }

  getRecordingData(): string {
    return this.fullTranscript.trim();
  }

  clearTranscript() {
    this.fullTranscript = '';
  }
}