import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mic, MicOff, FileText } from 'lucide-react';
import ShareVisitModal from '@/components/ShareVisitModal';
import { AudioRecorder, encodeAudioForAPI, chunkAudio } from '@/utils/AudioRecorder';

const generateEducationalContent = async (reason: string, symptoms?: string, goal?: string): Promise<string> => {
  try {
    const response = await supabase.functions.invoke('generate-educational-content', {
      body: { 
        reason,
        symptoms,
        goal
      }
    });

    if (response.error) {
      console.error('Error generating educational content:', response.error);
      return getStaticEducationalContent(reason);
    }

    if (response.data?.content) {
      return response.data.content;
    }

    return getStaticEducationalContent(reason);
  } catch (error) {
    console.error('Error generating educational content:', error);
    return getStaticEducationalContent(reason);
  }
};

const getStaticEducationalContent = (reason: string): string => {
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
  const [educationalContent, setEducationalContent] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [fullTranscription, setFullTranscription] = useState('');
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [medicalTermsExplanation, setMedicalTermsExplanation] = useState<any>(null);
  
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
    
    const content = await generateEducationalContent(
      appointment.reason,
      appointment.symptoms,
      appointment.goal
    );
    setEducationalContent(content);
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
          status: supabaseAppointment.status,
        });
        
        // Load visit record if exists
        const { data: visitRecord } = await supabase
          .from('visit_records')
          .select('*')
          .eq('appointment_id', id)
          .single();

        if (visitRecord) {
          // Don't load transcription into manual notes - keep them separate
          if (visitRecord.summary) {
            setAiGeneratedData(visitRecord.summary as any);
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

  // Removed generateAIQuestions function since we're using educational content instead

  // Start recording visit conversation with live transcription
  const handleStartRecording = async () => {
    try {
      setLiveTranscription('');
      setFullTranscription('');
      setRecordingComplete(false);
      
      const recorder = new AudioRecorder(
        (audioData) => {
          // Real-time audio data processing if needed
          console.log('Receiving audio chunk:', audioData.length);
        },
        (transcription) => {
          // Live transcription callback
          setLiveTranscription(prev => {
            const newText = prev + ' ' + transcription;
            setFullTranscription(newText.trim());
            return newText;
          });
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
        description: "Live transcription active. Speak clearly for best results.",
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

  // Stop recording - no automatic processing
  const handleStopRecording = () => {
    if (!audioRecorder) return;
    
    // Clear the duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    audioRecorder.stop();
    setIsRecording(false);
    setRecordingComplete(true);
    
    toast({
      title: "Recording Stopped",
      description: "Recording complete. Click 'Analyze with AI' to process your visit.",
    });
  };

  // Separate AI analysis function
  const handleAnalyzeWithAI = async () => {
    if (!fullTranscription.trim()) {
      toast({
        title: "No Content",
        description: "Please record something or add notes before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Process the transcription for medical insights
      const medicalHistory = user ? localStorage.getItem(`clearvisit_profile_${user.id}`) : null;
      
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-visit-summary', {
        body: {
          fullTranscription: fullTranscription,
          appointmentReason: appointment?.reason || 'General consultation',
          medicalHistory: medicalHistory ? JSON.parse(medicalHistory) : null
        }
      });

      if (summaryError) {
        console.error('Summary processing error:', summaryError);
        throw new Error(`Failed to process visit summary: ${summaryError.message}`);
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

        // Generate medical terms explanation if there are symptoms or recommendations
        const medicalTerms = [
          ...(summaryData.keySymptoms || []),
          ...(summaryData.doctorRecommendations || [])
        ].filter(term => term.length > 0);

        if (medicalTerms.length > 0) {
          try {
            const { data: termsData } = await supabase.functions.invoke('explain-medical-terms', {
              body: { medicalTerms: medicalTerms.slice(0, 5) } // Limit to 5 terms
            });
            if (termsData?.explanations) {
              setMedicalTermsExplanation(termsData);
            }
          } catch (termsError) {
            console.error('Error explaining medical terms:', termsError);
          }
        }
        
        // Automatically save to database after AI analysis
        try {
          const visitData = {
            appointment_id: id,
            user_id: user?.id,
            transcription: fullTranscription || manualNotes,
            summary: aiData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: visitError } = await supabase
            .from('visit_records')
            .upsert(visitData, { 
              onConflict: 'appointment_id'
            });

          if (visitError) {
            console.error('Error auto-saving visit record:', visitError);
          } else {
            console.log('Visit data automatically saved to database');
            
            // Update appointment status to completed
            await supabase
              .from('appointments')
              .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', id);
          }
        } catch (autoSaveError) {
          console.error('Error during auto-save:', autoSaveError);
        }
        
        toast({
          title: "Analysis Complete",
          description: "Your visit has been analyzed and saved automatically!",
        });
      }
    } catch (error) {
      console.error('Error analyzing visit:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      let userMessage = "Failed to analyze visit. ";
      
      if (errorMessage.includes("insufficient_quota")) {
        userMessage += "OpenAI API quota exceeded. Please check your API credits.";
      } else {
        userMessage += "Please try again or enter notes manually.";
      }
      
      toast({
        title: "Analysis Failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveVisit = async () => {
    try {
      // Save to Supabase database
      const visitData = {
        appointment_id: id,
        user_id: user?.id,
        transcription: fullTranscription || manualNotes,
        summary: aiGeneratedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert or update visit record
      const { error: visitError } = await supabase
        .from('visit_records')
        .upsert(visitData, { 
          onConflict: 'appointment_id'
        });

      if (visitError) {
        console.error('Error saving visit record:', visitError);
        throw visitError;
      }

      // Update appointment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (appointmentError) {
        console.error('Error updating appointment:', appointmentError);
        throw appointmentError;
      }

      // Also save to localStorage for backward compatibility
      const appointments = JSON.parse(localStorage.getItem("appointments") || "[]");
      const updatedAppointments = appointments.map((apt: any) => 
        apt.id === id ? { 
          ...apt, 
          status: 'completed', 
          manualNotes,
          aiGeneratedData,
          fullTranscription,
          completedAt: new Date().toISOString()
        } : apt
      );
      localStorage.setItem("appointments", JSON.stringify(updatedAppointments));

      toast({
        title: "Visit saved",
        description: "Your visit details have been successfully saved to your medical records",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Error saving visit:', error);
      toast({
        title: "Error saving visit",
        description: "There was a problem saving your visit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!user?.id || !id) {
      toast({
        title: "Error",
        description: "Unable to save notes. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingNotes(true);
    try {
      // Save notes to Supabase database
      const { error: visitError } = await supabase
        .from('visit_records')
        .upsert({
          appointment_id: id,
          user_id: user.id,
          transcription: manualNotes || '',
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'appointment_id'
        });

      if (visitError) {
        console.error('Error saving notes:', visitError);
        throw visitError;
      }

      // Also save to localStorage for backward compatibility
      const appointments = JSON.parse(localStorage.getItem("appointments") || "[]");
      const updatedAppointments = appointments.map((apt: any) => 
        apt.id === id ? { ...apt, manualNotes } : apt
      );
      localStorage.setItem("appointments", JSON.stringify(updatedAppointments));

      toast({
        title: "Notes saved",
        description: "Your notes have been successfully saved.",
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error saving notes",
        description: "There was a problem saving your notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
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
                      {educationalContent || getStaticEducationalContent(appointment.reason)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {aiGeneratedData?.questionsForDoctor && aiGeneratedData.questionsForDoctor.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Questions to Ask Your Doctor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aiGeneratedData.questionsForDoctor.map((question, index) => (
                      <div key={index} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                        <p className="text-sm font-medium text-orange-800">{question}</p>
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
                      disabled={isAnalyzing}
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
                  
                  {recordingComplete && !aiGeneratedData && (
                    <Button 
                      onClick={handleAnalyzeWithAI}
                      disabled={isAnalyzing}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
                    </Button>
                  )}
                </div>
                
                {isRecording && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Recording... Live transcription active.
                  </div>
                )}
                
                {/* Live Transcription Box */}
                {isRecording && liveTranscription && (
                  <div className="p-3 bg-blue-50 rounded-lg border">
                    <div className="text-xs font-medium text-blue-700 mb-2">Live Transcription:</div>
                    <div className="text-sm text-blue-800 max-h-24 overflow-y-auto">
                      {liveTranscription}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Manual Notes - Always Available */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Your Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Add your own notes about the visit here..."
                  rows={4}
                  className="resize-none"
                />
                <Button 
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  size="sm"
                  className="w-full"
                >
                  {isSavingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </CardContent>
            </Card>

            {/* Transcription Display */}
            {fullTranscription && (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Transcription</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {fullTranscription}
                    </p>
                  </div>
                  {!aiGeneratedData && recordingComplete && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Click "Analyze with AI" to get visit summary and next steps.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI-Generated Content - Only Shown After Processing */}
            {aiGeneratedData && (
              <>
                {/* Visit Summary */}
                {aiGeneratedData.visitSummary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Visit Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">
                          {aiGeneratedData.visitSummary}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Symptoms */}
                {aiGeneratedData.keySymptoms && aiGeneratedData.keySymptoms.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Symptoms Discussed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiGeneratedData.keySymptoms.map((symptom, index) => (
                          <div key={index} className="p-2 bg-red-50 rounded border-l-4 border-red-400">
                            <p className="text-sm text-red-800">{symptom}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Doctor's Recommendations */}
                {aiGeneratedData.doctorRecommendations && aiGeneratedData.doctorRecommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Doctor's Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiGeneratedData.doctorRecommendations.map((recommendation, index) => (
                          <div key={index} className="p-2 bg-purple-50 rounded border-l-4 border-purple-400">
                            <p className="text-sm text-purple-800">{recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Prescriptions & Medications */}
                {aiGeneratedData.prescriptions && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Prescriptions & Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800 whitespace-pre-wrap">
                          {aiGeneratedData.prescriptions}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Follow-up Actions */}
                {aiGeneratedData.followUpActions && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Follow-up Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800 whitespace-pre-wrap">
                          {aiGeneratedData.followUpActions}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Medical Terms Explanation */}
                {medicalTermsExplanation?.explanations && medicalTermsExplanation.explanations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical Terms Explained</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {medicalTermsExplanation.explanations.map((explanation: any, index: number) => (
                          <div key={index} className="p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
                            <h5 className="font-medium text-indigo-900 mb-1">{explanation?.term || "Medical Term"}</h5>
                            <p className="text-sm text-indigo-800 mb-1">{explanation?.definition || "Definition not available"}</p>
                            <p className="text-xs text-indigo-600 italic">{explanation?.relevance || "Relevance not available"}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <div className="pt-6 space-y-3">
              {aiGeneratedData && (
                <ShareVisitModal 
                  visitSummary={aiGeneratedData} 
                  appointmentData={{
                    doctor_name: appointment.doctorName || appointment.doctor_name,
                    date: appointment.date,
                    time: appointment.time,
                    reason: appointment.reason,
                    goal: appointment.goal
                  }}
                />
              )}
              <Button 
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitDetails;