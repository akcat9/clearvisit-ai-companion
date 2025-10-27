import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, FileText } from 'lucide-react';
import { formatDuration } from '@/utils/formatters';

interface RecordingSectionProps {
  isRecording: boolean;
  recordingDuration: number;
  transcription: string;
  recordingComplete: boolean;
  manualNotes: string;
  isSavingNotes: boolean;
  isAnalyzing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAnalyze: () => void;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
}

export const RecordingSection = ({
  isRecording,
  recordingDuration,
  transcription,
  recordingComplete,
  manualNotes,
  isSavingNotes,
  isAnalyzing,
  onStartRecording,
  onStopRecording,
  onAnalyze,
  onNotesChange,
  onSaveNotes,
}: RecordingSectionProps) => {
  return (
    <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="flex flex-row items-center gap-2">
        <Mic className="w-5 h-5 text-green-700" />
        <CardTitle className="text-green-900">Record Visit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {!isRecording ? (
            <Button 
              onClick={onStartRecording}
              className="flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </Button>
          ) : (
            <Button 
              onClick={onStopRecording}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <MicOff className="w-4 h-4" />
              Stop Recording ({formatDuration(recordingDuration)})
            </Button>
          )}

          {(recordingComplete || transcription) && (
            <Button 
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          )}
        </div>

        {transcription && (
          <div className="bg-white border-2 border-green-200 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-green-800">Live Transcription:</h4>
            <div className="text-sm text-green-700 max-h-40 overflow-y-auto leading-relaxed">
              {transcription}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Manual Notes (Optional)</label>
          <Textarea
            placeholder="Add any additional notes about your visit..."
            value={manualNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[100px]"
          />
          <Button
            onClick={onSaveNotes}
            disabled={isSavingNotes || !manualNotes.trim()}
            variant="outline"
            size="sm"
          >
            {isSavingNotes ? 'Saving...' : 'Save Notes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
