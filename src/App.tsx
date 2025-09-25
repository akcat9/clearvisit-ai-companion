import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DOMErrorBoundary } from "@/components/DOMErrorBoundary";
import { useDOMWatchdog } from "@/hooks/useDOMWatchdog";
import { useState } from "react";
import { DOMErrorScreen } from "@/components/DOMErrorScreen";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VisitDetails from "./pages/VisitDetails";
import SharedVisitsPage from "./pages/SharedVisits";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

const AppContent = () => {
  const [showDOMError, setShowDOMError] = useState(false);

  // Monitor DOM health and show error screen if corruption detected
  useDOMWatchdog(() => {
    setShowDOMError(true);
  });

  // Show DOM error screen if corruption detected
  if (showDOMError) {
    return <DOMErrorScreen />;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
        </BrowserRouter>
  );
};

const App = () => (
  <DOMErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </DOMErrorBoundary>
);

export default App;
