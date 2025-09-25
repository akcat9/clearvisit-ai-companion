import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface DOMErrorScreenProps {
  onReload?: () => void;
  errorMessage?: string;
}

export const DOMErrorScreen = ({ 
  onReload,
  errorMessage = "The app encountered a display issue and needs to be reloaded."
}: DOMErrorScreenProps) => {
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    
    // Try custom reload handler first, fallback to window reload
    if (onReload) {
      try {
        onReload();
      } catch (error) {
        console.error('Custom reload failed:', error);
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription className="text-sm">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleReload}
            disabled={isReloading}
            className="w-full"
            size="lg"
          >
            {isReloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Reloading...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reload App
              </>
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Your data is safe and will be restored after reload
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};