import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import ar from '@/locales/ar.json';

// Language resources
const resources = {
  en: { translation: en },
  es: { translation: es },
  ar: { translation: ar },
};

// Get stored language or detect from browser
const storedLanguage = localStorage.getItem('tadoc_language');
const browserLanguage = navigator.language.split('-')[0]; // e.g., 'en-US' -> 'en'
const supportedLanguages = ['en', 'es', 'ar'];
const defaultLanguage = storedLanguage || 
  (supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('tadoc_language', lng);
  // Set direction for RTL languages
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
});

// Set initial direction
document.documentElement.dir = defaultLanguage === 'ar' ? 'rtl' : 'ltr';

export default i18n;
