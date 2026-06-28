import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../src/i18n/LanguageContext';
import { LANGUAGES, Lang } from '../src/i18n/translations';

interface Props {
  variant?: 'desktop' | 'mobile';
}

const LanguageSwitcher: React.FC<Props> = ({ variant = 'desktop' }) => {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  const choose = (code: Lang) => {
    setLang(code);
    setOpen(false);
  };

  if (variant === 'mobile') {
    return (
      <div className="flex gap-2 pt-1">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => choose(l.code)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
              l.code === lang
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-blue-700 transition-colors px-2 py-1.5 rounded-lg"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('nav.language')}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="uppercase">{current.code}</span>
        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-start hover:bg-gray-50 transition-colors ${
                l.code === lang ? 'text-blue-700 font-semibold' : 'text-gray-700'
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
