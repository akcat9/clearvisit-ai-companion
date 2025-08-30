import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({
    fullName: '',
    dateOfBirth: '',
    bloodType: '',
    height: '',
    weight: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalConditions: '',
    currentMedications: '',
    allergies: '',
    pastSurgeries: '',
    healthcareProviders: '',
    insuranceInfo: '',
    vaccinationHistory: ''
  });

  useEffect(() => {
    if (!user) return;
    
    const savedProfile = localStorage.getItem(`clearvisit_profile_${user.id}`);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    
    localStorage.setItem(`clearvisit_profile_${user.id}`, JSON.stringify(profile));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Your medical profile has been saved');
  };

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
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
          <Text style={styles.headerTitle}>Medical Profile</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={profile.fullName}
                  onChangeText={(value) => handleChange('fullName', value)}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={profile.dateOfBirth}
                  onChangeText={(value) => handleChange('dateOfBirth', value)}
                />
              </View>
            </View>
          </View>

          {/* Physical Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Physical Information</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.field, styles.halfField]}>
                  <Text style={styles.label}>Blood Type</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="A+, B-, etc."
                    value={profile.bloodType}
                    onChangeText={(value) => handleChange('bloodType', value)}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.field, styles.halfField]}>
                  <Text style={styles.label}>Height</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5'8\", 170cm"
                    value={profile.height}
                    onChangeText={(value) => handleChange('height', value)}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Weight</Text>
                <TextInput
                  style={styles.input}
                  placeholder="150 lbs, 70 kg"
                  value={profile.weight}
                  onChangeText={(value) => handleChange('weight', value)}
                />
              </View>
            </View>
          </View>

          {/* Medical History */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical History</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Medical Conditions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="List any medical conditions"
                  value={profile.medicalConditions}
                  onChangeText={(value) => handleChange('medicalConditions', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Current Medications</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="List current medications"
                  value={profile.currentMedications}
                  onChangeText={(value) => handleChange('currentMedications', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Allergies</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="List any allergies"
                  value={profile.allergies}
                  onChangeText={(value) => handleChange('allergies', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e293b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveContainer: {
    padding: 16,
  },
  saveButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});