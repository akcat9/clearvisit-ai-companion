import { Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user?: string;
  onLogout?: () => void;
}

export const Header = ({ user, onLogout }: HeaderProps) => {
  return (
    <header className="bg-primary text-primary-foreground px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6" />
          <span className="text-xl font-semibold">ClearVisit AI</span>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {user}</span>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={onLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};