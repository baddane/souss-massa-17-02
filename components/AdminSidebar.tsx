import React, { useEffect, useState } from 'react';

// Navigation du tableau de bord admin.
//
// Elle etait une barre d'onglets horizontale : dix onglets sur une seule ligne
// debordaient de l'ecran des le format tablette, et sur telephone la moitie
// n'etait plus atteignable. Une colonne verticale absorbe les onglets a venir
// sans jamais deborder, et se replie quand la place manque.
//
// Deux comportements distincts, un seul composant :
//   - a partir de `lg`, la colonne est dans le flux et se replie en bande
//     d'icones (choix retenu dans localStorage) ;
//   - en dessous, elle sort du flux et s'ouvre en tiroir par-dessus le contenu,
//     avec voile sombre — le contenu garde toute la largeur le reste du temps.

export interface AdminTabItem {
  id: string;
  label: string;
  count?: number;
  /** Pastille d'alerte (messages non lus, entreprises a valider). */
  alerte?: number;
  alerteCouleur?: 'rouge' | 'orange';
  icone: React.ReactNode;
}

const CLE_REPLI = 'ssm_admin_sidebar_replie';

const I = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    <path d={d} />
  </svg>
);

export const ICONES = {
  candidatures: <I d="M9 12h6M9 16h6M9 8h2M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />,
  messages: <I d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
  entreprises: <I d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 13v.01M9 17v.01" />,
  offres: <I d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
  nouvelle: <I d="M12 5v14M5 12h14" />,
  cvtheque: <I d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />,
  observatoire: <I d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  prospection: <I d="M3 8l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />,
  identifiants: <I d="M15 7a4 4 0 1 1-3.9 5H8v3H6v3H2v-3.5L9.1 12A4 4 0 0 1 15 7Z" />,
  compte: <I d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />,
};

interface Props {
  tabs: AdminTabItem[];
  actif: string;
  onSelect: (id: string) => void;
  onRafraichir: () => void;
  onDeconnexion: () => void;
  /** Tiroir mobile : pilote par le parent, qui porte le bouton d'ouverture. */
  ouvertMobile: boolean;
  onFermerMobile: () => void;
}

const AdminSidebar: React.FC<Props> = ({
  tabs, actif, onSelect, onRafraichir, onDeconnexion, ouvertMobile, onFermerMobile,
}) => {
  const [replie, setReplie] = useState(false);

  // Le choix de repli est une commodite : s'il n'est pas relisible (navigation
  // privee, stockage bloque), on repart deploye plutot que de planter.
  useEffect(() => {
    try { setReplie(localStorage.getItem(CLE_REPLI) === '1'); } catch { /* ignore */ }
  }, []);

  const basculerRepli = () => {
    setReplie((v) => {
      const n = !v;
      try { localStorage.setItem(CLE_REPLI, n ? '1' : '0'); } catch { /* ignore */ }
      return n;
    });
  };

  // Sur mobile le tiroir recouvre le contenu : Echap doit pouvoir le refermer,
  // et le fond ne doit pas defiler derriere.
  useEffect(() => {
    if (!ouvertMobile) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermerMobile(); };
    document.addEventListener('keydown', onKey);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = avant; };
  }, [ouvertMobile, onFermerMobile]);

  const largeur = replie ? 'lg:w-[72px]' : 'lg:w-64';

  const lien = (t: AdminTabItem) => {
    const on = actif === t.id;
    return (
      <button
        key={t.id}
        onClick={() => { onSelect(t.id); onFermerMobile(); }}
        title={replie ? t.label : undefined}
        aria-current={on ? 'page' : undefined}
        className={`relative w-full flex items-center gap-3 rounded-xl text-sm font-semibold transition-colors
          ${replie ? 'lg:justify-center lg:px-0 px-3' : 'px-3'} py-2.5
          ${on ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        {t.icone}
        <span className={replie ? 'lg:hidden' : ''}>
          {t.label}
          {typeof t.count === 'number' && (
            <span className={`ms-1 font-normal ${on ? 'text-blue-100' : 'text-gray-400'}`}>({t.count})</span>
          )}
        </span>
        {!!t.alerte && t.alerte > 0 && (
          <span
            className={`absolute ${replie ? 'lg:top-1 lg:end-1' : ''} top-1.5 end-2 min-w-[18px] h-[18px] px-1
              rounded-full text-[11px] font-bold text-white flex items-center justify-center
              ${t.alerteCouleur === 'orange' ? 'bg-orange-500' : 'bg-red-500'}`}
          >
            {t.alerte}
          </span>
        )}
      </button>
    );
  };

  const contenu = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 px-3 py-4 ${replie ? 'lg:justify-center' : ''}`}>
        <span className={`font-bold text-gray-900 ${replie ? 'lg:hidden' : ''}`}>Administration</span>
        <button
          onClick={basculerRepli}
          className="hidden lg:inline-flex ms-auto w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label={replie ? 'Déplier le menu' : 'Replier le menu'}
          title={replie ? 'Déplier le menu' : 'Replier le menu'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={replie ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
          </svg>
        </button>
        <button
          onClick={onFermerMobile}
          className="lg:hidden ms-auto w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Fermer le menu"
        >
          <span className="text-xl leading-none">×</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">{tabs.map(lien)}</nav>

      <div className="border-t border-gray-200 p-2 space-y-1">
        <button
          onClick={onRafraichir}
          title={replie ? 'Rafraîchir' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100
            ${replie ? 'lg:justify-center lg:px-0 px-3' : 'px-3'}`}
        >
          <I d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />
          <span className={replie ? 'lg:hidden' : ''}>Rafraîchir</span>
        </button>
        <button
          onClick={onDeconnexion}
          title={replie ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100
            ${replie ? 'lg:justify-center lg:px-0 px-3' : 'px-3'}`}
        >
          <I d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          <span className={replie ? 'lg:hidden' : ''}>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Colonne dans le flux a partir de lg. `sticky` plutot que `fixed` : la
          page garde une seule barre de defilement. */}
      <aside
        className={`hidden lg:block shrink-0 ${largeur} transition-[width] duration-200
          border-e border-gray-200 bg-white sticky top-0 h-screen`}
      >
        {contenu}
      </aside>

      {/* Tiroir mobile. Toujours monte pour que la transition joue ; rendu
          inerte quand il est ferme, sinon il capterait les clics du contenu. */}
      <div className={`lg:hidden fixed inset-0 z-40 ${ouvertMobile ? '' : 'pointer-events-none'}`} aria-hidden={!ouvertMobile}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${ouvertMobile ? 'opacity-100' : 'opacity-0'}`}
          onClick={onFermerMobile}
        />
        <div
          className={`absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-white shadow-2xl
            transition-transform duration-200 ${ouvertMobile ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Menu d'administration"
        >
          {contenu}
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
