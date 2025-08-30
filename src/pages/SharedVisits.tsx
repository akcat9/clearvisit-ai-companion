import { MobileHeader } from "@/components/MobileHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SharedVisits from "@/components/SharedVisits";

const SharedVisitsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <div className="bg-primary text-primary-foreground px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <User className="w-6 h-6" />
              <span className="text-xl font-semibold">ClearVisit AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader 
          title="Shared Visits" 
          showBackButton 
          backPath="/dashboard"
        />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 md:pb-8">
        {/* Desktop Back Button */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Shared Visit Summaries</h1>
        </div>

        <SharedVisits />
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default SharedVisitsPage;