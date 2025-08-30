import { Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MobileHeaderProps {
  title: string;
  showBackButton?: boolean;
  backPath?: string;
  rightAction?: React.ReactNode;
}

export const MobileHeader = ({ 
  title, 
  showBackButton = false, 
  backPath = '/dashboard',
  rightAction 
}: MobileHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backPath)}
            className="text-primary-foreground hover:bg-primary-foreground/10 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
          <Heart className="w-5 h-5" />
        )}
        <span className="font-semibold text-lg">{title}</span>
      </div>
      {rightAction && (
        <div className="flex items-center">
          {rightAction}
        </div>
      )}
    </div>
  );
};