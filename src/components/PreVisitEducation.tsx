import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Heart, AlertCircle, Lightbulb, HelpCircle, Pill, TestTube, Clock, Activity, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    try {
      const { data, error } = await supabase.functions.invoke('generate-previsit-education', {
        body: {
          appointmentReason: appointmentReason || '',
          goal: goal || '',
          symptoms: symptoms || ''
        }
      });

      if (error) {
        console.error('Error generating education content:', error);
        toast({
          title: "Education content unavailable",
          description: "Unable to load pre-visit information.",
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
          title: "Content refreshed",
          description: "Pre-visit education has been regenerated.",
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
            <CardTitle className="text-lg">Pre-Visit Education</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Generating personalized education content...</p>
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
      description: 'Scientific explanation of what causes your condition',
      content: educationContent.causesAndPathophysiology,
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      id: 'treatmentRecommendations',
      title: educationContent.treatmentRecommendations.title,
      description: 'Evidence-based treatment approaches and expected outcomes',
      content: educationContent.treatmentRecommendations,
      icon: <Heart className="w-5 h-5" />,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      id: 'medicationInformation',
      title: educationContent.medicationInformation.title,
      description: 'Common medications, mechanisms, and side effects',
      content: educationContent.medicationInformation,
      icon: <Pill className="w-5 h-5" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    {
      id: 'keyPointsForDoctor',
      title: educationContent.keyPointsForDoctor.title,
      description: 'Critical questions to maximize your appointment',
      content: educationContent.keyPointsForDoctor,
      icon: <HelpCircle className="w-5 h-5" />,
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    {
      id: 'clinicalContext',
      title: educationContent.clinicalContext.title,
      description: 'Medical background and warning signs to watch',
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
              <CardTitle className="text-lg">Pre-Visit Education</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Scientific medical education for your condition
            </p>
          </div>
          {educationContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateEducationContent(true)}
              disabled={isLoading}
            >
              Regenerate
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {section.description}
                  </p>
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
                        <h5 className="font-medium text-sm mb-2">Primary Causes</h5>
                        <div className="space-y-1">
                          {section.content.primaryCauses.map((cause, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{cause}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Risk Factors</h5>
                        <div className="space-y-1">
                          {section.content.riskFactors.map((factor, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{factor}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Biological Mechanisms</h5>
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
                        <h5 className="font-medium text-sm mb-2">First-Line Therapies</h5>
                        <div className="space-y-1">
                          {section.content.firstLineTherapies.map((therapy, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{therapy}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Alternative Approaches</h5>
                        <div className="space-y-1">
                          {section.content.alternativeApproaches.map((approach, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{approach}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Expected Outcomes</h5>
                        <div className="space-y-1">
                          {section.content.expectedOutcomes.map((outcome, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{outcome}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Lifestyle Modifications</h5>
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
                        <h5 className="font-medium text-sm mb-2">Common Medications</h5>
                        <div className="space-y-1">
                          {section.content.commonMedications.map((med, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{med}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Side Effects</h5>
                        <div className="space-y-1">
                          {section.content.sideEffects.map((effect, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{effect}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Drug Interactions</h5>
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
                        <h5 className="font-medium text-sm mb-2">Diagnostic Questions</h5>
                        <div className="space-y-1">
                          {section.content.diagnosticQuestions.map((q, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{q}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Treatment Questions</h5>
                        <div className="space-y-1">
                          {section.content.treatmentQuestions.map((q, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{q}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Prognosis Questions</h5>
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
                        <h5 className="font-medium text-sm mb-2">Prevalence</h5>
                        <div className="text-xs text-gray-700 bg-white p-2 rounded">{section.content.prevalence}</div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Typical Presentation</h5>
                        <div className="text-xs text-gray-700 bg-white p-2 rounded">{section.content.typicalPresentation}</div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Red Flags - Seek Immediate Care</h5>
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