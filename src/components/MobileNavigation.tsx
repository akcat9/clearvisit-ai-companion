import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadSharedVisits } from '@/hooks/useUnreadSharedVisits';
import { 
  Home, 
  Calendar, 
  User, 
  Share2, 
  Menu,
  Heart,
  LogOut
} from 'lucide-react';

export const MobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { unreadCount } = useUnreadSharedVisits();

  const navigationItems = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/dashboard',
      badge: null
    },
    {
      icon: Share2,
      label: 'Shared Visits',
      path: '/shared-visits',
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      icon: User,
      label: 'Medical Profile',
      path: '/profile',
      badge: null
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 relative ${
                isActive(item.path) ? 'text-primary' : 'text-gray-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge}
                </div>
              )}
            </Button>
          ))}
          
          {/* Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2 px-3 text-gray-600"
              >
                <Menu className="w-5 h-5" />
                <span className="text-xs font-medium">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <div className="py-4">
                <div className="flex items-center gap-3 mb-6">
                  <Heart className="w-6 h-6 text-primary" />
                  <div>
                    <h2 className="font-semibold">ClearVisit AI</h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="w-full justify-start gap-3 h-12"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          <span className="font-semibold">ClearVisit AI</span>
        </div>
      </div>
    </>
  );
};