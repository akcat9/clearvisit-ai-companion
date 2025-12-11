import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Pill, Heart, AlertTriangle, Activity } from 'lucide-react';

interface VisitDerivedData {
  date: string;
  key_findings: string[];
  recommendations: string[];
}

interface Props {
  medications: string[];
  conditions: string[];
  allergies: string[];
  visitData: Record<string, VisitDerivedData>;
}

export const MedicalHistoryFromVisits = ({ medications, conditions, allergies, visitData }: Props) => {
  const { t } = useLanguage();

  const recentFindings = Object.entries(visitData)
    .sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
    .slice(0, 3);

  const hasData = medications.length > 0 || conditions.length > 0 || allergies.length > 0 || recentFindings.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-purple-600">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('noVisitData')}</p>
        <p className="text-xs mt-1 opacity-75">
          {t('visitDataWillAppear')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Medications from Visits */}
      {medications.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-2">
            <Pill className="w-4 h-4" />
            {t('medicationsFromVisits')}
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

      {/* Conditions from Visits */}
      {conditions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4" />
            {t('conditionsFromVisits')}
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

      {/* Allergies from Visits */}
      {allergies.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            {t('allergiesFromVisits')}
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
            {t('recentFindings')}
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
    </div>
  );
};
