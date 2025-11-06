import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mic, MicOff, FileText, BookOpen, AlertCircle } from 'lucide-react';
import ShareVisitModal from '@/components/ShareVisitModal';
import PreVisitEducation from '@/components/PreVisitEducation';
import { AudioRecorderWhisper } from '@/utils/AudioRecorderWhisper';
import { formatTime } from "@/utils/timeUtils";


const VisitDetails = () => {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorderWhisper | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [recordingComplete, setRecordingComplete] = useState(false);
  
  // AI-generated content (only shown after processing)
  const [aiGeneratedData, setAiGeneratedData] = useState<{
    visitSummary: string;
    prescriptions: string;
    followUpActions: string;
    keySymptoms: string[];
    doctorRecommendations: string[];
    questionsForDoctor: string[];
    keyTermsExplained?: Record<string, string>;
  } | null>(null);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAppointment();
    
    // Cleanup interval on unmount
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [id, user]);

  const fetchAppointment = async () => {
    try {
      if (!id || !user?.id) {
        navigate("/dashboard");
        return;
      }
      const { data: supabaseAppointment, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && supabaseAppointment) {
        setAppointment({
          id: supabaseAppointment.id,
          doctorName: supabaseAppointment.doctor_name,
          date: supabaseAppointment.date,
          time: supabaseAppointment.time,
          reason: supabaseAppointment.reason,
          goal: supabaseAppointment.goal,
          symptoms: supabaseAppointment.symptoms,
          status: supabaseAppointment.status,
        });
        
        // Load visit record if exists
        const { data: visitRecord } = await supabase
          .from('visit_records')
          .select('*')
          .eq('appointment_id', id)
          .single();

        if (visitRecord) {
          if (visitRecord.summary) {
            setAiGeneratedData(visitRecord.summary as any);
          }
          if (visitRecord.transcription) {
            setLiveTranscription(visitRecord.transcription);
          }
        }
        return;
      }

      toast({
        title: "Appointment not found",
        description: "The appointment you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error loading appointment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Recording with OpenAI Whisper (works on all devices including Android)
  const handleStartRecording = async () => {
    try {
      setLiveTranscription('');
      setRecordingComplete(false);
      
      const recorder = new AudioRecorderWhisper(
        (transcription) => {
          setLiveTranscription(transcription);
        },
        'https://hjupkurtumzqrwoytjnn.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdXBrdXJ0dW16cXJ3b3l0am5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjI2MDQsImV4cCI6MjA3MTk5ODYwNH0.d5LNBkCAZY1ceV9LoMuMR5-cx_J9iZ4VwC1hJ9b30bI'
      );
      
      await recorder.start();
      setAudioRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Clear any existing interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      
      // Start duration counter
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly - AI transcription in progress (works on Android!).",
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Failed",
        description: "Microphone access denied or not available.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    if (!audioRecorder) return;
    
    // Clear the duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    const finalTranscript = await audioRecorder.stop();
    setIsRecording(false);
    setRecordingComplete(true);
    
    // Set final transcription
    setLiveTranscription(finalTranscript);
    
    toast({
      title: "Recording Stopped",
      description: "Click 'Analyze with AI' to get medical insights.",
    });
  };

  // AI analysis function
  const handleAnalyzeWithAI = async () => {
    const contentToAnalyze = liveTranscription.trim() || manualNotes.trim();
    
    if (!contentToAnalyze) {
      toast({
        title: "No Content",
        description: "Please record something or add notes before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-visit-summary', {
        body: {
          fullTranscription: contentToAnalyze,
          appointmentReason: appointment?.reason || 'General consultation',
          medicalHistory: null
        }
      });

      if (summaryError || !summaryData) {
        toast({
          title: "AI Analysis Failed",
          description: "Unable to analyze visit. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const aiData = {
        visitSummary: summaryData.visitSummary || '',
        prescriptions: summaryData.prescriptions || '',
        followUpActions: summaryData.followUpActions || '',
        keySymptoms: summaryData.keySymptoms || [],
        doctorRecommendations: summaryData.doctorRecommendations || [],
        questionsForDoctor: summaryData.questionsForDoctor || [],
        keyTermsExplained: summaryData.keyTermsExplained || {}
      };
      
      setAiGeneratedData(aiData);
      
      // Save to database
      try {
        const visitData = {
          appointment_id: id,
          user_id: user?.id,
          transcription: contentToAnalyze,
          summary: aiData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: saveError } = await supabase
          .from('visit_records')
          .upsert(visitData, { 
            onConflict: 'appointment_id'
          });

        if (saveError) {
          toast({
            title: "Warning",
            description: "Analysis complete but save failed.",
            variant: "default",
          });
          return;
        }

        // Update appointment status
        await supabase
          .from('appointments')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        toast({
          title: "AI Analysis Complete",
          description: "Your visit has been analyzed and saved.",
        });
      } catch (saveError) {
        toast({
          title: "Save Warning",
          description: "Analysis complete but save failed.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "AI Analysis Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const visitData = {
        appointment_id: id,
        user_id: user?.id,
        transcription: manualNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('visit_records')
        .upsert(visitData, { onConflict: 'appointment_id' });

      if (error) throw error;

      toast({
        title: "Notes Saved",
        description: "Your notes have been saved.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (!appointment) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Visit Details</h1>
        </div>

        {/* Appointment Info */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Appointment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="font-semibold text-blue-800">Doctor:</span> 
              <span className="text-blue-700">{appointment.doctorName}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="font-semibold text-blue-800">Date & Time:</span> 
              <span className="text-blue-700">{appointment.date} at {formatTime(appointment.time)}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="font-semibold text-blue-800">Reason:</span> 
              <span className="text-blue-700">{appointment.reason}</span>
            </div>
            {appointment.goal && (
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="font-semibold text-blue-800">Goal:</span> 
                <span className="text-blue-700">{appointment.goal}</span>
              </div>
            )}
            {appointment.symptoms && (
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="font-semibold text-blue-800">Symptoms:</span> 
                <span className="text-blue-700">{appointment.symptoms}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-Visit Education */}
        <div className="mb-6">
          <PreVisitEducation 
            appointmentReason={appointment.reason}
            goal={appointment.goal}
            symptoms={appointment.symptoms}
          />
        </div>

        {/* Recording Section */}
        <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center gap-2">
            <Mic className="w-5 h-5 text-green-700" />
            <CardTitle className="text-green-900">Record Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              {!isRecording ? (
                <Button 
                  onClick={handleStartRecording}
                  className="flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </Button>
              ) : (
                <Button 
                  onClick={handleStopRecording}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <MicOff className="w-4 h-4" />
                  Stop Recording ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
                </Button>
              )}

              {(recordingComplete || liveTranscription) && (
                <Button 
                  onClick={handleAnalyzeWithAI}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                </Button>
              )}
            </div>

            {/* Live Transcription */}
            {liveTranscription && (
              <div className="bg-white border-2 border-green-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-green-800">Live Transcription:</h4>
                <div className="text-sm text-green-700 max-h-40 overflow-y-auto leading-relaxed">
                  {liveTranscription}
                </div>
              </div>
            )}

            {/* Manual Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Manual Notes (Optional)</label>
              <Textarea
                placeholder="Add any additional notes about your visit..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleSaveNotes}
                disabled={isSavingNotes || !manualNotes.trim()}
                variant="outline"
                size="sm"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        {aiGeneratedData && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                AI Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {aiGeneratedData.visitSummary && (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold mb-3 text-purple-800 text-base">Visit Summary</h4>
                  <p className="text-purple-700 leading-relaxed text-sm">{aiGeneratedData.visitSummary}</p>
                </div>
              )}

              {aiGeneratedData.keySymptoms?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <h4 className="font-semibold mb-3 text-red-800 text-base">Key Symptoms</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {aiGeneratedData.keySymptoms.map((symptom, index) => (
                      <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-100">
                        <span className="text-red-700 text-sm">{symptom}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiGeneratedData.keyTermsExplained && Object.keys(aiGeneratedData.keyTermsExplained).length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-800 text-base">Medical Terms Explained</h4>
                  <div className="space-y-3">
                    {Object.entries(aiGeneratedData.keyTermsExplained).map(([term, explanation], index) => (
                      <div key={index} className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <span className="font-medium text-blue-800 text-sm">{term}:</span>
                        <p className="text-blue-700 mt-1 text-sm">{explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiGeneratedData.prescriptions && (
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <h4 className="font-semibold mb-3 text-orange-800 text-base">Prescriptions & Medications</h4>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <p className="text-orange-700 text-sm">{aiGeneratedData.prescriptions}</p>
                  </div>
                </div>
              )}

              {aiGeneratedData.doctorRecommendations?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold mb-3 text-green-800 text-base">Doctor's Recommendations</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {aiGeneratedData.doctorRecommendations.map((rec, index) => (
                      <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <span className="text-green-700 text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiGeneratedData.followUpActions && (
                <div className="bg-white rounded-lg p-4 border border-yellow-200">
                  <h4 className="font-semibold mb-3 text-yellow-800 text-base">Follow-Up Actions</h4>
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <p className="text-yellow-700 text-sm">{aiGeneratedData.followUpActions}</p>
                  </div>
                </div>
              )}

              {aiGeneratedData.questionsForDoctor?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold mb-3 text-indigo-800 text-base">Smart Questions</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {aiGeneratedData.questionsForDoctor.map((question, index) => (
                      <div key={index} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <span className="text-indigo-700 text-sm">{question}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Share Visit */}
        {aiGeneratedData && (
          <Card>
            <CardHeader>
              <CardTitle>Share Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <ShareVisitModal 
                visitSummary={aiGeneratedData}
                appointmentData={{
                  doctor_name: appointment.doctorName,
                  date: appointment.date,
                  time: appointment.time,
                  reason: appointment.reason,
                  goal: appointment.goal
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VisitDetails;