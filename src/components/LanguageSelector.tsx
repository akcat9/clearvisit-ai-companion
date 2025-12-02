import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/i18n/translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const languages: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const handleLanguageChange = async (value: Language) => {
    await setLanguage(value);
    toast({
      title: t('languageUpdated'),
      description: languages.find(l => l.value === value)?.label,
    });
  };

  const currentLang = languages.find(l => l.value === language);

  return (
    <Select value={language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-auto gap-1 border-0 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 focus:ring-0 focus:ring-offset-0 h-8 px-2">
        <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
        <SelectValue>
          <span className="text-xs sm:text-sm">{currentLang?.flag}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
