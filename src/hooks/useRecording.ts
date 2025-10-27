import { useState, useRef, useCallback } from 'react';
import { AudioRecorder } from '@/utils/AudioRecorder';
import { useToast } from '@/hooks/use-toast';

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      setTranscription('');
      setRecordingComplete(false);
      
      const recorder = new AudioRecorder((text) => {
        setTranscription(text);
      });
      
      await recorder.start();
      setAudioRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly - transcription appears in real-time.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Speech recognition not available or microphone permission denied.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (!audioRecorder) return;
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    const finalTranscript = audioRecorder.stop();
    setIsRecording(false);
    setRecordingComplete(true);
    setTranscription(finalTranscript);
    
    toast({
      title: "Recording Stopped",
      description: "Click 'Analyze with AI' to get medical insights.",
    });
  }, [audioRecorder, toast]);

  const resetRecording = useCallback(() => {
    setTranscription('');
    setRecordingComplete(false);
    setRecordingDuration(0);
  }, []);

  return {
    isRecording,
    recordingDuration,
    transcription,
    recordingComplete,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
