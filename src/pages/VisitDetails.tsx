import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mic, MicOff, FileText, BookOpen } from 'lucide-react';
import ShareVisitModal from '@/components/ShareVisitModal';
import { AudioRecorder } from '@/utils/AudioRecorder';

const VisitDetails = () => {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [educationalContent, setEducationalContent] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
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
  } | null>(null);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAppointment();
  }, [id, user, navigate, toast]);

  useEffect(() => {
    if (appointment?.reason) {
      loadEducationalContent();
    }
  }, [appointment]);

  const loadEducationalContent = async () => {
    if (!appointment?.reason) return;
    
    try {
      console.log('Loading educational content for:', appointment.reason);
      const { data, error } = await supabase.functions.invoke('generate-educational-content', {
        body: { 
          reason: appointment.reason,
          symptoms: appointment.symptoms,
          goal: appointment.goal
        }
      });

      if (error) {
        console.error('Error generating educational content:', error);
        setEducationalContent('Unable to load educational content. Please try again.');
        return;
      }

      if (data?.content) {
        setEducationalContent(data.content);
      } else {
        setEducationalContent('Educational content will be available after AI analysis.');
      }
    } catch (error) {
      console.error('Error loading educational content:', error);
      setEducationalContent('Unable to load educational content. Please try again.');
    }
  };

  const fetchAppointment = async () => {
    try {
      if (!id || !user?.id) {
        console.error('Missing required data for appointment fetch');
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

      // Fallback to localStorage for migration period
      const appointments = JSON.parse(localStorage.getItem("appointments") || "[]");
      const foundAppointment = appointments.find((apt: any) => apt.id === id);
      
      if (foundAppointment) {
        setAppointment(foundAppointment);
        setManualNotes(foundAppointment.manualNotes || "");
        if (foundAppointment.aiGeneratedData) {
          setAiGeneratedData(foundAppointment.aiGeneratedData);
        }
      } else {
        toast({
          title: "Appointment not found",
          description: "The appointment you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast({
        title: "Error loading appointment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Simple recording with instant speech recognition
  const handleStartRecording = async () => {
    try {
      setLiveTranscription('');
      setRecordingComplete(false);
      
      const recorder = new AudioRecorder(
        (transcription) => {
          setLiveTranscription(transcription);
        }
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
        description: "Speak clearly - transcription appears in real-time.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Speech recognition not available in this browser or microphone permission denied.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    if (!audioRecorder) return;
    
    // Clear the duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    const finalTranscript = audioRecorder.stop();
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
      console.log('Starting AI analysis...');
      const medicalHistory = user ? localStorage.getItem(`clearvisit_profile_${user.id}`) : null;
      
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-visit-summary', {
        body: {
          fullTranscription: contentToAnalyze,
          appointmentReason: appointment?.reason || 'General consultation',
          medicalHistory: medicalHistory ? JSON.parse(medicalHistory) : null
        }
      });

      if (summaryError) {
        console.error('AI analysis error:', summaryError);
        throw new Error(`AI analysis failed: ${summaryError.message}`);
      }

      if (summaryData) {
        const aiData = {
          visitSummary: summaryData.visitSummary || '',
          prescriptions: summaryData.prescriptions || '',
          followUpActions: summaryData.followUpActions || '',
          keySymptoms: summaryData.keySymptoms || [],
          doctorRecommendations: summaryData.doctorRecommendations || [],
          questionsForDoctor: summaryData.questionsForDoctor || []
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

          await supabase
            .from('visit_records')
            .upsert(visitData, { 
              onConflict: 'appointment_id'
            });

          // Update appointment status to completed
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
          console.error('Error saving visit data:', saveError);
        }
      } else {
        throw new Error('No analysis data received');
      }
    } catch (error) {
      console.error('AI Analysis failed:', error);
      toast({
        title: "AI Analysis Failed",
        description: "Please try again or contact support if the problem persists.",
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
        description: "Your notes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Save Failed",
        description: "Could not save notes. Please try again.",
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Visit Details</h1>
        </div>

        {/* Appointment Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Appointment Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div><strong>Doctor:</strong> {appointment.doctorName}</div>
            <div><strong>Date & Time:</strong> {appointment.date} at {appointment.time}</div>
            <div><strong>Reason:</strong> {appointment.reason}</div>
            {appointment.goal && <div><strong>Goal:</strong> {appointment.goal}</div>}
            {appointment.symptoms && <div><strong>Symptoms:</strong> {appointment.symptoms}</div>}
          </CardContent>
        </Card>

        {/* Educational Content */}
        {educationalContent && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <CardTitle>About Your Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-gray-700">{educationalContent}</div>
            </CardContent>
          </Card>
        )}

        {/* Recording Section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-2">
            <Mic className="w-5 h-5" />
            <CardTitle>Record Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
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
              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Live Transcription:</h4>
                <div className="text-sm text-gray-700 max-h-40 overflow-y-auto">
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>AI Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {aiGeneratedData.visitSummary && (
                <div>
                  <h4 className="font-semibold mb-2">Visit Summary</h4>
                  <p className="text-gray-700">{aiGeneratedData.visitSummary}</p>
                </div>
              )}

              {aiGeneratedData.keySymptoms?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Key Symptoms</h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {aiGeneratedData.keySymptoms.map((symptom, index) => (
                      <li key={index}>{symptom}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiGeneratedData.prescriptions && (
                <div>
                  <h4 className="font-semibold mb-2">Prescriptions & Medications</h4>
                  <p className="text-gray-700">{aiGeneratedData.prescriptions}</p>
                </div>
              )}

              {aiGeneratedData.doctorRecommendations?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Doctor's Recommendations</h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {aiGeneratedData.doctorRecommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiGeneratedData.followUpActions && (
                <div>
                  <h4 className="font-semibold mb-2">Follow-Up Actions</h4>
                  <p className="text-gray-700">{aiGeneratedData.followUpActions}</p>
                </div>
              )}

              {aiGeneratedData.questionsForDoctor?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Questions for Next Visit</h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {aiGeneratedData.questionsForDoctor.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
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