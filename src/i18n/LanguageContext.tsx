import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Lang, translations, RTL_LANGS } from './translations';

const STORAGE_KEY = 'ssm_lang';
const SUPPORTED: Lang[] = ['fr', 'en', 'ar'];

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'fr';
  // 1. Choix mémorisé de l'utilisateur
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && SUPPORTED.includes(stored)) return stored;
  // 2. Détection navigateur
  const langs = window.navigator.languages || [window.navigator.language || 'fr'];
  for (const l of langs) {
    const base = l.slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(base as Lang)) return base as Lang;
  }
  // 3. Repli français
  return 'fr';
}

interface LanguageContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const dir: 'rtl' | 'ltr' = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('lang', lang);
    el.setAttribute('dir', dir);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage indisponible : on ignore */
    }
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => {
    if (SUPPORTED.includes(next)) setLangState(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = translations[lang] || translations.fr;
      const value = dict[key] ?? translations.fr[key] ?? key;
      return interpolate(value, vars);
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, dir, isRTL: dir === 'rtl', setLang, t }),
    [lang, dir, setLang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

/** Raccourci pratique pour ne récupérer que la fonction de traduction et la langue. */
export function useT() {
  const { t, lang, dir, isRTL, setLang } = useLanguage();
  return { t, lang, dir, isRTL, setLang };
}

// ---------------------------------------------------------------------------
// Helpers de localisation du contenu dynamique (offres) et de formatage
// ---------------------------------------------------------------------------

const LOCALE_MAP: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  ar: 'ar-MA',
};

/**
 * Renvoie une offre dont les champs textuels pointent vers la traduction
 * correspondant à la langue, avec repli automatique sur le français (champ d'origine).
 */
export function localizeOffer<T extends Record<string, any>>(offer: T, lang: Lang): T {
  if (!offer || lang === 'fr') return offer;
  const pick = (base: string) => offer[`${base}_${lang}`] || offer[base];
  return {
    ...offer,
    emploi_metier: pick('emploi_metier'),
    full_description: pick('full_description'),
    meta_description: pick('meta_description'),
    required_skills:
      (offer as any)[`required_skills_${lang}`]?.length
        ? (offer as any)[`required_skills_${lang}`]
        : offer.required_skills,
  };
}

/** Libellé localisé d'une ville (repli : nom brut). */
export function cityLabel(t: (k: string) => string, ville: string): string {
  const key = `city.${ville}`;
  const label = t(key);
  return label === key ? ville : label;
}

/** Libellé court localisé d'un type de contrat (badge). */
export function contractShort(t: (k: string) => string, type: string): string {
  const key = `contract.${type}.short`;
  const label = t(key);
  return label === key ? type : label;
}

/** Libellé long localisé d'un type de contrat. */
export function contractLong(t: (k: string) => string, type: string): string {
  const key = `contract.${type}.long`;
  const label = t(key);
  return label === key ? type : label;
}

/** Date formatée selon la langue active. */
export function formatDateLocalized(dateString: string, lang: Lang): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(LOCALE_MAP[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Nombre de postes localisé. */
export function positionsLabel(t: (k: string, v?: Record<string, string | number>) => string, n: number): string {
  return n === 1 ? t('common.position') : t('common.positions', { count: n });
}

/** Nombre d'offres localisé. */
export function offersCountLabel(t: (k: string, v?: Record<string, string | number>) => string, n: number): string {
  return n === 1 ? t('common.offerCount') : t('common.offersCount', { count: n });
}
