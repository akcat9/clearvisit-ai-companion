import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, FileText, Pill, Calendar, AlertCircle } from 'lucide-react';
import ShareVisitModal from './ShareVisitModal';

interface MobileVisitSummaryProps {
  aiGeneratedData: {
    visitSummary: string;
    prescriptions: string;
    followUpActions: string;
    keySymptoms: string[];
    doctorRecommendations: string[];
    questionsForDoctor: string[];
  };
  appointmentData: {
    doctor_name: string;
    date: string;
    time: string;
    reason: string;
    goal?: string;
  };
}

export const MobileVisitSummary = ({ 
  aiGeneratedData, 
  appointmentData 
}: MobileVisitSummaryProps) => {
  return (
    <div className="space-y-4 pb-24 md:pb-0">
      {/* Visit Summary */}
      {aiGeneratedData.visitSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Visit Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 leading-relaxed">
                {aiGeneratedData.visitSummary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Symptoms */}
      {aiGeneratedData.keySymptoms && aiGeneratedData.keySymptoms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5" />
              Symptoms Discussed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {aiGeneratedData.keySymptoms.map((symptom, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1">
                  {symptom}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prescriptions */}
      {aiGeneratedData.prescriptions && aiGeneratedData.prescriptions !== "None mentioned" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pill className="w-5 h-5" />
              Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 leading-relaxed">
                {aiGeneratedData.prescriptions}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor's Recommendations */}
      {aiGeneratedData.doctorRecommendations && aiGeneratedData.doctorRecommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Doctor's Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiGeneratedData.doctorRecommendations.map((recommendation, index) => (
                <div key={index} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                  <p className="text-sm text-purple-800 leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-up Actions */}
      {aiGeneratedData.followUpActions && aiGeneratedData.followUpActions !== "None specified" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Follow-up Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800 leading-relaxed">
                {aiGeneratedData.followUpActions}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions for Doctor */}
      {aiGeneratedData.questionsForDoctor && aiGeneratedData.questionsForDoctor.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Questions for Next Visit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiGeneratedData.questionsForDoctor.map((question, index) => (
                <div key={index} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                  <p className="text-sm text-orange-800 leading-relaxed">{question}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Button */}
      <div className="pt-4">
        <ShareVisitModal 
          visitSummary={aiGeneratedData} 
          appointmentData={appointmentData}
          trigger={
            <Button className="w-full" size="lg">
              <Share2 className="w-5 h-5 mr-2" />
              Share Visit Summary
            </Button>
          }
        />
      </div>
    </div>
  );
};