import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, AlertCircle, HelpCircle, Pill, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface EducationContent {
  causesAndPathophysiology: {
    title: string;
    primaryCauses: string[];
    riskFactors: string[];
    underlyingMechanisms: string[];
  };
  treatmentRecommendations: {
    title: string;
    firstLineTherapies: string[];
    alternativeApproaches: string[];
    expectedOutcomes: string[];
    lifestyleModifications: string[];
  };
  medicationInformation: {
    title: string;
    commonMedications: string[];
    sideEffects: string[];
    drugInteractions: string[];
  };
  keyPointsForDoctor: {
    title: string;
    diagnosticQuestions: string[];
    treatmentQuestions: string[];
    prognosisQuestions: string[];
  };
  clinicalContext: {
    title: string;
    prevalence: string;
    typicalPresentation: string;
    redFlags: string[];
  };
}

interface PreVisitEducationProps {
  appointmentId: string;
  appointmentReason?: string;
  goal?: string;
  symptoms?: string;
  cachedContent?: EducationContent | null;
}

const PreVisitEducation = ({ 
  appointmentId, 
  appointmentReason, 
  goal, 
  symptoms,
  cachedContent 
}: PreVisitEducationProps) => {
  const [educationContent, setEducationContent] = useState<EducationContent | null>(cachedContent || null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    // If we have cached content, use it
    if (cachedContent) {
      setEducationContent(cachedContent);
      return;
    }

    // Otherwise, generate new content
    if (appointmentReason) {
      generateEducationContent();
    }
  }, [appointmentId, appointmentReason, goal, symptoms, cachedContent]);

  const generateEducationContent = async (forceRegenerate = false) => {
    setIsLoading(true);
    console.log('🔄 Starting education content generation...', { appointmentReason, goal, symptoms, language });
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-previsit-education', {
        body: {
          appointmentReason: appointmentReason || '',
          goal: goal || '',
          symptoms: symptoms || '',
          language: language
        }
      });

      console.log('📥 Edge function response:', { data, error });

      if (error) {
        console.error('❌ Error generating education content:', error);
        toast({
          title: t('error'),
          description: `Unable to load pre-visit information. ${error.message || ''}`,
          variant: "destructive",
        });
        return;
      }

      setEducationContent(data);

      // Save to database for caching
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ education_content: data })
        .eq('id', appointmentId);

      if (updateError) {
        console.error('Error caching education content:', updateError);
      }

      if (forceRegenerate) {
        toast({
          title: t('success'),
          description: t('preVisitEducation'),
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{t('preVisitEducation')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">{t('generating')}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!educationContent) {
    return null;
  }

  const sections = [
    {
      id: 'causesAndPathophysiology',
      title: educationContent.causesAndPathophysiology.title,
      content: educationContent.causesAndPathophysiology,
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      id: 'treatmentRecommendations',
      title: educationContent.treatmentRecommendations.title,
      content: educationContent.treatmentRecommendations,
      icon: <Heart className="w-5 h-5" />,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      id: 'medicationInformation',
      title: educationContent.medicationInformation.title,
      content: educationContent.medicationInformation,
      icon: <Pill className="w-5 h-5" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    {
      id: 'keyPointsForDoctor',
      title: educationContent.keyPointsForDoctor.title,
      content: educationContent.keyPointsForDoctor,
      icon: <HelpCircle className="w-5 h-5" />,
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    {
      id: 'clinicalContext',
      title: educationContent.clinicalContext.title,
      content: educationContent.clinicalContext,
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'bg-red-50 border-red-200 text-red-800'
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t('preVisitEducation')}</CardTitle>
            </div>
          </div>
          {educationContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateEducationContent(true)}
              disabled={isLoading}
            >
              {t('generateEducation')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section Selection */}
        <div className="grid grid-cols-1 gap-3">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedSection === section.id 
                  ? section.color + ' shadow-md' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedSection === section.id ? 'bg-white/80' : 'bg-white'
                }`}>
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{section.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Section Content */}
        {selectedSection && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            {(() => {
              const section = sections.find(s => s.id === selectedSection);
              if (!section) return null;

              return (
                <div>
                  <h4 className="font-semibold mb-3 text-sm">{section.title}</h4>
                  {selectedSection === 'causesAndPathophysiology' && 'primaryCauses' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.primaryCauses.map((cause, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{cause}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.riskFactors.map((factor, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{factor}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.underlyingMechanisms.map((mechanism, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{mechanism}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'treatmentRecommendations' && 'firstLineTherapies' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.firstLineTherapies.map((therapy, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{therapy}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.alternativeApproaches.map((approach, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{approach}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.expectedOutcomes.map((outcome, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{outcome}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.lifestyleModifications.map((mod, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{mod}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'medicationInformation' && 'commonMedications' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.commonMedications.map((med, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{med}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.sideEffects.map((effect, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{effect}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.drugInteractions.map((interaction, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{interaction}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'keyPointsForDoctor' && 'diagnosticQuestions' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.diagnosticQuestions.map((q, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{q}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.treatmentQuestions.map((q, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{q}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.prognosisQuestions.map((q, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{q}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'clinicalContext' && 'prevalence' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="text-xs text-gray-700 bg-white p-2 rounded">{section.content.prevalence}</div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="text-xs text-gray-700 bg-white p-2 rounded">{section.content.typicalPresentation}</div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          {section.content.redFlags.map((flag, index) => (
                            <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded font-medium border border-red-200">{flag}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreVisitEducation;
