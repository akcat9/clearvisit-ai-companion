import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { MedicalHistoryManualForm, MedicalHistoryFormData } from './MedicalHistoryManualForm';
import { MedicalHistoryFromVisits } from './MedicalHistoryFromVisits';

interface MedicalHistoryData {
  current_medications: any;
  chronic_conditions: any;
  allergies: any;
  blood_type: string | null;
  family_history: string | null;
  emergency_contact: any;
  visit_derived_data: Record<string, {
    date: string;
    key_findings: string[];
    recommendations: string[];
  }>;
  last_visit_sync: string | null;
}

// Helper to extract manual entries from stored data
const extractManualData = (field: any): any[] => {
  if (!field) return [];
  if (Array.isArray(field)) {
    // Check if it's new format with manual/from_visits or old flat array
    if (field.length > 0 && typeof field[0] === 'object' && 'manual' in field[0]) {
      return field[0].manual || [];
    }
    // Old format - treat as manual data
    return field.filter((item: any) => {
      if (typeof item === 'object' && item !== null) {
        return !item.from_visit;
      }
      return true;
    });
  }
  if (typeof field === 'object' && field !== null) {
    return field.manual || [];
  }
  return [];
};

// Helper to extract visit-derived entries
const extractVisitData = (field: any): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) {
    if (field.length > 0 && typeof field[0] === 'object' && 'from_visits' in field[0]) {
      return field[0].from_visits || [];
    }
    return field
      .filter((item: any) => typeof item === 'object' && item?.from_visit)
      .map((item: any) => formatVisitEntry(item));
  }
  if (typeof field === 'object' && field !== null) {
    return (field.from_visits || []).map(formatVisitEntry);
  }
  return [];
};

const formatVisitEntry = (item: any): string => {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null) {
    const name = item.name?.toString().trim();
    if (!name) return '';
    const parts = [name];
    if (item.dosage?.toString().trim()) parts.push(item.dosage.toString().trim());
    if (item.frequency?.toString().trim()) parts.push(`- ${item.frequency.toString().trim()}`);
    return parts.join(' ');
  }
  return '';
};

export const MedicalHistory = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [history, setHistory] = useState<MedicalHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        .maybeSingle();

      if (!error && data) {
        setHistory({
          current_medications: data.current_medications || { manual: [], from_visits: [] },
          chronic_conditions: data.chronic_conditions || { manual: [], from_visits: [] },
          allergies: data.allergies || { manual: [], from_visits: [] },
          blood_type: data.blood_type,
          family_history: data.family_history,
          emergency_contact: data.emergency_contact,
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

  const handleSaveManualData = async (formData: MedicalHistoryFormData) => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      // Preserve visit-derived data when saving manual entries
      const existingVisitMeds = extractVisitData(history?.current_medications);
      const existingVisitConditions = extractVisitData(history?.chronic_conditions);
      const existingVisitAllergies = extractVisitData(history?.allergies);

      const dataToSave = {
        user_id: user.id,
        current_medications: {
          manual: formData.current_medications,
          from_visits: existingVisitMeds
        },
        chronic_conditions: {
          manual: formData.chronic_conditions,
          from_visits: existingVisitConditions
        },
        allergies: {
          manual: formData.allergies,
          from_visits: existingVisitAllergies
        },
        blood_type: formData.blood_type,
        emergency_contact: formData.emergency_contact,
        family_history: formData.family_history,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('medical_history')
        .upsert(dataToSave, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success(t('medicalHistorySaved'));
      fetchMedicalHistory();
    } catch (error) {
      console.error('Error saving medical history:', error);
      toast.error(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Prepare data for forms
  const manualMedications = extractManualData(history?.current_medications)
    .filter((m: any) => m && (typeof m === 'string' ? m.trim() : m.name?.trim()))
    .map((m: any) => typeof m === 'string' ? { name: m, dosage: '', frequency: '' } : m);

  const manualConditions = extractManualData(history?.chronic_conditions)
    .filter((c: any) => c && (typeof c === 'string' ? c.trim() : c.name?.trim()))
    .map((c: any) => typeof c === 'string' ? c : (c.name || c.condition || ''));

  const manualAllergies = extractManualData(history?.allergies)
    .filter((a: any) => a && (typeof a === 'string' ? a.trim() : a.name?.trim()))
    .map((a: any) => typeof a === 'string' ? a : (a.name || ''));

  const visitMedications = extractVisitData(history?.current_medications).filter(Boolean);
  const visitConditions = extractVisitData(history?.chronic_conditions).filter(Boolean);
  const visitAllergies = extractVisitData(history?.allergies).filter(Boolean);

  const formData: MedicalHistoryFormData = {
    current_medications: manualMedications,
    chronic_conditions: manualConditions,
    allergies: manualAllergies,
    blood_type: history?.blood_type || null,
    emergency_contact: history?.emergency_contact || null,
    family_history: history?.family_history || null
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="manual" className="gap-2 text-xs sm:text-sm">
            <User className="w-4 h-4" />
            {t('myInformation')}
          </TabsTrigger>
          <TabsTrigger value="visits" className="gap-2 text-xs sm:text-sm">
            <Stethoscope className="w-4 h-4" />
            {t('fromVisits')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <MedicalHistoryManualForm
            data={formData}
            onSave={handleSaveManualData}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="visits">
          <MedicalHistoryFromVisits
            medications={visitMedications}
            conditions={visitConditions}
            allergies={visitAllergies}
            visitData={history?.visit_derived_data || {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicalHistory;
