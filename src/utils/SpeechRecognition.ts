// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export class RealTimeSpeechRecognition {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private transcript = '';

  constructor(
    private onTranscript: (transcript: string, isFinal: boolean) => void,
    private onError?: (error: string) => void
  ) {
    this.initializeRecognition();
  }

  private initializeRecognition() {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const error = 'Speech recognition not supported in this browser';
      console.error(error);
      this.onError?.(error);
      return;
    }

    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Handle results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
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

      // Update running transcript
      if (finalTranscript) {
        this.transcript += finalTranscript;
        this.onTranscript(this.transcript, true);
      }
      
      if (interimTranscript) {
        this.onTranscript(this.transcript + interimTranscript, false);
      }
    };

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.onError?.(event.error);
    };

    // Handle end event (restart to keep continuous)
    this.recognition.onend = () => {
      if (this.isListening) {
        try {
          this.recognition?.start();
        } catch (error) {
          console.log('Recognition restart failed, will retry...');
          setTimeout(() => {
            if (this.isListening) {
              try {
                this.recognition?.start();
              } catch (e) {
                console.error('Failed to restart recognition:', e);
              }
            }
          }, 1000);
        }
      }
    };
  }

  start() {
    if (!this.recognition) {
      this.onError?.('Speech recognition not available');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.isListening = true;
    this.transcript = '';
    
    try {
      this.recognition.start();
      console.log('Speech recognition started');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.onError?.('Failed to start speech recognition');
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) {
      return;
    }

    this.isListening = false;
    this.recognition.stop();
    console.log('Speech recognition stopped');
  }

  getTranscript(): string {
    return this.transcript;
  }

  clearTranscript() {
    this.transcript = '';
  }

  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }
}
