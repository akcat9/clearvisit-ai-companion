import { supabase } from "@/integrations/supabase/client";

// Detect if we're on Android
const isAndroid = /Android/i.test(navigator.userAgent);

// Get optimal audio constraints for the device
const getAudioConstraints = () => {
  const baseConstraints = {
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  };

  // Android-specific optimizations
  if (isAndroid) {
    return {
      audio: {
        ...baseConstraints.audio,
        sampleRate: { ideal: 24000 },
        latency: 0,
        // Android Chrome works better without strict constraints
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
      }
    };
  }

  return {
    audio: {
      ...baseConstraints.audio,
      sampleRate: 24000,
    }
  };
};

export class RealtimeTranscription {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioStream: MediaStream | null = null;
  private isConnected = false;
  private processedItems = new Set<string>();
  private processedTranscripts = new Set<string>();
  private lastTranscriptTime = 0;
  private isPaused = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private isRateLimited = false;

  constructor(
    private onTranscript: (text: string) => void,
    private onError: (error: string) => void,
    private onStatusChange?: (status: string) => void
  ) {}

  async init() {
    try {
      this.connectionAttempts++;
      console.log(`[${isAndroid ? 'Android' : 'Desktop'}] Initializing transcription (attempt ${this.connectionAttempts})...`);
      this.onStatusChange?.(this.connectionAttempts === 1 ? 'Connecting...' : `Connecting... (attempt ${this.connectionAttempts} of ${this.maxConnectionAttempts})`);
      
      // Get ephemeral token
      console.log('Getting ephemeral token...');
      const { data, error } = await supabase.functions.invoke('realtime-token');
      
      if (error) {
        // Check for rate limit error
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          this.isRateLimited = true;
          throw new Error('Too many attempts. Please wait 1 minute before trying again.');
        }
        throw error;
      }
      
      if (!data.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('✓ Got ephemeral token');

      // Request microphone permission with device-specific constraints
      console.log('Requesting microphone access...');
      const constraints = getAudioConstraints();
      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✓ Microphone access granted');

      // Create peer connection with TURN servers for better Android compatibility
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Log connection state changes
      this.pc.onconnectionstatechange = () => {
        console.log('Connection state:', this.pc?.connectionState);
        if (this.pc?.connectionState === 'failed') {
          this.onError('Connection failed. Please try again.');
        }
      };

      // Add local audio track
      const audioTrack = this.audioStream.getAudioTracks()[0];
      console.log('Audio track settings:', audioTrack.getSettings());
      this.pc.addTrack(audioTrack, this.audioStream);

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('✓ Data channel opened');
        this.isConnected = true;
        
        // Android-specific: wait a bit before sending session config
        const configDelay = isAndroid ? 1000 : 100;
        
        setTimeout(() => {
          // Send session update to enable transcription only (no audio response)
          this.sendEvent({
            type: "session.update",
            session: {
              modalities: ["text"],
              instructions: "You are a medical transcription service. Transcribe everything the user says accurately, including medical terminology. Do not respond or generate any output, only transcribe.",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: isAndroid ? 0.6 : 0.5, // Slightly higher threshold for Android to reduce false positives
                prefix_padding_ms: 300,
                silence_duration_ms: isAndroid ? 500 : 200 // Longer silence detection for Android
              }
            }
          });
          console.log('✓ Session configuration sent');
        }, configDelay);
      });
      
      this.dc.addEventListener("error", (error) => {
        console.error('Data channel error:', error);
        this.onError('Connection error occurred');
      });

      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          
          // Only log important events to reduce console spam
          if (event.type === 'error' || event.type.includes('transcription')) {
            console.log(`[${event.type}]`, event);
          }
          
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            const itemId = event.item_id;
            const transcript = event.transcript?.trim() || '';
            const currentTime = Date.now();
            
            // Skip if paused
            if (this.isPaused) {
              console.log('⏸ Skipping transcript - paused:', itemId);
              return;
            }
            
            // Skip if empty
            if (!transcript) {
              return;
            }
            
            // Create unique keys for deduplication
            const transcriptHash = transcript.toLowerCase().slice(-50);
            const uniqueKey = `${itemId}_${transcriptHash}`;
            
            // Skip if we've seen this exact transcript recently (within 3 seconds for Android, 2 for others)
            const duplicateWindow = isAndroid ? 3000 : 2000;
            if (this.processedTranscripts.has(uniqueKey) && (currentTime - this.lastTranscriptTime) < duplicateWindow) {
              console.log('⏭ Skipping duplicate:', transcript.slice(0, 30) + '...');
              return;
            }
            
            // Skip if we've seen this item_id already
            if (this.processedItems.has(itemId)) {
              return;
            }
            
            // Mark as processed
            this.processedItems.add(itemId);
            this.processedTranscripts.add(uniqueKey);
            this.lastTranscriptTime = currentTime;
            
            // Clean up old transcripts (keep only last 50 for Android, 100 for others)
            const maxCache = isAndroid ? 50 : 100;
            if (this.processedTranscripts.size > maxCache) {
              const firstKey = this.processedTranscripts.values().next().value;
              this.processedTranscripts.delete(firstKey);
            }
            
            console.log('✓ Transcription:', transcript);
            this.onTranscript(transcript);
          } else if (event.type === 'error') {
            console.error('❌ OpenAI error:', event.error);
            this.onError(event.error?.message || 'Transcription error');
          }
        } catch (err) {
          console.error('❌ Error parsing message:', err);
        }
      });

      // Create and set local description
      console.log('Creating offer...');
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: false, // We only send audio, don't receive
        offerToReceiveVideo: false
      });
      await this.pc.setLocalDescription(offer);
      console.log('✓ Offer created');

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
        const errorText = await sdpResponse.text();
        console.error('OpenAI API error:', sdpResponse.status, errorText);
        throw new Error(`OpenAI connection failed: ${sdpResponse.status}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log(`✓ WebRTC connection established (${isAndroid ? 'Android' : 'Desktop'} mode)`);

    } catch (error) {
      console.error("❌ Error initializing transcription:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
      
      // Don't retry if rate limited
      if (this.isRateLimited) {
        this.onError(errorMessage);
        this.onStatusChange?.('Rate limited');
        throw error;
      }
      
      // Provide more helpful error messages
      if (errorMessage.includes('permission')) {
        this.onError('Microphone permission denied. Please enable microphone access in your browser settings.');
        this.onStatusChange?.('Permission denied');
      } else if (this.connectionAttempts < this.maxConnectionAttempts) {
        this.onError('Connection failed. Retrying...');
        this.onStatusChange?.(`Retrying... (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, this.connectionAttempts - 1) * 1000;
        console.log(`Waiting ${backoffDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.init();
      } else {
        this.onError(errorMessage);
        this.onStatusChange?.('Connection failed');
      }
      throw error;
    }
  }

  private sendEvent(event: any) {
    if (this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  }

  pause() {
    console.log('⏸ Pausing transcription');
    this.isPaused = true;
  }

  resume() {
    console.log('▶ Resuming transcription');
    this.isPaused = false;
  }

  async disconnect(waitForPendingTranscripts = false) {
    console.log('Disconnecting transcription...');
    
    // Wait for any pending transcriptions to complete (longer on Android)
    if (waitForPendingTranscripts) {
      const waitTime = isAndroid ? 3000 : 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Stop audio tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
        console.log('✓ Audio track stopped');
      });
      this.audioStream = null;
    }
    
    // Close connections
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    // Reset state
    this.isConnected = false;
    this.isPaused = false;
    this.connectionAttempts = 0;
    this.isRateLimited = false;
    this.processedItems.clear();
    this.processedTranscripts.clear();
    this.lastTranscriptTime = 0;
    
    console.log('✓ Disconnected');
  }

  isActive(): boolean {
    return this.isConnected && !this.isPaused;
  }

  getPausedState(): boolean {
    return this.isPaused;
  }
}
