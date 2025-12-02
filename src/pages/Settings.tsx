import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: t('error'),
        description: "Please type 'DELETE' to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user?.id }
      });

      if (error) {
        console.error('Error deleting account:', error);
        toast({
          title: t('error'),
          description: "There was an error deleting your account. Please try again.",
          variant: "destructive",
        });
        setIsDeleting(false);
        return;
      }

      toast({
        title: t('success'),
        description: "Your account and all data have been permanently deleted.",
      });

      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('error'),
        description: "There was an error deleting your account. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Button>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t('accountSettings')}</h1>
            <p className="text-muted-foreground">{t('accountInformation')}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('accountInformation')}</CardTitle>
              <CardDescription>
                {t('emailReadOnly')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('emailReadOnly')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('needHelp')}</CardTitle>
              <CardDescription>
                {t('contactSupport')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t('contactSupport')}
              </p>
              <p className="text-sm font-medium">
                <a 
                  href="mailto:aktennis9@gmail.com" 
                  className="text-primary hover:underline"
                >
                  aktennis9@gmail.com
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {t('dangerZone')}
              </CardTitle>
              <CardDescription>
                {t('deleteAccountWarning')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
                <h3 className="font-semibold mb-2">{t('deleteAccount')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('deleteAccountWarning')}
                </p>
                
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {t('deleteAccount')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteAccountConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>{t('deleteAccountDescription')}</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="confirm-delete" className="text-sm font-medium">
                        Type <code className="bg-muted px-1 py-0.5 rounded text-xs">DELETE</code> to confirm
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DELETE here"
                        className="mt-2"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmText("")}>
                        {t('cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={confirmText !== "DELETE" || isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting ? t('deleting') : t('deleteAccount')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
