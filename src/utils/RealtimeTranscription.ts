import { supabase } from "@/integrations/supabase/client";

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

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
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
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
  }
}

export class RealtimeTranscription {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private recorder: AudioRecorder | null = null;
  private isConnected = false;
  private processedItems = new Set<string>();

  constructor(
    private onTranscript: (text: string) => void,
    private onError: (error: string) => void,
    private onSpeaking?: (isSpeaking: boolean) => void
  ) {}

  async init() {
    try {
      console.log('Getting ephemeral token...');
      const { data, error } = await supabase.functions.invoke('realtime-token');
      
      if (error) throw error;
      
      if (!data.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('Got ephemeral token, creating peer connection...');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('Data channel opened');
        this.isConnected = true;
        
        // Send session update to enable transcription only (no audio response)
        this.sendEvent({
          type: "session.update",
          session: {
            modalities: ["text"],
            instructions: "You are a transcription service. Only transcribe what the user says, do not respond or generate any output.",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            }
          }
        });
      });

      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log("Received event:", event.type, event);
          
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            const itemId = event.item_id;
            
            // Skip if we've already processed this item
            if (this.processedItems.has(itemId)) {
              console.log('Skipping duplicate transcript for item:', itemId);
              return;
            }
            
            this.processedItems.add(itemId);
            console.log('New transcription for item', itemId, ':', event.transcript);
            this.onTranscript(event.transcript);
          } else if (event.type === 'input_audio_buffer.speech_started') {
            this.onSpeaking?.(true);
          } else if (event.type === 'input_audio_buffer.speech_stopped') {
            this.onSpeaking?.(false);
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      console.log('Connecting to OpenAI Realtime API...');
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI connection failed: ${sdpResponse.status}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");

    } catch (error) {
      console.error("Error initializing transcription:", error);
      this.onError(error instanceof Error ? error.message : 'Failed to initialize');
      throw error;
    }
  }

  private sendEvent(event: any) {
    if (this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  }

  disconnect() {
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    this.isConnected = false;
    this.processedItems.clear();
  }

  isActive(): boolean {
    return this.isConnected;
  }
}
