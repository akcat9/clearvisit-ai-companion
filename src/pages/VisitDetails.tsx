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
import { RealtimeTranscription } from '@/utils/RealtimeTranscription';
import { formatTime } from "@/utils/timeUtils";


const VisitDetails = () => {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<RealtimeTranscription | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
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
  const transcriptionBufferRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;
    fetchAppointment();
    
    // Cleanup interval on unmount
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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

  // Debounced auto-save transcription to database (max once every 2 seconds)
  const debouncedAutoSave = (transcription: string) => {
    if (!id || !user?.id || !transcription.trim()) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 2 seconds of no new transcriptions
    saveTimeoutRef.current = setTimeout(async () => {
      const now = Date.now();
      
      // Also check if we've saved recently (throttle to once per 2 seconds minimum)
      if (now - lastSaveTimeRef.current < 2000) {
        return;
      }
      
      try {
        await supabase
          .from('visit_records')
          .upsert({
            appointment_id: id,
            user_id: user.id,
            transcription: transcription,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'appointment_id'
          });
        
        lastSaveTimeRef.current = now;
        console.log('✓ Auto-saved transcription');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000);
  };

  // Recording with OpenAI Realtime API (live transcription)
  const handleStartRecording = async () => {
    try {
      setLiveTranscription('');
      transcriptionBufferRef.current = '';
      setRecordingComplete(false);
      setIsPaused(false);
      
      const recorder = new RealtimeTranscription(
        (transcription) => {
          // Accumulate transcriptions in buffer
          transcriptionBufferRef.current = transcriptionBufferRef.current 
            ? transcriptionBufferRef.current + ' ' + transcription 
            : transcription;
          
          // Update UI immediately
          setLiveTranscription(transcriptionBufferRef.current);
          
          // Debounced save to database
          debouncedAutoSave(transcriptionBufferRef.current);
        },
        (error) => {
          toast({
            title: "Transcription Error",
            description: error,
            variant: "destructive",
          });
        }
      );
      
      await recorder.init();
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
        description: "Live transcription active - speak now.",
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Failed",
        description: "Could not start live transcription.",
        variant: "destructive",
      });
    }
  };

  const handlePauseRecording = () => {
    if (!audioRecorder) return;
    
    // Pause timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    audioRecorder.pause();
    setIsPaused(true);
    
    toast({
      title: "Recording Paused",
      description: "Transcription paused. Click Resume to continue.",
    });
  };

  const handleResumeRecording = () => {
    if (!audioRecorder) return;
    
    // Resume timer from current duration
    const startTime = Date.now() - (recordingDuration * 1000);
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingDuration(elapsed);
    }, 1000);
    
    audioRecorder.resume();
    setIsPaused(false);
    
    toast({
      title: "Recording Resumed",
      description: "Transcription active again.",
    });
  };

  const handleStopRecording = async () => {
    if (!audioRecorder) return;
    
    toast({
      title: "Finishing transcription...",
      description: "Waiting for any remaining audio to be transcribed.",
    });
    
    // Clear the duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Wait for pending transcriptions before disconnecting
    await audioRecorder.disconnect(true);
    setIsRecording(false);
    setRecordingComplete(true);
    setIsPaused(false);
    
    toast({
      title: "Recording Stopped",
      description: "Your live transcription is complete.",
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
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 w-full sm:w-auto text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold">Visit Details</h1>
        </div>

        {/* Appointment Info */}
        <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-blue-900 flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Appointment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:gap-3">
            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-blue-800">Doctor:</span> 
              <span className="text-blue-700">{appointment.doctorName}</span>
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-blue-800">Date & Time:</span> 
              <span className="text-blue-700">{appointment.date} at {formatTime(appointment.time)}</span>
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-blue-800">Reason:</span> 
              <span className="text-blue-700">{appointment.reason}</span>
            </div>
            {appointment.goal && (
              <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-blue-800">Goal:</span> 
                <span className="text-blue-700">{appointment.goal}</span>
              </div>
            )}
            {appointment.symptoms && (
              <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-blue-800">Symptoms:</span> 
                <span className="text-blue-700">{appointment.symptoms}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-Visit Education */}
        <div className="mb-4 sm:mb-6">
          <PreVisitEducation 
            appointmentId={appointment.id}
            appointmentReason={appointment.reason}
            goal={appointment.goal}
            symptoms={appointment.symptoms}
            cachedContent={appointment.education_content}
          />
        </div>

        {/* Recording Section */}
        <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center gap-2 pb-3 sm:pb-6">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
            <CardTitle className="text-green-900 text-base sm:text-lg">Record Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2 sm:gap-3">
              {!isRecording ? (
                <Button 
                  onClick={handleStartRecording}
                  className="flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  {!isPaused ? (
                    <Button 
                      onClick={handlePauseRecording}
                      variant="outline"
                      className="flex items-center justify-center gap-2 flex-1 text-sm sm:text-base min-h-[44px]"
                    >
                      <Mic className="w-4 h-4" />
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleResumeRecording}
                      variant="default"
                      className="flex items-center justify-center gap-2 flex-1 text-sm sm:text-base min-h-[44px]"
                    >
                      <Mic className="w-4 h-4" />
                      Resume
                    </Button>
                  )}
                  <Button 
                    onClick={handleStopRecording}
                    variant="destructive"
                    className="flex items-center justify-center gap-2 flex-1 text-sm sm:text-base min-h-[44px]"
                  >
                    <MicOff className="w-4 h-4" />
                    Stop ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
                  </Button>
                </div>
              )}

              {isRecording && (
                <div className="bg-yellow-50 border-2 border-yellow-300 p-2 sm:p-3 rounded-lg">
                  <p className="text-xs sm:text-sm text-yellow-800 font-medium">
                    ⚠️ You must stop recording before you can analyze with AI
                  </p>
                </div>
              )}

              {(recordingComplete || liveTranscription) && !isRecording && (
                <Button 
                  onClick={handleAnalyzeWithAI}
                  disabled={isAnalyzing}
                  className="flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                >
                  <FileText className="w-4 h-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                </Button>
              )}
            </div>

            {/* Live Transcription */}
            {liveTranscription && (
              <div className="bg-white border-2 border-green-200 p-3 sm:p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-green-800 text-sm sm:text-base">Live Transcription:</h4>
                <div className="text-xs sm:text-sm text-green-700 max-h-40 overflow-y-auto leading-relaxed">
                  {liveTranscription}
                </div>
              </div>
            )}

            {/* Manual Notes */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Manual Notes (Optional)</label>
              <Textarea
                placeholder="Add any additional notes about your visit..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="min-h-[100px] text-sm sm:text-base"
              />
              <Button
                onClick={handleSaveNotes}
                disabled={isSavingNotes || !manualNotes.trim()}
                variant="outline"
                size="sm"
                className="text-sm min-h-[40px]"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        {aiGeneratedData && (
          <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-purple-900 flex items-center gap-2 text-base sm:text-lg">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                AI Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {aiGeneratedData.visitSummary && (
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-purple-200">
                  <h4 className="font-semibold mb-2 sm:mb-3 text-purple-800 text-sm sm:text-base">Visit Summary</h4>
                  <p className="text-purple-700 leading-relaxed text-xs sm:text-sm">{aiGeneratedData.visitSummary}</p>
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