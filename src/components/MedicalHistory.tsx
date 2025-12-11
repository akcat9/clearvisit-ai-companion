import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Pill, Heart, AlertTriangle, Activity, Clock } from 'lucide-react';

interface MedicalHistoryData {
  current_medications: any[];
  chronic_conditions: any[];
  allergies: any[];
  blood_type: string | null;
  family_history: string | null;
  visit_derived_data: Record<string, {
    date: string;
    key_findings: string[];
    recommendations: string[];
  }>;
  last_visit_sync: string | null;
}

// Helper to format medication entries properly
const formatMedication = (med: any): string | null => {
  if (!med) return null;
  if (typeof med === 'string') {
    const trimmed = med.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof med === 'object') {
    const name = med.name?.toString().trim();
    if (!name) return null;
    const parts = [name];
    if (med.dosage?.toString().trim()) parts.push(med.dosage.toString().trim());
    if (med.frequency?.toString().trim()) parts.push(`- ${med.frequency.toString().trim()}`);
    return parts.join(' ');
  }
  return null;
};

// Helper to format condition/allergy entries
const formatEntry = (entry: any): string | null => {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof entry === 'object') {
    const name = entry.name?.toString().trim() || entry.condition?.toString().trim();
    return name && name.length > 0 ? name : null;
  }
  return null;
};

export const MedicalHistory = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [history, setHistory] = useState<MedicalHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMedicalHistory();
    }
  }, [user?.id]);

  const fetchMedicalHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_history')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setHistory({
          current_medications: (data.current_medications as any[]) || [],
          chronic_conditions: (data.chronic_conditions as any[]) || [],
          allergies: (data.allergies as any[]) || [],
          blood_type: data.blood_type,
          family_history: data.family_history,
          visit_derived_data: (data.visit_derived_data as Record<string, any>) || {},
          last_visit_sync: data.last_visit_sync
        });
      }
    } catch (error) {
      console.error('Error fetching medical history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Format and filter entries
  const medications = history?.current_medications
    .map(formatMedication)
    .filter((m): m is string => m !== null) || [];
  
  const conditions = history?.chronic_conditions
    .map(formatEntry)
    .filter((c): c is string => c !== null) || [];
  
  const allergies = history?.allergies
    .map(formatEntry)
    .filter((a): a is string => a !== null) || [];

  const hasData = medications.length > 0 || conditions.length > 0 || allergies.length > 0;

  const recentFindings = history?.visit_derived_data 
    ? Object.entries(history.visit_derived_data)
        .sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
        .slice(0, 3)
    : [];

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-purple-900 flex items-center gap-2 text-base sm:text-lg">
          <Activity className="w-5 h-5" />
          {t('medicalHistory') || 'Medical History'}
        </CardTitle>
        {history?.last_visit_sync && (
          <p className="text-xs text-purple-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {new Date(history.last_visit_sync).toLocaleDateString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="text-center py-6 text-purple-600">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('noMedicalHistory') || 'No medical history yet'}</p>
            <p className="text-xs mt-1 opacity-75">
              {t('medicalHistoryWillUpdate') || 'Your history will update automatically after visits'}
            </p>
          </div>
        ) : (
          <>
            {/* Current Medications */}
            {medications.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4" />
                  {t('currentMedications') || 'Current Medications'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {medications.map((med, i) => (
                    <Badge key={i} variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                      {med}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Chronic Conditions */}
            {conditions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4" />
                  {t('chronicConditions') || 'Conditions'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((condition, i) => (
                    <Badge key={i} variant="outline" className="border-purple-300 text-purple-700 text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            {allergies.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('allergies') || 'Allergies'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Visit Findings */}
            {recentFindings.length > 0 && (
              <div className="pt-2 border-t border-purple-200">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">
                  {t('recentFindings') || 'Recent Findings'}
                </h4>
                <div className="space-y-2">
                  {recentFindings.map(([id, data]) => (
                    <div key={id} className="text-xs bg-white/50 rounded p-2">
                      <p className="text-purple-600 mb-1">
                        {new Date(data.date).toLocaleDateString()}
                      </p>
                      {data.key_findings?.slice(0, 2).map((finding, i) => (
                        <p key={i} className="text-purple-700">• {finding}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicalHistory;
