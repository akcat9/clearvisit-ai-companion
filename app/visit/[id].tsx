import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/integrations/supabase/client';
import { AudioRecorder, encodeAudioForAPI } from '../../src/utils/AudioRecorder';
import * as Haptics from 'expo-haptics';

export default function VisitDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [manualNotes, setManualNotes] = useState('');
  const [fullTranscription, setFullTranscription] = useState('');
  const [liveTranscription, setLiveTranscription] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<any>(null);
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
  
  const router = useRouter();
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!user) return;
    fetchAppointment();
  }, [id, user]);

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const fetchAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        Alert.alert('Error', 'Appointment not found');
        router.back();
        return;
      }

      setAppointment(data);

      // Load existing visit record
      const { data: visitRecord } = await supabase
        .from('visit_records')
        .select('*')
        .eq('appointment_id', id)
        .single();

      if (visitRecord) {
        setManualNotes(visitRecord.transcription || '');
        if (visitRecord.summary) {
          setAiGeneratedData(visitRecord.summary);
        }
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      setLiveTranscription('');
      setFullTranscription('');
      
      const recorder = new AudioRecorder(
        (audioData) => {
          console.log('Receiving audio chunk:', audioData.length);
        },
        (transcription) => {
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
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
    } catch (error) {
      Alert.alert('Recording Failed', 'Could not access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (!audioRecorder) return;
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    audioRecorder.stop();
    setIsRecording(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Recording Complete', 'Click "Analyze with AI" to process your visit.');
  };

  const handleAnalyzeWithAI = async () => {
    if (!fullTranscription.trim() && !manualNotes.trim()) {
      Alert.alert('No Content', 'Please record something or add notes before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const medicalHistory = user ? localStorage.getItem(`clearvisit_profile_${user.id}`) : null;
      
      const { data: summaryData, error } = await supabase.functions.invoke('process-visit-summary', {
        body: {
          fullTranscription: fullTranscription || manualNotes,
          appointmentReason: appointment?.reason || 'General consultation',
          medicalHistory: medicalHistory ? JSON.parse(medicalHistory) : null
        }
      });

      if (error) throw error;

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

        // Auto-save to database
        await supabase
          .from('visit_records')
          .upsert({
            appointment_id: id,
            user_id: user?.id,
            transcription: fullTranscription || manualNotes,
            summary: aiData,
          }, { onConflict: 'appointment_id' });

        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', id);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Analysis Complete', 'Your visit has been analyzed and saved!');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Analysis Failed', 'Please try again or enter notes manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading appointment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit Details</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Visit Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Doctor:</Text>
            <Text style={styles.infoValue}>{appointment.doctor_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{appointment.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time:</Text>
            <Text style={styles.infoValue}>{appointment.time}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue}>{appointment.reason}</Text>
          </View>
        </View>

        {/* Recording Interface */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record Visit</Text>
          
          <View style={styles.recordingContainer}>
            <Animated.View style={[styles.recordButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isAnalyzing}
              >
                <Text style={styles.recordButtonText}>
                  {isRecording ? '⏹️' : '🎙️'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            <Text style={styles.recordingStatus}>
              {isRecording 
                ? `Recording... ${formatDuration(recordingDuration)}`
                : 'Tap to start recording'
              }
            </Text>
          </View>

          {fullTranscription && !isRecording && !aiGeneratedData && (
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={handleAnalyzeWithAI}
              disabled={isAnalyzing}
            >
              <Text style={styles.analyzeButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Live Transcription */}
        {isRecording && liveTranscription && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Transcription</Text>
            <View style={styles.transcriptionBox}>
              <Text style={styles.transcriptionText}>{liveTranscription}</Text>
            </View>
          </View>
        )}

        {/* Manual Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add your own notes about the visit..."
            value={manualNotes}
            onChangeText={setManualNotes}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity style={styles.saveNotesButton}>
            <Text style={styles.saveNotesButtonText}>Save Notes</Text>
          </TouchableOpacity>
        </View>

        {/* AI Generated Content */}
        {aiGeneratedData && (
          <>
            {aiGeneratedData.visitSummary && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>AI Visit Summary</Text>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>{aiGeneratedData.visitSummary}</Text>
                </View>
              </View>
            )}

            {aiGeneratedData.keySymptoms && aiGeneratedData.keySymptoms.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Key Symptoms</Text>
                {aiGeneratedData.keySymptoms.map((symptom: string, index: number) => (
                  <View key={index} style={styles.symptomItem}>
                    <Text style={styles.symptomText}>{symptom}</Text>
                  </View>
                ))}
              </View>
            )}

            {aiGeneratedData.prescriptions && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Prescriptions</Text>
                <View style={styles.prescriptionBox}>
                  <Text style={styles.prescriptionText}>{aiGeneratedData.prescriptions}</Text>
                </View>
              </View>
            )}

            {aiGeneratedData.followUpActions && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Follow-up Actions</Text>
                <View style={styles.followUpBox}>
                  <Text style={styles.followUpText}>{aiGeneratedData.followUpActions}</Text>
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4F8EF7',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1e293b',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    width: 80,
    color: '#64748b',
  },
  infoValue: {
    flex: 1,
    color: '#1e293b',
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordButtonContainer: {
    marginBottom: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  recordButtonText: {
    fontSize: 32,
  },
  recordingStatus: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  analyzeButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptionBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 16,
    maxHeight: 120,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#1e40af',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
  },
  saveNotesButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveNotesButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  symptomItem: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#f87171',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  symptomText: {
    fontSize: 14,
    color: '#991b1b',
  },
  prescriptionBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 16,
  },
  prescriptionText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  followUpBox: {
    backgroundColor: '#fefce8',
    borderRadius: 8,
    padding: 16,
  },
  followUpText: {
    fontSize: 14,
    color: '#a16207',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});