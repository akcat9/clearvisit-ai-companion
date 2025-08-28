import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const VisitDetails = () => {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
      const savedProfile = localStorage.getItem("clearvisit_profile");
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

  const handleStartRecording = () => {
    setIsRecording(true);
    toast({
      title: "Recording started",
      description: "Your visit is now being recorded for AI analysis",
    });
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    
    try {
      // Simulate processing the recording
      toast({
        title: "Processing recording",
        description: "AI is analyzing your visit conversation...",
      });

      const response = await supabase.functions.invoke('process-visit-recording', {
        body: {
          appointmentId: id,
          appointmentReason: appointment.reason,
          recordingData: "simulated_audio_data" // In real implementation, this would be actual audio
        }
      });

      if (response.data) {
        setVisitNotes(response.data.visitSummary || "");
        setPrescriptions(response.data.prescriptions || "");
        setFollowUpActions(response.data.followUpActions || "");
        
        toast({
          title: "Visit processed successfully",
          description: "AI has analyzed your visit and generated a comprehensive summary",
        });
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Processing error",
        description: "There was an issue processing your recording. You can manually add notes below.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveVisit = () => {
    // Mark appointment as completed and save notes
    const appointments = JSON.parse(localStorage.getItem("appointments") || "[]");
    const updatedAppointments = appointments.map((apt: any) => 
      apt.id === id ? { 
        ...apt, 
        status: 'completed', 
        visitNotes, 
        prescriptions, 
        followUpActions,
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
            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Questions to Ask</CardTitle>
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

            {/* Recording Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Record Your Visit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  {!isRecording ? (
                    <Button 
                      onClick={handleStartRecording}
                      disabled={isProcessing}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                    >
                      <Mic className="w-4 h-4" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopRecording}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <MicOff className="w-4 h-4" />
                      Stop Recording
                    </Button>
                  )}
                  
                  {isRecording && (
                    <div className="text-center">
                      <div className="w-4 h-4 bg-red-500 rounded-full mx-auto animate-pulse"></div>
                      <p className="text-sm text-muted-foreground mt-2">Recording in progress...</p>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">AI is processing your recording...</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    AI will analyze your conversation and automatically update your medical records
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Visit Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Visit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="AI-generated visit summary will appear here, or add your own notes..."
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  rows={6}
                />
              </CardContent>
            </Card>

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