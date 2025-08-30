import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Trash2, ChevronRight } from 'lucide-react';
import { useMobileFeatures } from '@/hooks/useMobileFeatures';
import { ImpactStyle } from '@capacitor/haptics';

interface MobileAppointmentCardProps {
  appointment: {
    id: string;
    doctor_name: string;
    date: string;
    time: string;
    reason: string;
    status: string;
  };
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
}

export const MobileAppointmentCard = ({ 
  appointment, 
  onDelete, 
  onClick 
}: MobileAppointmentCardProps) => {
  const { triggerHaptic } = useMobileFeatures();

  const handleClick = async () => {
    await triggerHaptic(ImpactStyle.Light);
    onClick();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    await triggerHaptic(ImpactStyle.Heavy);
    onDelete(appointment.id, e);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Doctor Name */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-lg">{appointment.doctor_name}</span>
            </div>
            
            {/* Date and Time */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{appointment.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{appointment.time}</span>
              </div>
            </div>
            
            {/* Reason */}
            <p className="text-sm text-gray-700 line-clamp-2">
              {appointment.reason}
            </p>
            
            {/* Status Badge */}
            <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};