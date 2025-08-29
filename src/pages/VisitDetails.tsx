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

const getEducationalContent = (reason: string): string => {
  const content: { [key: string]: string } = {
    'headache': 'Headaches can be caused by tension, migraines, dehydration, or underlying conditions. Your doctor will assess the type, frequency, and triggers to determine the best treatment approach.',
    'fever': 'Fever is your body\'s natural response to infection. It\'s important to monitor your temperature and stay hydrated. Seek immediate care if fever exceeds 103°F or is accompanied by severe symptoms.',
    'chest pain': 'Chest pain can have various causes from muscle strain to heart conditions. Never ignore chest pain - your doctor will perform tests to determine the cause and appropriate treatment.',
    'fatigue': 'Chronic fatigue can result from sleep disorders, stress, medical conditions, or lifestyle factors. Your doctor will help identify underlying causes and develop a treatment plan.',
    'anxiety': 'Anxiety is a treatable condition that affects millions. Your doctor can discuss therapy options, lifestyle changes, and medications that can help manage symptoms effectively.',
    'depression': 'Depression is a serious but treatable mental health condition. Your doctor can help you understand treatment options including therapy, medication, and lifestyle modifications.',
    'back pain': 'Back pain is very common and often resolves with proper treatment. Your doctor will assess the cause and recommend appropriate treatments ranging from physical therapy to medication.',
    'diabetes': 'Diabetes management involves monitoring blood sugar, medication, diet, and exercise. Regular check-ups help prevent complications and maintain optimal health.',
    'hypertension': 'High blood pressure often has no symptoms but increases risk of heart disease and stroke. Regular monitoring and treatment can effectively control blood pressure.',
    'cold symptoms': 'Common colds are viral infections that typically resolve in 7-10 days. Your doctor can help distinguish between cold, flu, or other respiratory conditions.',
  };
  
  const lowerReason = reason.toLowerCase();
  for (const [condition, info] of Object.entries(content)) {
    if (lowerReason.includes(condition)) {
      return info;
    }
  }
  
  return 'Your doctor will conduct a thorough evaluation to understand your symptoms and provide appropriate care. Be prepared to discuss your symptoms, their duration, and any factors that make them better or worse.';
};

const VisitDetails = () => {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
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
    } else {
      toast({
        title: "Appointment not found",
        description: "The appointment you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [id, user, navigate, toast]);

  // Removed generateAIQuestions function since we're using educational content instead

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

  // Simplified recording process - transcribe immediately and analyze
  const handleStopRecording = async () => {
    if (!audioRecorder) return;
    
    setIsRecording(false);
    setIsProcessing(true);
    setProcessingProgress(10);
    setCurrentStep('Processing recording...');
    
    try {
      const audioData = audioRecorder.stop();
      const encodedAudio = encodeAudioForAPI(audioData);
      
      setCurrentStep('Transcribing audio...');
      setProcessingProgress(30);
      
      // Transcribe the audio directly
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioData: encodedAudio }
      });

      if (transcriptionError) {
        throw new Error('Failed to transcribe audio: ' + transcriptionError.message);
      }

      const transcript = transcriptionData?.transcription || '';
      setFullTranscription(transcript);
      
      setCurrentStep('Analyzing visit content...');
      setProcessingProgress(60);
      
      // Process the transcription for medical insights
      const medicalHistory = user ? localStorage.getItem(`clearvisit_profile_${user.id}`) : null;
      
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-visit-summary', {
        body: {
          fullTranscription: transcript,
          appointmentReason: appointment?.reason || 'General consultation',
          medicalHistory: medicalHistory ? JSON.parse(medicalHistory) : null
        }
      });

      setProcessingProgress(90);

      if (summaryError) {
        throw new Error('Failed to process visit summary: ' + summaryError.message);
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
          description: "Your visit has been successfully analyzed!",
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

            {/* Educational Information */}
            {appointment?.reason && (
              <Card>
                <CardHeader>
                  <CardTitle>About Your Visit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-medium text-blue-900 mb-2">{appointment.reason}</h4>
                    <p className="text-sm text-blue-800">
                      {getEducationalContent(appointment.reason)}
                    </p>
                  </div>
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

            {/* Recording Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Record Visit
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
                      Stop & Process ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
                    </Button>
                  )}
                </div>
                
                {isRecording && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Recording... Speak clearly for best results.
                  </div>
                )}
                
                {isProcessing && (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      🤖 {currentStep}
                    </div>
                    <Progress value={processingProgress} className="w-full" />
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