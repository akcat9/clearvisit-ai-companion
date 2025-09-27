import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect, lazy, Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const VisitDetails = lazy(() => import("./pages/VisitDetails"));
const SharedVisitsPage = lazy(() => import("./pages/SharedVisits"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for lazy loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5)
      gcTime: 5 * 60 * 1000, // 5 minutes (reduced from 10)
    },
  },
});

const AppContent = () => {
  useEffect(() => {
    let lastActiveTime = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastActive = Date.now() - lastActiveTime;
        // Reduced from 30 to 5 minutes for better WebView stability
        if (timeSinceLastActive > 5 * 60 * 1000) {
          window.location.reload();
        }
      } else {
        lastActiveTime = Date.now();
      }
    };

    // Also check every 10 minutes and reload if performance is degraded
    const performanceCheck = setInterval(() => {
      // Type assertion for performance.memory (Chrome-specific)
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
        console.log('Memory usage high, refreshing...');
        window.location.reload();
      }
    }, 10 * 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(performanceCheck);
    };
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
              <Route path="/" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/visit/:id" 
                element={
                  <ProtectedRoute>
                    <VisitDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/shared-visits" 
                element={
                  <ProtectedRoute>
                    <SharedVisitsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
