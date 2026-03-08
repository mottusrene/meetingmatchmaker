"use client";

import enTranslations from "../content/en.json";

// For now, we only support English. If we add more languages later, 
// this could check localStorage or browser language to select the right dictionary.
const dictionaries: Record<string, any> = {
  en: enTranslations,
};

type DictionaryPath = string;

export function useTranslation(locale = "en") {
  const dictionary = dictionaries[locale] || dictionaries["en"];

  // Helper function to safely traverse the nested JSON object using dot notation
  // e.g. t('landing.heroTitle')
  const t = (path: DictionaryPath, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let current = dictionary;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation key not found: ${path}`);
        return path; // Fallback to returning the key itself
      }
      current = current[key];
    }
    
    let result = current as string;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    
    return result;
  };

  return { t, locale };
}
