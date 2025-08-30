import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface SharedVisit {
  id: string;
  sender_profile: any;
  visit_summary: any;
  appointment_data: any;
  message: string | null;
  shared_at: string;
  viewed_at: string | null;
}

export default function SharedVisitsScreen() {
  const { user } = useAuth();
  const [sharedVisits, setSharedVisits] = useState<SharedVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    fetchSharedVisits();
  }, [user]);

  const fetchSharedVisits = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.email) return;

      const { data, error } = await supabase
        .from('shared_visits')
        .select('*')
        .eq('recipient_email', profile.email)
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared visits:', error);
        return;
      }

      setSharedVisits((data || []) as SharedVisit[]);

      // Mark as viewed
      const unreadIds = data?.filter(v => !v.viewed_at).map(v => v.id) || [];
      if (unreadIds.length > 0) {
        await supabase
          .from('shared_visits')
          .update({ viewed_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error fetching shared visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSenderName = (senderProfile: any) => {
    if (!senderProfile) return 'Unknown';
    return senderProfile.first_name && senderProfile.last_name
      ? `${senderProfile.first_name} ${senderProfile.last_name}`
      : senderProfile.email || 'Unknown';
  };

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
        <Text style={styles.headerTitle}>Shared Visits</Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading shared visits...</Text>
          </View>
        ) : sharedVisits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shared visits yet</Text>
            <Text style={styles.emptySubtext}>
              Visit summaries shared with you will appear here
            </Text>
          </View>
        ) : (
          sharedVisits.map((visit) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <Text style={styles.senderName}>
                  From: {getSenderName(visit.sender_profile)}
                </Text>
                <Text style={styles.visitDate}>
                  {new Date(visit.shared_at).toLocaleDateString()}
                </Text>
              </View>

              {visit.message && (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>"{visit.message}"</Text>
                </View>
              )}

              {visit.appointment_data && (
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentText}>
                    Visit with Dr. {visit.appointment_data.doctor_name}
                  </Text>
                  <Text style={styles.appointmentDate}>
                    {visit.appointment_data.date} at {visit.appointment_data.time}
                  </Text>
                </View>
              )}

              {visit.visit_summary?.visitSummary && (
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryTitle}>Visit Summary</Text>
                  <Text style={styles.summaryText}>
                    {visit.visit_summary.visitSummary}
                  </Text>
                </View>
              )}

              {visit.visit_summary?.keySymptoms && visit.visit_summary.keySymptoms.length > 0 && (
                <View style={styles.symptomsBox}>
                  <Text style={styles.symptomsTitle}>Key Symptoms</Text>
                  <Text style={styles.symptomsText}>
                    {visit.visit_summary.keySymptoms.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ))
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
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  visitCard: {
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
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  visitDate: {
    fontSize: 14,
    color: '#64748b',
  },
  messageBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: '#1e40af',
    fontStyle: 'italic',
  },
  appointmentInfo: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  appointmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  appointmentDate: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  symptomsBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
  },
  symptomsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  symptomsText: {
    fontSize: 14,
    color: '#991b1b',
  },
  bottomPadding: {
    height: 40,
  },
});