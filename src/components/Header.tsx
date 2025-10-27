import { LogOut, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AnnouncementsButton } from "./AnnouncementsButton";
import { AnnouncementsModal } from "./AnnouncementsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };
  return (
    <header className="bg-primary text-primary-foreground px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="tadoc" className="w-8 h-8" />
          <span className="text-lg sm:text-xl font-semibold">tadoc</span>
        </div>
        
        <div className="flex items-center gap-2">
          {user && (
            <AnnouncementsButton onClick={() => setShowAnnouncements(true)} />
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-primary-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              {user ? (
                <>
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/about")}>
                    About Us
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/subscription")}>
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/payment-portal")}>
                    Payment Portal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/contact")}>
                    Contact Us
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/privacy")}>
                    Privacy Policy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    Login/Create Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/about")}>
                    About Us
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/subscription")}>
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/contact")}>
                    Contact Us
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/privacy")}>
                    Privacy Policy
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <AnnouncementsModal 
        open={showAnnouncements} 
        onOpenChange={setShowAnnouncements} 
      />
    </header>
  );
};