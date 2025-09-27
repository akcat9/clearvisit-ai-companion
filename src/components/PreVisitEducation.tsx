import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Heart, AlertCircle, Lightbulb, HelpCircle, Pill, TestTube, Clock, Activity, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EducationContent {
  mainCondition: {
    title: string;
    description: string;
    explanation: string;
  };
  possibleCauses: string[];
  commonSymptoms: string[];
  preparationTips: string[];
  questionsToAsk: string[];
  pharmaceuticals?: {
    title: string;
    medications: Array<{
      name: string;
      purpose: string;
      commonSideEffects: string[];
      interactions: string;
    }>;
  };
  diagnosticTests?: {
    title: string;
    tests: Array<{
      name: string;
      purpose: string;
      procedure: string;
      preparation: string;
    }>;
  };
  treatmentTimeline?: {
    title: string;
    phases: Array<{
      phase: string;
      duration: string;
      expectations: string;
    }>;
  };
  lifestyleFactors?: {
    title: string;
    diet: string[];
    exercise: string[];
    lifestyle: string[];
  };
  costInsurance?: {
    title: string;
    questions: string[];
    tips: string[];
  };
}

interface PreVisitEducationProps {
  appointmentReason?: string;
  goal?: string;
  symptoms?: string;
}

const PreVisitEducation = ({ appointmentReason, goal, symptoms }: PreVisitEducationProps) => {
  const [educationContent, setEducationContent] = useState<EducationContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (appointmentReason) {
      generateEducationContent();
    }
  }, [appointmentReason, goal, symptoms]);

  const generateEducationContent = async () => {
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
      id: 'condition',
      title: educationContent.mainCondition.title,
      description: educationContent.mainCondition.description,
      content: educationContent.mainCondition.explanation,
      icon: <Heart className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      id: 'causes',
      title: 'Possible Causes',
      description: 'What might be causing this',
      content: educationContent.possibleCauses,
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    {
      id: 'symptoms',
      title: 'Common Symptoms',
      description: 'What to look out for',
      content: educationContent.commonSymptoms,
      icon: <BookOpen className="w-5 h-5" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    {
      id: 'preparation',
      title: 'Visit Preparation',
      description: 'How to prepare for your appointment',
      content: educationContent.preparationTips,
      icon: <Lightbulb className="w-5 h-5" />,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      id: 'questions',
      title: 'Questions to Ask',
      description: 'Important questions for your doctor',
      content: educationContent.questionsToAsk,
      icon: <HelpCircle className="w-5 h-5" />,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
    ...(educationContent.pharmaceuticals ? [{
      id: 'pharmaceuticals',
      title: educationContent.pharmaceuticals.title,
      description: 'Medications for this condition',
      content: educationContent.pharmaceuticals,
      icon: <Pill className="w-5 h-5" />,
      color: 'bg-red-50 border-red-200 text-red-800'
    }] : []),
    ...(educationContent.diagnosticTests ? [{
      id: 'tests',
      title: educationContent.diagnosticTests.title,
      description: 'Tests your doctor may order',
      content: educationContent.diagnosticTests,
      icon: <TestTube className="w-5 h-5" />,
      color: 'bg-cyan-50 border-cyan-200 text-cyan-800'
    }] : []),
    ...(educationContent.treatmentTimeline ? [{
      id: 'timeline',
      title: educationContent.treatmentTimeline.title,
      description: 'Treatment expectations',
      content: educationContent.treatmentTimeline,
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-800'
    }] : []),
    ...(educationContent.lifestyleFactors ? [{
      id: 'lifestyle',
      title: educationContent.lifestyleFactors.title,
      description: 'Lifestyle recommendations',
      content: educationContent.lifestyleFactors,
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800'
    }] : []),
    ...(educationContent.costInsurance ? [{
      id: 'cost',
      title: educationContent.costInsurance.title,
      description: 'Cost and insurance considerations',
      content: educationContent.costInsurance,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'bg-amber-50 border-amber-200 text-amber-800'
    }] : [])
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Pre-Visit Education</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Learn about your condition before your appointment
        </p>
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
                  <h4 className="font-semibold mb-2 text-sm">{section.title}</h4>
                  {/* Handle different content types */}
                  {selectedSection === 'pharmaceuticals' && section.content && typeof section.content === 'object' && 'medications' in section.content ? (
                    <div className="space-y-3">
                      {section.content.medications.map((med, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <h5 className="font-medium text-sm mb-1">{med.name}</h5>
                          <p className="text-xs text-gray-600 mb-2">{med.purpose}</p>
                          {med.commonSideEffects.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs font-medium">Side effects: </span>
                              <span className="text-xs text-gray-600">{med.commonSideEffects.join(', ')}</span>
                            </div>
                          )}
                          {med.interactions && (
                            <div>
                              <span className="text-xs font-medium">Interactions: </span>
                              <span className="text-xs text-gray-600">{med.interactions}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : selectedSection === 'tests' && section.content && typeof section.content === 'object' && 'tests' in section.content ? (
                    <div className="space-y-3">
                      {section.content.tests.map((test, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <h5 className="font-medium text-sm mb-1">{test.name}</h5>
                          <p className="text-xs text-gray-600 mb-2"><strong>Purpose:</strong> {test.purpose}</p>
                          <p className="text-xs text-gray-600 mb-2"><strong>Procedure:</strong> {test.procedure}</p>
                          <p className="text-xs text-gray-600"><strong>Preparation:</strong> {test.preparation}</p>
                        </div>
                      ))}
                    </div>
                  ) : selectedSection === 'timeline' && section.content && typeof section.content === 'object' && 'phases' in section.content ? (
                    <div className="space-y-3">
                      {section.content.phases.map((phase, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <h5 className="font-medium text-sm mb-1">{phase.phase}</h5>
                          <p className="text-xs text-gray-600 mb-2"><strong>Duration:</strong> {phase.duration}</p>
                          <p className="text-xs text-gray-600">{phase.expectations}</p>
                        </div>
                      ))}
                    </div>
                  ) : selectedSection === 'lifestyle' && section.content && typeof section.content === 'object' && 'diet' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Diet Recommendations</h5>
                        <div className="space-y-1">
                          {section.content.diet.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Exercise Guidelines</h5>
                        <div className="space-y-1">
                          {section.content.exercise.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Lifestyle Changes</h5>
                        <div className="space-y-1">
                          {section.content.lifestyle.map((item, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{item}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedSection === 'cost' && section.content && typeof section.content === 'object' && 'questions' in section.content ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Questions to Ask</h5>
                        <div className="space-y-1">
                          {section.content.questions.map((question, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{question}</div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-medium text-sm mb-2">Money-Saving Tips</h5>
                        <div className="space-y-1">
                          {section.content.tips.map((tip, index) => (
                            <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">{tip}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : Array.isArray(section.content) ? (
                    <div className="space-y-2">
                      {(section.content as string[]).map((item, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : typeof section.content === 'string' ? (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {section.content}
                    </p>
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