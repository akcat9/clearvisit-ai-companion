import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Pill, Heart, AlertTriangle, Droplets, Phone, Users, Plus, X, Loader2 } from 'lucide-react';

export interface MedicalHistoryFormData {
  current_medications: { name: string; dosage: string; frequency: string }[];
  chronic_conditions: string[];
  allergies: string[];
  blood_type: string | null;
  emergency_contact: { name: string; phone: string; relationship: string } | null;
  family_history: string | null;
}

interface Props {
  data: MedicalHistoryFormData;
  onSave: (data: MedicalHistoryFormData) => Promise<void>;
  isSaving: boolean;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const MedicalHistoryManualForm = ({ data, onSave, isSaving }: Props) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<MedicalHistoryFormData>(data);
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '' });
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  // Sync form state when parent data changes (after save/fetch)
  useEffect(() => {
    setFormData(data);
  }, [data]);

  const addMedication = () => {
    if (newMedication.name.trim()) {
      setFormData(prev => ({
        ...prev,
        current_medications: [...prev.current_medications, { ...newMedication }]
      }));
      setNewMedication({ name: '', dosage: '', frequency: '' });
    }
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      current_medications: prev.current_medications.filter((_, i) => i !== index)
    }));
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData(prev => ({
        ...prev,
        chronic_conditions: [...prev.chronic_conditions, newCondition.trim()]
      }));
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      chronic_conditions: prev.chronic_conditions.filter((_, i) => i !== index)
    }));
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Medications */}
      <div>
        <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4" />
          {t('myMedications')}
        </h4>
        <div className="space-y-2 mb-3">
          {formData.current_medications.map((med, i) => (
            <div key={i} className="flex items-center gap-2 bg-purple-50 rounded-lg p-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex-1">
                {med.name} {med.dosage && `${med.dosage}`} {med.frequency && `- ${med.frequency}`}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => removeMedication(i)} className="h-6 w-6 p-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t('medicationName')}
            value={newMedication.name}
            onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
            className="flex-1"
          />
          <Input
            placeholder={t('dosage')}
            value={newMedication.dosage}
            onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
            className="w-full sm:w-24"
          />
          <Input
            placeholder={t('frequency')}
            value={newMedication.frequency}
            onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
            className="w-full sm:w-28"
          />
          <Button onClick={addMedication} size="sm" variant="outline" className="gap-1">
            <Plus className="w-4 h-4" /> {t('add')}
          </Button>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4" />
          {t('myConditions')}
        </h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.chronic_conditions.map((condition, i) => (
            <Badge key={i} variant="outline" className="border-purple-300 text-purple-700 gap-1">
              {condition}
              <button onClick={() => removeCondition(i)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t('conditionName')}
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCondition()}
            className="flex-1"
          />
          <Button onClick={addCondition} size="sm" variant="outline" className="gap-1">
            <Plus className="w-4 h-4" /> {t('add')}
          </Button>
        </div>
      </div>

      {/* Allergies */}
      <div>
        <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" />
          {t('myAllergies')}
        </h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.allergies.map((allergy, i) => (
            <Badge key={i} variant="destructive" className="gap-1">
              {allergy}
              <button onClick={() => removeAllergy(i)} className="ml-1 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t('allergyName')}
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
            className="flex-1"
          />
          <Button onClick={addAllergy} size="sm" variant="outline" className="gap-1">
            <Plus className="w-4 h-4" /> {t('add')}
          </Button>
        </div>
      </div>

      {/* Blood Type */}
      <div>
        <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-3">
          <Droplets className="w-4 h-4" />
          {t('bloodType')}
        </h4>
        <Select
          value={formData.blood_type || ''}
          onValueChange={(value) => setFormData(prev => ({ ...prev, blood_type: value || null }))}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('selectBloodType')} />
          </SelectTrigger>
          <SelectContent>
            {BLOOD_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Emergency Contact */}
      <div>
        <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4" />
          {t('emergencyContact')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            placeholder={t('contactName')}
            value={formData.emergency_contact?.name || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              emergency_contact: { ...(prev.emergency_contact || { name: '', phone: '', relationship: '' }), name: e.target.value }
            }))}
          />
          <Input
            placeholder={t('contactPhone')}
            value={formData.emergency_contact?.phone || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              emergency_contact: { ...(prev.emergency_contact || { name: '', phone: '', relationship: '' }), phone: e.target.value }
            }))}
          />
          <Input
            placeholder={t('relationship')}
            value={formData.emergency_contact?.relationship || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              emergency_contact: { ...(prev.emergency_contact || { name: '', phone: '', relationship: '' }), relationship: e.target.value }
            }))}
          />
        </div>
      </div>

      {/* Family History */}
      <div>
        <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" />
          {t('familyHistory')}
        </h4>
        <Textarea
          placeholder={t('familyHistoryPlaceholder')}
          value={formData.family_history || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, family_history: e.target.value }))}
          rows={3}
        />
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('saving')}
          </>
        ) : (
          t('saveChanges')
        )}
      </Button>
    </div>
  );
};
