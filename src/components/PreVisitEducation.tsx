import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Heart, AlertCircle, Lightbulb, HelpCircle, Pill, TestTube, Clock, Activity, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EducationContent {
  symptomsAndHistory: {
    title: string;
    trackingTips: string[];
    descriptors: string[];
    importantNotes: string[];
  };
  questionsForDoctor: {
    title: string;
    topConcerns: string[];
    effectiveQuestions: string[];
    clarificationPrompts: string[];
  };
  testsAndMedications: {
    title: string;
    whatToExpect: string[];
    medications: string[];
    referrals: string[];
  };
  communicationAndLiteracy: {
    title: string;
    explainingSymptoms: string[];
    takingNotes: string[];
    confirmUnderstanding: string[];
  };
  insuranceAndCosts: {
    title: string;
    insurance: string[];
    whatToBring: string[];
    costTips: string[];
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
      id: 'symptomsAndHistory',
      title: educationContent.symptomsAndHistory.title,
      description: 'Learn how to track and describe your health issue',
      content: educationContent.symptomsAndHistory,
      icon: <BookOpen className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      id: 'questionsForDoctor',
      title: educationContent.questionsForDoctor.title,
      description: 'Make the most of your appointment time',
      content: educationContent.questionsForDoctor,
      icon: <HelpCircle className="w-5 h-5" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    {
      id: 'testsAndMedications',
      title: educationContent.testsAndMedications.title,
      description: 'Know what to expect from labs, meds, and referrals',
      content: educationContent.testsAndMedications,
      icon: <Pill className="w-5 h-5" />,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      id: 'communicationAndLiteracy',
      title: educationContent.communicationAndLiteracy.title,
      description: 'Improve confidence and reduce misunderstanding',
      content: educationContent.communicationAndLiteracy,
      icon: <Lightbulb className="w-5 h-5" />,
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    {
      id: 'insuranceAndCosts',
      title: educationContent.insuranceAndCosts.title,
      description: 'Reduce anxiety around payment and paperwork',
      content: educationContent.insuranceAndCosts,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'bg-amber-50 border-amber-200 text-amber-800'
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
              Learn about your condition before your appointment
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
                  {selectedSection === 'symptomsAndHistory' && 'trackingTips' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Tracking Your Symptoms</h5>
                        <div className="space-y-1">
                          {section.content.trackingTips.map((tip, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{tip}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">How to Describe Symptoms</h5>
                        <div className="space-y-1">
                          {section.content.descriptors.map((desc, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{desc}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Important Notes</h5>
                        <div className="space-y-1">
                          {section.content.importantNotes.map((note, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{note}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'questionsForDoctor' && 'topConcerns' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Prioritizing Your Concerns</h5>
                        <div className="space-y-1">
                          {section.content.topConcerns.map((concern, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{concern}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Effective Questions</h5>
                        <div className="space-y-1">
                          {section.content.effectiveQuestions.map((q, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{q}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Asking for Clarification</h5>
                        <div className="space-y-1">
                          {section.content.clarificationPrompts.map((prompt, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{prompt}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'testsAndMedications' && 'whatToExpect' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">What to Expect</h5>
                        <div className="space-y-1">
                          {section.content.whatToExpect.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Medications</h5>
                        <div className="space-y-1">
                          {section.content.medications.map((med, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{med}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Referrals and Follow-ups</h5>
                        <div className="space-y-1">
                          {section.content.referrals.map((ref, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{ref}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'communicationAndLiteracy' && 'explainingSymptoms' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Explaining Your Symptoms</h5>
                        <div className="space-y-1">
                          {section.content.explainingSymptoms.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Taking Notes</h5>
                        <div className="space-y-1">
                          {section.content.takingNotes.map((note, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{note}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Confirming Understanding</h5>
                        <div className="space-y-1">
                          {section.content.confirmUnderstanding.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'insuranceAndCosts' && 'insurance' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Insurance Basics</h5>
                        <div className="space-y-1">
                          {section.content.insurance.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">What to Bring</h5>
                        <div className="space-y-1">
                          {section.content.whatToBring.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Cost-Saving Tips</h5>
                        <div className="space-y-1">
                          {section.content.costTips.map((tip, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{tip}</div>
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