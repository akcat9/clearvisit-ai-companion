import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };
  return (
    <header className="bg-primary text-primary-foreground px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-lg sm:text-xl font-semibold">Clearvisit AI</span>
        </div>
        
        {user && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">Welcome, {user.email}</span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 self-start sm:self-auto"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center gap-2 self-start sm:self-auto"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};