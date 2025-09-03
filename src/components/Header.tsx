import { LogOut } from "lucide-react";
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
    <header className="bg-primary text-primary-foreground px-6 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/25aed346-1b70-4e98-9471-b68cf415940b.png" 
            alt="Clearvisit Logo" 
            className="w-8 h-8 object-contain"
          />
          <span className="text-xl font-semibold">Clearvisit</span>
        </div>
        
        {user && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-sm truncate">Welcome, {user.email}</span>
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
        )}
      </div>
    </header>
  );
};