import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur'];

export default function DirectionHandler() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const currentLang = i18n.language.split('-')[0]; // Get base language code (e.g., 'he' from 'he-IL')
    const isRTL = RTL_LANGUAGES.includes(currentLang);
    
    // Set document direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    
    // Also set on body for extra compatibility
    document.body.dir = isRTL ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return null;
}
