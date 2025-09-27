import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-md mobile-safe">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold truncate">Clearvisit AI</h1>
        </div>
        {user && (
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            <span className="text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[200px] lg:max-w-none">Welcome, {user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings')}
              className="text-primary-foreground hover:bg-primary-foreground/10 p-1 sm:p-2"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-primary-foreground/10 p-1 sm:p-2"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};