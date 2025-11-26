import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronRight } from 'lucide-react';
import { formatTime } from '@/utils/timeUtils';
import { useTranslation } from 'react-i18next';

interface AppointmentCardProps {
  id: string;
  doctor_name: string;
  date: string;
  time: string;
  reason: string;
  onNavigate: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const AppointmentCard = memo(({ 
  id, 
  doctor_name, 
  date, 
  time, 
  reason, 
  onNavigate, 
  onDelete 
}: AppointmentCardProps) => {
  const { t } = useTranslation();
  
  return (
    <div 
      className="p-2 sm:p-3 lg:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer group relative transition-colors"
      onClick={() => onNavigate(id)}
    >
      <div className="font-medium text-sm sm:text-base pr-8">{doctor_name}</div>
      <div className="text-xs sm:text-sm text-muted-foreground">
        {date} {t('visitDetails.at')} {formatTime(time)}
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground mt-1 pr-8 line-clamp-2">
        {reason}
      </div>
      <div className="flex items-center justify-between mt-2 sm:mt-3">
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-3"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(id);
            }}
          >
            {t('appointment.go')} <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
        onClick={(e) => onDelete(id, e)}
      >
        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
});

AppointmentCard.displayName = 'AppointmentCard';
