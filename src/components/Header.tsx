import { LogOut, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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

  const handleSignOut = async () => {
    await signOut();
  };
  return (
    <header className="bg-primary text-primary-foreground px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/logo.png" alt="tadoc" className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="text-base sm:text-lg font-semibold">tadoc</span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20 h-9 w-9 sm:h-10 sm:w-10"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-background z-50 border shadow-lg"
            >
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
    </header>
  );
};