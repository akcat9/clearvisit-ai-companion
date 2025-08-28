import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { ArrowLeft, Mic, MicOff, Edit, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const VisitDetails = () => {
  const [user, setUser] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    const currentUser = localStorage.getItem("clearvisit_user");
    if (!currentUser) {
      navigate("/");
      return;
    }
    setUser(currentUser);

    // Load appointment details
    const savedAppointments = localStorage.getItem("clearvisit_appointments");
    if (savedAppointments) {
      const appointments = JSON.parse(savedAppointments);
      const currentAppointment = appointments.find((apt: any) => apt.id === id);
      if (currentAppointment) {
        setAppointment(currentAppointment);
        generateAIQuestions(currentAppointment);
      }
    }
  }, [navigate, id]);

  const generateAIQuestions = (appointmentData: any) => {
    // Load medical profile for context
    const savedProfile = localStorage.getItem("clearvisit_profile");
    const profile = savedProfile ? JSON.parse(savedProfile) : {};

    // Generate AI questions based on appointment reason and medical history
    const questions = [];
    
    if (appointmentData.reason.toLowerCase().includes("check")) {
      questions.push("How has my chronic GI condition been progressing since my last visit?");
      questions.push("Are there any new medications or treatments you'd recommend?");
      questions.push("What lifestyle changes should I consider for better health?");
    } else if (appointmentData.reason.toLowerCase().includes("pain")) {
      questions.push("What could be causing this specific type of pain?");
      questions.push("Are there any imaging tests or additional diagnostics needed?");
      questions.push("What pain management options are available for my condition?");
    } else {
      questions.push("Based on my medical history, what should I be monitoring?");
      questions.push("Are there any preventive measures I should take?");
      questions.push("When should I schedule my next follow-up appointment?");
    }

    setAiQuestions(questions);
  };

  const handleLogout = () => {
    localStorage.removeItem("clearvisit_user");
    navigate("/");
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    toast({
      title: "Recording started",
      description: "Your visit is now being recorded for analysis",
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Simulate AI processing
    setTimeout(() => {
      setVisitNotes("Doctor noted improvement in GI symptoms. Nexium dosage is effective. Patient reports better sleep and reduced discomfort.");
      setPrescriptions("Continue Nexium 40mg daily. Added probiotics supplement.");
      setFollowUpActions("Schedule follow-up in 3 months. Monitor symptoms daily. Call if severe pain returns.");
      
      toast({
        title: "Visit processed",
        description: "AI has analyzed your visit and generated summary",
      });
    }, 2000);
  };

  const handleSaveVisit = () => {
    // Mark appointment as completed and save notes
    const savedAppointments = localStorage.getItem("clearvisit_appointments");
    if (savedAppointments) {
      const appointments = JSON.parse(savedAppointments);
      const updatedAppointments = appointments.map((apt: any) => 
        apt.id === id ? { ...apt, status: 'completed', notes: visitNotes, prescriptions, followUpActions } : apt
      );
      localStorage.setItem("clearvisit_appointments", JSON.stringify(updatedAppointments));
    }

    toast({
      title: "Visit saved",
      description: "Your visit details have been saved to your medical records",
    });

    navigate("/dashboard");
  };

  if (!appointment) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user || undefined} onLogout={handleLogout} />
      
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
          <div className="ml-auto">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="mr-2"
            >
              Logout
            </Button>
          </div>
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
                <div className="space-y-3">
                  {aiQuestions.map((question, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-sm font-medium text-blue-800">{question}</p>
                    </div>
                  ))}
                </div>
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
                  
                  <p className="text-xs text-muted-foreground">
                    AI will analyze your conversation and automatically update your medical records
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Manual Visit Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Manual Visit Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add any additional notes or observations about this visit..."
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
                  placeholder="List medications prescribed, dosage changes, or instructions..."
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
                  placeholder="Note any recommended follow-up appointments, tests, or lifestyle changes..."
                  value={followUpActions}
                  onChange={(e) => setFollowUpActions(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Save Visit */}
            <Button onClick={handleSaveVisit} className="w-full">
              Save Visit Notes
            </Button>
          </div>
        </div>

        {/* Medical Profile Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Medical Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">Medical Information</h4>
                <p><span className="font-medium">Name:</span> Adarsh Karthik</p>
                <p><span className="font-medium">Blood Type:</span> O+</p>
                <p><span className="font-medium">Weight:</span> 165</p>
                <p><span className="font-medium">Allergies:</span> None</p>
                <p><span className="font-medium">Conditions:</span> Dysplasia, chronic GI issues</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Healthcare Information</h4>
                <p><span className="font-medium">Emergency Contact:</span> Karthik Thilairangan</p>
                <p><span className="font-medium">Emergency Phone:</span> 813-928-8075</p>
                <p><span className="font-medium">Insurance:</span> ----------</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisitDetails;