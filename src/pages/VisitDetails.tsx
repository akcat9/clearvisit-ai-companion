import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import ShareVisitModal from '@/components/ShareVisitModal';
import PreVisitEducation from '@/components/PreVisitEducation';
import { AppointmentInfo } from '@/components/AppointmentInfo';
import { RecordingSection } from '@/components/RecordingSection';
import { AIAnalysisResults } from '@/components/AIAnalysisResults';
import { useAppointment } from '@/hooks/useAppointment';
import { useRecording } from '@/hooks/useRecording';

const VisitDetails = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use custom hooks
  const { appointment, loading: appointmentLoading } = useAppointment(id, user?.id);
  const {
    isRecording,
    recordingDuration,
    transcription,
    recordingComplete,
    startRecording,
    stopRecording,
  } = useRecording();

  // Local state
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<any>(null);

  // Load existing visit record
  useEffect(() => {
    if (!id) return;
    loadVisitRecord();
  }, [id]);

  const loadVisitRecord = async () => {
    const { data: visitRecord } = await supabase
      .from('visit_records')
      .select('*')
      .eq('appointment_id', id)
      .single();

    if (visitRecord) {
      if (visitRecord.summary) {
        setAiGeneratedData(visitRecord.summary);
      }
    }
  };

  const handleAnalyzeWithAI = async () => {
    const contentToAnalyze = transcription.trim() || manualNotes.trim();
    
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

      if (summaryError) {
        console.error('AI analysis error:', summaryError);
        toast({
          title: "AI Analysis Failed",
          description: `Error: ${summaryError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!summaryData) {
        toast({
          title: "AI Analysis Failed",
          description: "No analysis data received. Please try again.",
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
        .upsert(visitData, { onConflict: 'appointment_id' });

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
        description: "Your visit has been analyzed and saved successfully.",
      });
    } catch (error) {
      console.error('AI Analysis failed:', error);
      toast({
        title: "AI Analysis Failed",
        description: "Network error or server issue. Please try again.",
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

  if (appointmentLoading || !appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Header />
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading appointment...</p>
        </div>
      </div>
    );
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

        <AppointmentInfo
          doctorName={appointment.doctorName}
          date={appointment.date}
          time={appointment.time}
          reason={appointment.reason}
          goal={appointment.goal}
          symptoms={appointment.symptoms}
        />

        <div className="mb-6">
          <PreVisitEducation 
            appointmentReason={appointment.reason}
            goal={appointment.goal}
            symptoms={appointment.symptoms}
          />
        </div>

        <RecordingSection
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          transcription={transcription}
          recordingComplete={recordingComplete}
          manualNotes={manualNotes}
          isSavingNotes={isSavingNotes}
          isAnalyzing={isAnalyzing}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onAnalyze={handleAnalyzeWithAI}
          onNotesChange={setManualNotes}
          onSaveNotes={handleSaveNotes}
        />

        {aiGeneratedData && (
          <AIAnalysisResults data={aiGeneratedData} />
        )}

        {aiGeneratedData && (
          <div className="flex justify-center">
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
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mt-12">
          © 2025 tadoc. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default VisitDetails;
