import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

interface AIAnalysisData {
  visitSummary: string;
  prescriptions: string;
  followUpActions: string;
  keySymptoms: string[];
  doctorRecommendations: string[];
  questionsForDoctor: string[];
  keyTermsExplained?: Record<string, string>;
}

interface AIAnalysisResultsProps {
  data: AIAnalysisData;
}

export const AIAnalysisResults = ({ data }: AIAnalysisResultsProps) => {
  return (
    <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          AI Analysis Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.visitSummary && (
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold mb-3 text-purple-800 text-base">Visit Summary</h4>
            <p className="text-purple-700 leading-relaxed text-sm">{data.visitSummary}</p>
          </div>
        )}

        {data.keySymptoms?.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h4 className="font-semibold mb-3 text-red-800 text-base">Key Symptoms</h4>
            <div className="grid grid-cols-1 gap-2">
              {data.keySymptoms.map((symptom, index) => (
                <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <span className="text-red-700 text-sm">{symptom}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.keyTermsExplained && Object.keys(data.keyTermsExplained).length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold mb-3 text-blue-800 text-base">Key Terms Explained</h4>
            <div className="space-y-3">
              {Object.entries(data.keyTermsExplained).map(([term, explanation], index) => (
                <div key={index} className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="font-medium text-blue-900 text-sm mb-1">{term}</p>
                  <p className="text-blue-700 text-sm">{explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.prescriptions && data.prescriptions !== "None mentioned" && (
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold mb-3 text-green-800 text-base">Prescriptions</h4>
            <p className="text-green-700 leading-relaxed text-sm">{data.prescriptions}</p>
          </div>
        )}

        {data.followUpActions && data.followUpActions !== "None specified" && (
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <h4 className="font-semibold mb-3 text-orange-800 text-base">Follow-Up Actions</h4>
            <p className="text-orange-700 leading-relaxed text-sm">{data.followUpActions}</p>
          </div>
        )}

        {data.doctorRecommendations?.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-indigo-200">
            <h4 className="font-semibold mb-3 text-indigo-800 text-base">Doctor's Recommendations</h4>
            <div className="space-y-2">
              {data.doctorRecommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2 bg-indigo-50 p-3 rounded-lg">
                  <Badge variant="secondary" className="mt-0.5">{index + 1}</Badge>
                  <p className="text-indigo-700 text-sm flex-1">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.questionsForDoctor?.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <h4 className="font-semibold mb-3 text-yellow-800 text-base">Suggested Questions</h4>
            <ul className="space-y-2">
              {data.questionsForDoctor.map((question, index) => (
                <li key={index} className="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg">
                  <span className="text-yellow-600 text-sm font-medium">Q{index + 1}:</span>
                  <span className="text-yellow-700 text-sm flex-1">{question}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
