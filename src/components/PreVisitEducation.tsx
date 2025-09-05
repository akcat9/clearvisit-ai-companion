import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Heart, Brain, Stethoscope, Activity } from 'lucide-react';

interface EducationTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  icon: React.ReactNode;
  color: string;
}

const educationTopics: EducationTopic[] = [
  {
    id: 'stenosis',
    title: 'Stenosis',
    description: 'Narrowing of blood vessels or other body passages',
    content: 'Stenosis occurs when arteries or other passages in your body become narrow. This can restrict blood flow and cause various symptoms. Common types include carotid stenosis (neck arteries) and coronary stenosis (heart arteries). Symptoms may include chest pain, shortness of breath, or dizziness.',
    icon: <Heart className="w-5 h-5" />,
    color: 'bg-red-50 border-red-200 text-red-800'
  },
  {
    id: 'hypertension',
    title: 'High Blood Pressure',
    description: 'When blood pressure is consistently too high',
    content: 'High blood pressure (hypertension) means your blood pushes against artery walls with too much force. Normal is less than 120/80. High blood pressure often has no symptoms but can lead to serious problems like heart disease or stroke if untreated.',
    icon: <Activity className="w-5 h-5" />,
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  {
    id: 'diabetes',
    title: 'Diabetes',
    description: 'When your body cannot properly control blood sugar',
    content: 'Diabetes occurs when your body cannot make enough insulin or use it properly. This causes high blood sugar levels. Type 1 diabetes usually starts in childhood. Type 2 diabetes is more common and often develops in adults. Symptoms include frequent urination, thirst, and fatigue.',
    icon: <Stethoscope className="w-5 h-5" />,
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    id: 'anxiety',
    title: 'Anxiety',
    description: 'Excessive worry or fear that affects daily life',
    content: 'Anxiety is more than normal worry - it is persistent fear that interferes with daily activities. Physical symptoms can include rapid heartbeat, sweating, and difficulty breathing. It is treatable with therapy, medication, or lifestyle changes.',
    icon: <Brain className="w-5 h-5" />,
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  }
];

interface PreVisitEducationProps {
  appointmentReason?: string;
}

const PreVisitEducation = ({ appointmentReason }: PreVisitEducationProps) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Find relevant topics based on appointment reason
  const getRelevantTopics = () => {
    if (!appointmentReason) return educationTopics.slice(0, 2);
    
    const reason = appointmentReason.toLowerCase();
    const relevant = educationTopics.filter(topic => 
      reason.includes(topic.id) || 
      reason.includes(topic.title.toLowerCase())
    );
    
    return relevant.length > 0 ? relevant : educationTopics.slice(0, 2);
  };

  const relevantTopics = getRelevantTopics();

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
        {/* Topic Selection */}
        <div className="grid grid-cols-1 gap-3">
          {relevantTopics.map((topic) => (
            <div
              key={topic.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedTopic === topic.id 
                  ? topic.color + ' shadow-md' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedTopic === topic.id ? 'bg-white/80' : 'bg-white'
                }`}>
                  {topic.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{topic.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {topic.description}
                  </p>
                  {appointmentReason?.toLowerCase().includes(topic.id) && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Related to your visit
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Topic Content */}
        {selectedTopic && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            {(() => {
              const topic = relevantTopics.find(t => t.id === selectedTopic);
              return topic ? (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">About {topic.title}</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {topic.content}
                  </p>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-sm text-blue-800 mb-2">
            Preparing for Your Visit
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Write down your main concerns and questions</li>
            <li>• List all medications you are taking</li>
            <li>• Note when symptoms started and what triggers them</li>
            <li>• Bring your insurance card and ID</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreVisitEducation;