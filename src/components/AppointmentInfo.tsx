import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { formatTime } from '@/utils/formatters';

interface AppointmentInfoProps {
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  goal?: string;
  symptoms?: string;
}

export const AppointmentInfo = ({ 
  doctorName, 
  date, 
  time, 
  reason, 
  goal, 
  symptoms 
}: AppointmentInfoProps) => {
  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Appointment Information
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-semibold text-blue-800">Doctor:</span> 
          <span className="text-blue-700">{doctorName}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-semibold text-blue-800">Date & Time:</span> 
          <span className="text-blue-700">{date} at {formatTime(time)}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-semibold text-blue-800">Reason:</span> 
          <span className="text-blue-700">{reason}</span>
        </div>
        {goal && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="font-semibold text-blue-800">Goal:</span> 
            <span className="text-blue-700">{goal}</span>
          </div>
        )}
        {symptoms && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="font-semibold text-blue-800">Symptoms:</span> 
            <span className="text-blue-700">{symptoms}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
