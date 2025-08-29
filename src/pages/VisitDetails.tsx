import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mic, MicOff, Play, Pause } from 'lucide-react';
import { AudioRecorder, encodeAudioForAPI, chunkAudio } from '@/utils/AudioRecorder';

const VisitDetails = () => {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [fullTranscription, setFullTranscription] = useState('');
  const [keySymptoms, setKeySymptoms] = useState<string[]>([]);
  const [doctorRecommendations, setDoctorRecommendations] = useState<string[]>([]);
  const [postVisitQuestions, setPostVisitQuestions] = useState<string[]>([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Load appointment details
    const appointments = JSON.parse(localStorage.getItem("appointments") || "[]");
    const foundAppointment = appointments.find((apt: any) => apt.id === id);
    
    if (foundAppointment) {
      setAppointment(foundAppointment);
      setVisitNotes(foundAppointment.visitNotes || "");
      setPrescriptions(foundAppointment.prescriptions || "");
      setFollowUpActions(foundAppointment.followUpActions || "");
      generateAIQuestions(foundAppointment);
    } else {
      toast({
        title: "Appointment not found",
        description: "The appointment you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [id, user, navigate, toast]);

  const generateAIQuestions = async (appointmentData: any) => {
    try {
      setIsProcessing(true);
      
      // Load medical profile for context
      const savedProfile = user ? localStorage.getItem(`clearvisit_profile_${user.id}`) : null;
      const profile = savedProfile ? JSON.parse(savedProfile) : {};

      const response = await supabase.functions.invoke('generate-ai-questions', {
        body: {
          appointmentReason: appointmentData.reason,
          medicalHistory: profile.conditions || "",
          medications: profile.medications || "",
          allergies: profile.allergies || ""
        }
      });

      if (response.data?.questions) {
        setAiQuestions(response.data.questions);
      } else {
        // Fallback questions if API fails
        const fallbackQuestions = [
          "Based on my medical history, what should I be monitoring?",
          "Are there any preventive measures I should take?",
          "When should I schedule my next follow-up appointment?"
        ];
        setAiQuestions(fallbackQuestions);
      }
    } catch (error) {
      console.error('Error generating AI questions:', error);
      // Fallback questions
      const fallbackQuestions = [
        "What specific symptoms should I watch for?",
        "Are there any lifestyle changes you recommend?",
        "What's the best way to manage my condition?"
      ];
      setAiQuestions(fallbackQuestions);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording visit conversation
  const handleStartRecording = async () => {
    try {
      const recorder = new AudioRecorder((audioData) => {
        // Real-time audio data processing if needed
        console.log('Receiving audio chunk:', audioData.length);
      });
      
      await recorder.start();
      setAudioRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration counter
      const startTime = Date.now();
      const durationInterval = setInterval(() => {
        if (!isRecording) {
          clearInterval(durationInterval);
          return;
        }
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Visit recording has begun. Speak clearly for best results.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop recording and process the conversation with chunked processing
  const handleStopRecording = async () => {
    if (!audioRecorder) return;
    
    setIsRecording(false);
    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentStep('Stopping recording...');
    
    try {
      // Get the complete audio data
      const audioData = audioRecorder.stop();
      console.log('Recording stopped, processing audio data:', audioData.length);
      
      setCurrentStep('Preparing audio for processing...');
      setProcessingProgress(10);
      
      // Split audio into chunks for processing (30-second chunks)
      const audioChunks = chunkAudio(audioData, 30);
      console.log(`Split audio into ${audioChunks.length} chunks`);
      
      setCurrentStep(`Transcribing audio (${audioChunks.length} chunks)...`);
      setProcessingProgress(20);
      
      // Process each chunk with Whisper API
      const transcriptions: string[] = [];
      for (let i = 0; i < audioChunks.length; i++) {
        const chunk = audioChunks[i];
        const encodedChunk = encodeAudioForAPI(chunk);
        
        setCurrentStep(`Transcribing chunk ${i + 1} of ${audioChunks.length}...`);
        setProcessingProgress(20 + (30 * i) / audioChunks.length);
        
        try {
          const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
            body: {
              audioData: encodedChunk,
              chunkIndex: i,
              totalChunks: audioChunks.length
            }
          });

          if (transcriptionError) {
            console.error(`Error transcribing chunk ${i}:`, transcriptionError);
            transcriptions.push(`[Transcription failed for segment ${i + 1}]`);
          } else {
            transcriptions.push(transcriptionData?.transcription || '');
          }
        } catch (chunkError) {
          console.error(`Error processing chunk ${i}:`, chunkError);
          transcriptions.push(`[Processing failed for segment ${i + 1}]`);
        }
      }
      
      // Combine all transcriptions
      const fullTranscript = transcriptions.filter(t => t && !t.includes('[Transcription failed')).join(' ');
      setFullTranscription(fullTranscript);
      
      setCurrentStep('Analyzing visit content...');
      setProcessingProgress(60);
      
      // Get medical history for context
      const medicalHistory = user ? localStorage.getItem(`clearvisit_profile_${user.id}`) : null;
      
      // Process the full transcription with enhanced AI analysis
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-visit-summary', {
        body: {
          fullTranscription: fullTranscript,
          appointmentReason: appointment?.reason || 'General consultation',
          medicalHistory: medicalHistory ? JSON.parse(medicalHistory) : null
        }
      });

      setProcessingProgress(90);

      if (summaryError) {
        console.error('Error processing visit summary:', summaryError);
        throw new Error(summaryError.message || 'Failed to process visit summary');
      }

      if (summaryData) {
        setVisitNotes(summaryData.visitSummary || '');
        setPrescriptions(summaryData.prescriptions || '');
        setFollowUpActions(summaryData.followUpActions || '');
        setKeySymptoms(summaryData.keySymptoms || []);
        setDoctorRecommendations(summaryData.doctorRecommendations || []);
        setPostVisitQuestions(summaryData.questionsForNextVisit || []);
        
        setCurrentStep('Complete!');
        setProcessingProgress(100);
        
        toast({
          title: "Recording Processed",
          description: "Your visit analysis is complete with personalized insights!",
        });
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setCurrentStep('');
    }
  };

  const handleSaveVisit = () => {
    // Mark appointment as completed and save notes
    const appointments = JSON.parse(localStorage.getItem("appointments") || "[]");
    const updatedAppointments = appointments.map((apt: any) => 
      apt.id === id ? { 
        ...apt, 
        status: 'completed', 
        visitNotes: appointment.visitNotes || visitNotes,
        prescriptions: appointment.prescriptions || prescriptions,
        followUpActions: appointment.followUpActions || followUpActions,
        completedAt: new Date().toISOString()
      } : apt
    );
    localStorage.setItem("appointments", JSON.stringify(updatedAppointments));

    toast({
      title: "Visit saved",
      description: "Your visit details have been saved to your medical records",
    });

    navigate("/dashboard");
  };

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading appointment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Visit Details</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Visit Info */}
            <Card>
              <CardHeader>
                <CardTitle>Visit Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">Doctor:</span> {appointment.doctorName}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {appointment.date}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {appointment.time}
                </div>
                <div>
                  <span className="font-medium">Reason for Visit:</span> {appointment.reason}
                </div>
                {appointment.goal && (
                  <div>
                    <span className="font-medium">Goal for Visit:</span> {appointment.goal}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI-Generated Questions */}
            {aiQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pre-Visit Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  {isProcessing ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Generating personalized questions...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiQuestions.map((question, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm font-medium text-blue-800">{question}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {postVisitQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Questions for Next Visit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {postVisitQuestions.map((question, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                        <p className="text-sm font-medium text-green-800">{question}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recording Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Visit Recording
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  {!isRecording ? (
                    <Button 
                      onClick={handleStartRecording}
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopRecording}
                      disabled={isProcessing}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <MicOff className="w-4 h-4" />
                      Stop Recording ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
                    </Button>
                  )}
                </div>
                
                {isRecording && (
                  <div className="text-sm text-muted-foreground">
                    🔴 Recording in progress... Speak clearly for best results.
                  </div>
                )}
                
                {isProcessing && (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      🤖 {currentStep}
                    </div>
                    <Progress value={processingProgress} className="w-full" />
                    <div className="text-xs text-muted-foreground">
                      {processingProgress}% complete
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Visit summary will appear here after processing the recording..."
                  rows={6}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {keySymptoms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Symptoms Discussed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {keySymptoms.map((symptom, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded border-l-4 border-red-400">
                        <p className="text-sm text-red-800">{symptom}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {doctorRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Doctor's Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {doctorRecommendations.map((recommendation, index) => (
                      <div key={index} className="p-2 bg-purple-50 rounded border-l-4 border-purple-400">
                        <p className="text-sm text-purple-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prescriptions & Medications */}
            <Card>
              <CardHeader>
                <CardTitle>Prescriptions & Medications</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Medications prescribed, dosage changes, or instructions will appear here..."
                  value={prescriptions}
                  onChange={(e) => setPrescriptions(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Follow-up Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Follow-up Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Recommended follow-up appointments, tests, or lifestyle changes..."
                  value={followUpActions}
                  onChange={(e) => setFollowUpActions(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Save Visit */}
            <Button 
              onClick={handleSaveVisit} 
              className="w-full"
              disabled={isProcessing}
            >
              Save Visit Notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitDetails;