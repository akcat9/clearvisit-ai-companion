import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, ArrowLeft, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    toast({
      title: t('settings.languageUpdated'),
      description: t('settings.languageUpdatedDesc'),
    });
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: t('settings.confirmationRequired'),
        description: t('settings.pleaseTypeDelete'),
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
          title: t('settings.errorDeleting'),
          description: t('settings.errorDeletingDesc'),
          variant: "destructive",
        });
        setIsDeleting(false);
        return;
      }

      toast({
        title: t('settings.accountDeleted'),
        description: t('settings.accountDeletedDesc'),
      });

      // Sign out and redirect to home
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('settings.errorDeleting'),
        description: t('settings.errorDeletingDesc'),
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
            {t('settings.backToDashboard')}
          </Button>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground">{t('settings.subtitle')}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.accountInfo')}</CardTitle>
              <CardDescription>
                {t('settings.accountDetails')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">{t('settings.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('settings.emailChangeNotSupported')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                {t('settings.preferences')}
              </CardTitle>
              <CardDescription>
                {t('settings.preferencesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language">{t('settings.language')}</Label>
                <Select value={i18n.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue placeholder={t('settings.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('languages.en')}</SelectItem>
                    <SelectItem value="es">{t('languages.es')}</SelectItem>
                    <SelectItem value="ar">{t('languages.ar')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('settings.selectLanguage')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.support')}</CardTitle>
              <CardDescription>
                {t('settings.supportDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.supportText')}
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
                {t('settings.dangerZone')}
              </CardTitle>
              <CardDescription>
                {t('settings.dangerZoneDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
                <h3 className="font-semibold mb-2">{t('settings.deleteAccount')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('settings.deleteAccountDesc')}
                </p>
                
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {t('settings.deleteAccount')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('settings.areYouSure')}</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          {t('settings.cannotBeUndone')}
                        </p>
                        <p className="font-semibold">{t('settings.thisIncludes')}</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>{t('settings.allAppointments')}</li>
                          <li>{t('settings.allSharedVisits')}</li>
                          <li>{t('settings.profileInfo')}</li>
                          <li>{t('settings.allAiSummaries')}</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="confirm-delete" className="text-sm font-medium">
                        {t('settings.typeDelete')} <code className="bg-muted px-1 py-0.5 rounded text-xs">DELETE</code> {t('settings.toConfirm')}
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={t('settings.typeDeleteHere')}
                        className="mt-2"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmText("")}>
                        {t('settings.cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={confirmText !== "DELETE" || isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting ? t('settings.deleting') : t('settings.deleteAccount')}
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