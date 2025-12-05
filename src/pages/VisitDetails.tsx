import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Mic, MicOff, FileText, BookOpen, AlertCircle } from 'lucide-react';
import ShareVisitModal from '@/components/ShareVisitModal';
import PreVisitEducation from '@/components/PreVisitEducation';
import { AudioRecorderWhisper } from '@/utils/AudioRecorderWhisper';
import { formatTime } from "@/utils/timeUtils";


const VisitDetails = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorderWhisper | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  
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
        title: t('error'),
        description: "The appointment you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: t('error'),
        description: t('saveFailed'),
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

  // Recording with MediaRecorder + Whisper (works on all devices)
  const handleStartRecording = async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    
    try {
      setLiveTranscription('');
      transcriptionBufferRef.current = '';
      setRecordingComplete(false);
      
      toast({
        title: t('recordVisit'),
        description: t('recordingStarted'),
      });
      
      const recorder = new AudioRecorderWhisper(
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
        title: t('recordVisit'),
        description: t('recordingStarted'),
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: t('error'),
        description: t('recordingFailed'),
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStopRecording = async () => {
    if (!audioRecorder || isStopping) return;
    
    setIsStopping(true);
    
    toast({
      title: t('processing'),
      description: t('stopRecording'),
    });
    
    // Clear the duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    try {
      // Stop recording and get transcript
      const transcript = await audioRecorder.stop();
      
      setIsRecording(false);
      setRecordingComplete(true);
      
      // Update UI with transcript
      if (transcript) {
        setLiveTranscription(transcript);
        transcriptionBufferRef.current = transcript;
        
        // Save to database
        if (id && user?.id) {
          await supabase
            .from('visit_records')
            .upsert({
              appointment_id: id,
              user_id: user.id,
              transcription: transcript,
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'appointment_id'
            });
        }
        
        toast({
          title: t('success'),
          description: t('recordingComplete'),
        });
      } else {
        toast({
          title: t('warning'),
          description: t('recordingStopped'),
        });
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: t('error'),
        description: t('saveFailed'),
        variant: "destructive",
      });
    } finally {
      setIsStopping(false);
    }
  };

  // AI analysis function
  const handleAnalyzeWithAI = async () => {
    const contentToAnalyze = liveTranscription.trim() || manualNotes.trim();
    
    if (!contentToAnalyze) {
      toast({
        title: t('error'),
        description: t('noContent'),
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
          medicalHistory: null,
          language: language
        }
      });

      if (summaryError || !summaryData) {
        toast({
          title: t('error'),
          description: t('aiAnalysisFailed'),
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
            title: t('warning'),
            description: t('aiAnalysisComplete'),
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

        // Auto-update medical history with visit data
        try {
          const newVisitEntry = {
            date: appointment?.date || new Date().toISOString().split('T')[0],
            doctor: appointment?.doctorName || 'Unknown',
            reason: appointment?.reason || 'General consultation',
            keyFindings: aiData.keySymptoms || [],
            newMedications: aiData.prescriptions ? [aiData.prescriptions] : []
          };

          // Get existing medical history
          const { data: existingHistory } = await supabase
            .from('medical_history')
            .select('visit_derived_data')
            .eq('user_id', user?.id)
            .single();

          const existingVisitData = (existingHistory?.visit_derived_data as any) || {};
          const visitHistory = existingVisitData.visitHistory || [];
          const allMedicationsFromVisits = existingVisitData.allMedicationsFromVisits || [];
          const conditionsMentioned = existingVisitData.conditionsMentioned || [];

          // Add new visit to history
          visitHistory.push(newVisitEntry);

          // Update medications list
          if (aiData.prescriptions) {
            const newMeds = aiData.prescriptions.split(',').map((m: string) => m.trim()).filter(Boolean);
            newMeds.forEach((med: string) => {
              if (!allMedicationsFromVisits.includes(med)) {
                allMedicationsFromVisits.push(med);
              }
            });
          }

          // Update conditions list
          if (aiData.keySymptoms && Array.isArray(aiData.keySymptoms)) {
            aiData.keySymptoms.forEach((symptom: string) => {
              if (!conditionsMentioned.includes(symptom)) {
                conditionsMentioned.push(symptom);
              }
            });
          }

          const updatedVisitDerivedData = {
            visitHistory,
            allMedicationsFromVisits,
            conditionsMentioned
          };

          await supabase
            .from('medical_history')
            .upsert({
              user_id: user?.id,
              visit_derived_data: updatedVisitDerivedData,
              last_visit_sync: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        } catch (historyError) {
          console.log('Could not update medical history:', historyError);
        }

        toast({
          title: t('success'),
          description: t('aiAnalysisComplete'),
        });
      } catch (saveError) {
        toast({
          title: t('warning'),
          description: t('aiAnalysisComplete'),
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('aiAnalysisFailed'),
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
        title: t('success'),
        description: t('notesSaved'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('saveFailed'),
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (!appointment) {
    return <div className="p-6">{t('loading')}</div>;
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
            {t('backToDashboard')}
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold">{t('visitDetails')}</h1>
        </div>

        {/* Appointment Info */}
        <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-blue-900 flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('appointmentInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:gap-3">
            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-blue-800">{t('doctor')}:</span> 
              <span className="text-blue-700">{appointment.doctorName}</span>
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-blue-800">{t('dateTime')}:</span> 
              <span className="text-blue-700">{appointment.date} at {formatTime(appointment.time)}</span>
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-blue-800">{t('reason')}:</span> 
              <span className="text-blue-700">{appointment.reason}</span>
            </div>
            {appointment.goal && (
              <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-blue-800">{t('goal')}:</span> 
                <span className="text-blue-700">{appointment.goal}</span>
              </div>
            )}
            {appointment.symptoms && (
              <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-blue-800">{t('symptoms')}:</span> 
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
            <CardTitle className="text-green-900 text-base sm:text-lg">{t('recordVisit')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2 sm:gap-3">
              {!isRecording ? (
                <Button 
                  onClick={handleStartRecording}
                  className="flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                  disabled={isInitializing}
                >
                  <Mic className="w-4 h-4" />
                  {isInitializing ? t('initializing') : t('startRecording')}
                </Button>
              ) : (
                <Button 
                  onClick={handleStopRecording}
                  variant="destructive"
                  className="flex items-center justify-center gap-2 w-full text-sm sm:text-base min-h-[44px]"
                  disabled={isStopping}
                >
                  <MicOff className="w-4 h-4" />
                  {isStopping ? t('processing') : `${t('stopRecording')} (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')})`}
                </Button>
              )}

              {isRecording && (
                <div className="bg-yellow-50 border-2 border-yellow-300 p-2 sm:p-3 rounded-lg">
                  <p className="text-xs sm:text-sm text-yellow-800 font-medium">
                    ⚠️ {t('stopRecording')}
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
                  {isAnalyzing ? t('analyzing') : t('analyzeWithAi')}
                </Button>
              )}
            </div>

            {/* Live Transcription */}
            {liveTranscription && (
              <div className="bg-white border-2 border-green-200 p-3 sm:p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-green-800 text-sm sm:text-base">{t('liveTranscription')}:</h4>
                <div className="text-xs sm:text-sm text-green-700 max-h-40 overflow-y-auto leading-relaxed">
                  {liveTranscription}
                </div>
              </div>
            )}

            {/* Manual Notes */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">{t('manualNotes')}</label>
              <Textarea
                placeholder={t('addNotesHere')}
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
                {isSavingNotes ? t('saving') : t('saveNotes')}
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
                {t('visitSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {aiGeneratedData.visitSummary && (
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-purple-200">
                  <h4 className="font-semibold mb-2 sm:mb-3 text-purple-800 text-sm sm:text-base">{t('visitSummary')}</h4>
                  <p className="text-purple-700 leading-relaxed text-xs sm:text-sm">{aiGeneratedData.visitSummary}</p>
                </div>
              )}

              {aiGeneratedData.keySymptoms?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <h4 className="font-semibold mb-3 text-red-800 text-base">{t('keySymptoms')}</h4>
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
                  <h4 className="font-semibold mb-3 text-blue-800 text-base">{t('keyTermsExplained')}</h4>
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
                  <h4 className="font-semibold mb-3 text-orange-800 text-base">{t('prescriptions')}</h4>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <p className="text-orange-700 text-sm">{aiGeneratedData.prescriptions}</p>
                  </div>
                </div>
              )}

              {aiGeneratedData.doctorRecommendations?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold mb-3 text-green-800 text-base">{t('doctorRecommendations')}</h4>
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
                  <h4 className="font-semibold mb-3 text-yellow-800 text-base">{t('followUpActions')}</h4>
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <p className="text-yellow-700 text-sm">{aiGeneratedData.followUpActions}</p>
                  </div>
                </div>
              )}

              {aiGeneratedData.questionsForDoctor?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold mb-3 text-indigo-800 text-base">{t('questionsForDoctor')}</h4>
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
              <CardTitle>{t('shareVisit')}</CardTitle>
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
