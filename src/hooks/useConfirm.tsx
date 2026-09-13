import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/LanguageContext';

// Remplace `window.confirm`, qui avait trois defauts :
//   - il GELE le fil principal tant que l'utilisateur n'a pas repondu. Les
//     outils de mesure (INP de Vercel) comptent ce temps de reflexion humain
//     comme un blocage de l'interface — d'ou les alertes « Event handlers on
//     this element blocked UI updates for 1 723 ms » sur un simple bouton ;
//   - il n'est pas traduisible : un visiteur en arabe voyait une boite en
//     francais, avec des boutons dans la langue de son navigateur ;
//   - il ignore la charte du site.
//
// L'API garde la forme de `confirm` pour que le remplacement reste mecanique :
//   if (!(await confirmer({ message: '…' }))) return;

export interface ConfirmOptions {
  message: string;
  title?: string;
  /** Libelle du bouton d'action. Par defaut « Confirmer », ou « Supprimer » si `danger`. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Action destructive : bouton rouge. */
  danger?: boolean;
}

type Demande = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useT();
  const [demande, setDemande] = useState<Demande | null>(null);
  const boutonRef = useRef<HTMLButtonElement>(null);

  const confirmer = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setDemande({ ...o, resolve })),
    [],
  );

  const repondre = useCallback((ok: boolean) => {
    setDemande((d) => { d?.resolve(ok); return null; });
  }, []);

  useEffect(() => {
    if (!demande) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') repondre(false); };
    document.addEventListener('keydown', onKey);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Le focus part sur le bouton d'action : « Entree » confirme, « Echap »
    // annule, comme dans la boite native qu'on remplace.
    boutonRef.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = avant; };
  }, [demande, repondre]);

  return (
    <ConfirmContext.Provider value={confirmer}>
      {children}
      {demande && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-titre"
          onClick={() => repondre(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-titre" className="text-lg font-bold text-gray-900">
              {demande.title || t('confirm.title')}
            </h2>
            {/* `whitespace-pre-line` : plusieurs messages portent des retours a
                la ligne, herites des boites natives. */}
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{demande.message}</p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => repondre(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {demande.cancelLabel || t('confirm.cancel')}
              </button>
              <button
                ref={boutonRef}
                type="button"
                onClick={() => repondre(true)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white ${
                  demande.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {demande.confirmLabel || (demande.danger ? t('confirm.delete') : t('confirm.ok'))}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm exige <ConfirmProvider> (monte dans App.tsx)');
  return ctx;
}
