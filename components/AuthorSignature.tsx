import React from 'react';
import { AUTEUR } from '../src/config/author';

// Bloc de signature affiche sous chaque article de l'Observatoire.
//
// Le lien LinkedIn n'apparait que si l'URL est renseignee dans
// `src/config/author.ts` : un lien vide ou errone serait pire que pas de lien.

const AuthorSignature: React.FC<{ nom?: string | null }> = ({ nom }) => {
  const auteur = (nom || '').trim() || AUTEUR.nom;
  const initiales = auteur.split(/\s+/).slice(0, 2).map((m) => m[0] || '').join('').toUpperCase();

  return (
    <aside className="mt-10 pt-6 border-t border-gray-200">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 grid place-items-center font-bold shrink-0">
          {initiales}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Analyse signée</p>
          <p className="font-bold text-gray-900">{auteur}</p>
          <p className="text-sm text-gray-600">{AUTEUR.titre}</p>
          {AUTEUR.linkedin && (
            <a
              href={AUTEUR.linkedin}
              target="_blank"
              rel="noopener noreferrer me author"
              className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
              </svg>
              Voir le profil LinkedIn
            </a>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AuthorSignature;
