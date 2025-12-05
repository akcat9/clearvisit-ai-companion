import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronDown, 
  ChevronUp, 
  Pill, 
  AlertTriangle, 
  Heart, 
  Scissors, 
  Users, 
  Droplets,
  Phone,
  Sparkles,
  Plus,
  Trash2,
  Save
} from 'lucide-react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Allergy {
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface Condition {
  condition: string;
  diagnosedDate: string;
  status: string;
}

interface Surgery {
  procedure: string;
  date: string;
  hospital: string;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface VisitDerivedData {
  visitHistory?: Array<{
    date: string;
    doctor: string;
    reason: string;
    keyFindings: string[];
    newMedications: string[];
  }>;
  allMedicationsFromVisits?: string[];
  conditionsMentioned?: string[];
}

interface MedicalHistoryData {
  id?: string;
  user_id: string;
  current_medications: Medication[];
  allergies: Allergy[];
  chronic_conditions: Condition[];
  past_surgeries: Surgery[];
  family_history: string;
  blood_type: string;
  emergency_contact: EmergencyContact | null;
  visit_derived_data: VisitDerivedData;
}

const MedicalHistory = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryData>({
    user_id: user?.id || '',
    current_medications: [],
    allergies: [],
    chronic_conditions: [],
    past_surgeries: [],
    family_history: '',
    blood_type: '',
    emergency_contact: null,
    visit_derived_data: {}
  });

  // Only fetch when expanded for the first time
  useEffect(() => {
    if (isOpen && !hasFetched && user?.id) {
      fetchMedicalHistory();
    }
  }, [isOpen, hasFetched, user?.id]);

  const fetchMedicalHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('medical_history')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching medical history:', error);
        return;
      }

      if (data) {
        setMedicalHistory({
          id: data.id,
          user_id: data.user_id,
          current_medications: data.current_medications || [],
          allergies: data.allergies || [],
          chronic_conditions: data.chronic_conditions || [],
          past_surgeries: data.past_surgeries || [],
          family_history: data.family_history || '',
          blood_type: data.blood_type || '',
          emergency_contact: data.emergency_contact || null,
          visit_derived_data: data.visit_derived_data || {}
        });
      }
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('medical_history')
        .upsert({
          user_id: user.id,
          current_medications: medicalHistory.current_medications,
          allergies: medicalHistory.allergies,
          chronic_conditions: medicalHistory.chronic_conditions,
          past_surgeries: medicalHistory.past_surgeries,
          family_history: medicalHistory.family_history,
          blood_type: medicalHistory.blood_type,
          emergency_contact: medicalHistory.emergency_contact,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('medicalHistorySaved')
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: t('error'),
        description: t('saveFailed'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Medication handlers
  const addMedication = () => {
    setMedicalHistory(prev => ({
      ...prev,
      current_medications: [...prev.current_medications, { name: '', dosage: '', frequency: '' }]
    }));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setMedicalHistory(prev => ({
      ...prev,
      current_medications: prev.current_medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const removeMedication = (index: number) => {
    setMedicalHistory(prev => ({
      ...prev,
      current_medications: prev.current_medications.filter((_, i) => i !== index)
    }));
  };

  // Allergy handlers
  const addAllergy = () => {
    setMedicalHistory(prev => ({
      ...prev,
      allergies: [...prev.allergies, { allergen: '', reaction: '', severity: 'mild' }]
    }));
  };

  const updateAllergy = (index: number, field: keyof Allergy, value: string) => {
    setMedicalHistory(prev => ({
      ...prev,
      allergies: prev.allergies.map((allergy, i) => 
        i === index ? { ...allergy, [field]: value } : allergy
      )
    }));
  };

  const removeAllergy = (index: number) => {
    setMedicalHistory(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  // Condition handlers
  const addCondition = () => {
    setMedicalHistory(prev => ({
      ...prev,
      chronic_conditions: [...prev.chronic_conditions, { condition: '', diagnosedDate: '', status: 'active' }]
    }));
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    setMedicalHistory(prev => ({
      ...prev,
      chronic_conditions: prev.chronic_conditions.map((cond, i) => 
        i === index ? { ...cond, [field]: value } : cond
      )
    }));
  };

  const removeCondition = (index: number) => {
    setMedicalHistory(prev => ({
      ...prev,
      chronic_conditions: prev.chronic_conditions.filter((_, i) => i !== index)
    }));
  };

  // Surgery handlers
  const addSurgery = () => {
    setMedicalHistory(prev => ({
      ...prev,
      past_surgeries: [...prev.past_surgeries, { procedure: '', date: '', hospital: '' }]
    }));
  };

  const updateSurgery = (index: number, field: keyof Surgery, value: string) => {
    setMedicalHistory(prev => ({
      ...prev,
      past_surgeries: prev.past_surgeries.map((surgery, i) => 
        i === index ? { ...surgery, [field]: value } : surgery
      )
    }));
  };

  const removeSurgery = (index: number) => {
    setMedicalHistory(prev => ({
      ...prev,
      past_surgeries: prev.past_surgeries.filter((_, i) => i !== index)
    }));
  };

  const quickStats = {
    medications: medicalHistory.current_medications.length,
    allergies: medicalHistory.allergies.length,
    conditions: medicalHistory.chronic_conditions.length,
    visitDerived: medicalHistory.visit_derived_data?.visitHistory?.length || 0
  };

  return (
    <Card className="mb-4 sm:mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <CardTitle className="text-base sm:text-lg">{t('medicalHistory')}</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{quickStats.medications} {t('medications')}</span>
                  <span>•</span>
                  <span>{quickStats.allergies} {t('allergiesCount')}</span>
                  {quickStats.visitDerived > 0 && (
                    <>
                      <span>•</span>
                      <span>{quickStats.visitDerived} {t('visitUpdates')}</span>
                    </>
                  )}
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <>
                {/* Current Medications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Pill className="w-4 h-4" />
                      {t('currentMedications')}
                    </Label>
                    <Button variant="outline" size="sm" onClick={addMedication}>
                      <Plus className="w-3 h-3 mr-1" /> {t('add')}
                    </Button>
                  </div>
                  {medicalHistory.current_medications.map((med, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
                      <Input
                        placeholder={t('medicationName')}
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder={t('dosage')}
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      />
                      <Input
                        placeholder={t('frequency')}
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeMedication(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Allergies */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      {t('allergiesLabel')}
                    </Label>
                    <Button variant="outline" size="sm" onClick={addAllergy}>
                      <Plus className="w-3 h-3 mr-1" /> {t('add')}
                    </Button>
                  </div>
                  {medicalHistory.allergies.map((allergy, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
                      <Input
                        placeholder={t('allergen')}
                        value={allergy.allergen}
                        onChange={(e) => updateAllergy(index, 'allergen', e.target.value)}
                      />
                      <Input
                        placeholder={t('reaction')}
                        value={allergy.reaction}
                        onChange={(e) => updateAllergy(index, 'reaction', e.target.value)}
                      />
                      <Select value={allergy.severity} onValueChange={(val) => updateAllergy(index, 'severity', val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">{t('mild')}</SelectItem>
                          <SelectItem value="moderate">{t('moderate')}</SelectItem>
                          <SelectItem value="severe">{t('severe')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => removeAllergy(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Chronic Conditions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Heart className="w-4 h-4" />
                      {t('chronicConditions')}
                    </Label>
                    <Button variant="outline" size="sm" onClick={addCondition}>
                      <Plus className="w-3 h-3 mr-1" /> {t('add')}
                    </Button>
                  </div>
                  {medicalHistory.chronic_conditions.map((cond, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
                      <Input
                        placeholder={t('conditionName')}
                        value={cond.condition}
                        onChange={(e) => updateCondition(index, 'condition', e.target.value)}
                      />
                      <Input
                        type="date"
                        placeholder={t('diagnosedDate')}
                        value={cond.diagnosedDate}
                        onChange={(e) => updateCondition(index, 'diagnosedDate', e.target.value)}
                      />
                      <Input
                        placeholder={t('status')}
                        value={cond.status}
                        onChange={(e) => updateCondition(index, 'status', e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Past Surgeries */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Scissors className="w-4 h-4" />
                      {t('pastSurgeries')}
                    </Label>
                    <Button variant="outline" size="sm" onClick={addSurgery}>
                      <Plus className="w-3 h-3 mr-1" /> {t('add')}
                    </Button>
                  </div>
                  {medicalHistory.past_surgeries.map((surgery, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
                      <Input
                        placeholder={t('procedure')}
                        value={surgery.procedure}
                        onChange={(e) => updateSurgery(index, 'procedure', e.target.value)}
                      />
                      <Input
                        type="date"
                        placeholder={t('date')}
                        value={surgery.date}
                        onChange={(e) => updateSurgery(index, 'date', e.target.value)}
                      />
                      <Input
                        placeholder={t('hospital')}
                        value={surgery.hospital}
                        onChange={(e) => updateSurgery(index, 'hospital', e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeSurgery(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Family History */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    {t('familyHistory')}
                  </Label>
                  <Textarea
                    placeholder={t('familyHistoryPlaceholder')}
                    value={medicalHistory.family_history}
                    onChange={(e) => setMedicalHistory(prev => ({ ...prev, family_history: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Blood Type & Emergency Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Droplets className="w-4 h-4" />
                      {t('bloodType')}
                    </Label>
                    <Select 
                      value={medicalHistory.blood_type} 
                      onValueChange={(val) => setMedicalHistory(prev => ({ ...prev, blood_type: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectBloodType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Phone className="w-4 h-4" />
                      {t('emergencyContact')}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder={t('name')}
                        value={medicalHistory.emergency_contact?.name || ''}
                        onChange={(e) => setMedicalHistory(prev => ({
                          ...prev,
                          emergency_contact: { ...prev.emergency_contact, name: e.target.value, phone: prev.emergency_contact?.phone || '', relationship: prev.emergency_contact?.relationship || '' }
                        }))}
                      />
                      <Input
                        placeholder={t('phone')}
                        value={medicalHistory.emergency_contact?.phone || ''}
                        onChange={(e) => setMedicalHistory(prev => ({
                          ...prev,
                          emergency_contact: { ...prev.emergency_contact, phone: e.target.value, name: prev.emergency_contact?.name || '', relationship: prev.emergency_contact?.relationship || '' }
                        }))}
                      />
                      <Input
                        placeholder={t('relationship')}
                        value={medicalHistory.emergency_contact?.relationship || ''}
                        onChange={(e) => setMedicalHistory(prev => ({
                          ...prev,
                          emergency_contact: { ...prev.emergency_contact, relationship: e.target.value, name: prev.emergency_contact?.name || '', phone: prev.emergency_contact?.phone || '' }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Visit-Derived Data (Read-only) */}
                {medicalHistory.visit_derived_data?.visitHistory && medicalHistory.visit_derived_data.visitHistory.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="w-4 h-4 text-primary" />
                      {t('autoUpdatedFromVisits')}
                    </Label>
                    <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                      {medicalHistory.visit_derived_data.allMedicationsFromVisits && medicalHistory.visit_derived_data.allMedicationsFromVisits.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">{t('medicationsFromVisits')}:</span>
                          <p className="text-sm">{medicalHistory.visit_derived_data.allMedicationsFromVisits.join(', ')}</p>
                        </div>
                      )}
                      {medicalHistory.visit_derived_data.conditionsMentioned && medicalHistory.visit_derived_data.conditionsMentioned.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">{t('conditionsFromVisits')}:</span>
                          <p className="text-sm">{medicalHistory.visit_derived_data.conditionsMentioned.join(', ')}</p>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {t('basedOnVisits').replace('{{count}}', String(medicalHistory.visit_derived_data.visitHistory.length))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? t('saving') : t('saveMedicalHistory')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default MedicalHistory;
