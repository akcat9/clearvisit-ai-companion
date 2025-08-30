import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Play, Pause, Square } from 'lucide-react';
import { useMobileFeatures } from '@/hooks/useMobileFeatures';
import { ImpactStyle } from '@capacitor/haptics';

interface MobileRecordingInterfaceProps {
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAnalyzeWithAI: () => void;
  isAnalyzing: boolean;
  recordingComplete: boolean;
  liveTranscription: string;
}

export const MobileRecordingInterface = ({
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onAnalyzeWithAI,
  isAnalyzing,
  recordingComplete,
  liveTranscription
}: MobileRecordingInterfaceProps) => {
  const { triggerHaptic } = useMobileFeatures();
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Simulate audio waveform for visual feedback
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setWaveformData(prev => {
          const newData = [...prev, Math.random() * 100];
          return newData.slice(-20); // Keep last 20 data points
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const handleStartRecording = async () => {
    await triggerHaptic(ImpactStyle.Medium);
    onStartRecording();
  };

  const handleStopRecording = async () => {
    await triggerHaptic(ImpactStyle.Heavy);
    onStopRecording();
  };

  const handleAnalyze = async () => {
    await triggerHaptic(ImpactStyle.Light);
    onAnalyzeWithAI();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="sticky bottom-20 md:bottom-0 mx-4 md:mx-0 shadow-lg">
      <CardContent className="p-6">
        {/* Recording Button */}
        <div className="flex flex-col items-center space-y-4">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              disabled={isAnalyzing}
              size="lg"
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
            >
              <Mic className="w-8 h-8" />
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
              size="lg"
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse"
            >
              <Square className="w-8 h-8" />
            </Button>
          )}

          {/* Recording Status */}
          {isRecording && (
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-red-600">
                {formatDuration(recordingDuration)}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Recording...
              </div>
            </div>
          )}

          {/* Audio Waveform Visualization */}
          {isRecording && (
            <div className="flex items-center justify-center gap-1 h-12">
              {waveformData.map((height, index) => (
                <div
                  key={index}
                  className="w-1 bg-primary rounded-full transition-all duration-100"
                  style={{ height: `${Math.max(4, height * 0.4)}px` }}
                />
              ))}
            </div>
          )}

          {/* Live Transcription */}
          {isRecording && liveTranscription && (
            <div className="w-full p-3 bg-blue-50 rounded-lg border max-h-24 overflow-y-auto">
              <div className="text-xs font-medium text-blue-700 mb-1">Live Transcription:</div>
              <div className="text-sm text-blue-800">
                {liveTranscription}
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {recordingComplete && !isAnalyzing && (
            <Button
              onClick={handleAnalyze}
              className="w-full"
              size="lg"
            >
              Analyze with AI
            </Button>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <div className="w-full text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Analyzing your visit...</p>
              <Progress value={33} className="w-full mt-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};