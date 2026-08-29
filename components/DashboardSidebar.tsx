import React, { useEffect, useState } from 'react';
import { useT } from '../src/i18n/LanguageContext';

// Navigation laterale commune aux trois tableaux de bord : admin, entreprise et
// candidat.
//
// Ils portaient chacun une barre d'onglets horizontale. Sur les dix onglets de
// l'admin, la barre debordait de l'ecran des le format tablette et la moitie
// n'etait plus atteignable sur telephone. Une colonne verticale absorbe les
// onglets a venir sans jamais deborder, et se replie quand la place manque.
//
// Deux comportements distincts, un seul composant :
//   - a partir de `lg`, la colonne est dans le flux et se replie en bande
//     d'icones (choix retenu dans localStorage, par tableau de bord) ;
//   - en dessous, elle sort du flux et s'ouvre en tiroir par-dessus le contenu,
//     avec voile sombre — le contenu garde toute la largeur le reste du temps.
//
// Les libelles des onglets arrivent DEJA TRADUITS par l'appelant : les espaces
// entreprise et candidat sont trilingues, l'admin non. Seuls les libelles
// propres au menu (ouvrir, replier…) sont traduits ici.

export interface AdminTabItem {
  id: string;
  label: string;
  count?: number;
  /** Pastille d'alerte (messages non lus, entreprises a valider). */
  alerte?: number;
  alerteCouleur?: 'rouge' | 'orange';
  icone: React.ReactNode;
}

// Le repli est memorise par tableau de bord : replier l'admin ne doit pas
// replier l'espace candidat, qui n'a que quatre onglets.
const clePli = (espace: string) => `ssm_sidebar_replie_${espace}`;

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
  alertes: <I d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  reglages: <I d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.1a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 7 2.6h.1a1.7 1.7 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />,
  emplois: <I d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />,
  rafraichir: <I d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />,
  deconnexion: <I d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

/** Actions de pied de colonne (rafraichir, se deconnecter). */
export interface AdminSidebarAction {
  label: string;
  icone: React.ReactNode;
  onClick: () => void;
  discret?: boolean;
}

interface Props {
  /** Identifie le tableau de bord : sert de cle au repli memorise. */
  espace: string;
  titre: string;
  tabs: AdminTabItem[];
  actif: string;
  onSelect: (id: string) => void;
  actions?: AdminSidebarAction[];
  /** Couleur de l'onglet actif : bleu par defaut, orange cote candidat. */
  accent?: 'bleu' | 'orange';
  /** Tiroir mobile : pilote par le parent, qui porte le bouton d'ouverture. */
  ouvertMobile: boolean;
  onFermerMobile: () => void;
}

const DashboardSidebar: React.FC<Props> = ({
  espace, titre, tabs, actif, onSelect, actions = [], accent = 'bleu', ouvertMobile, onFermerMobile,
}) => {
  const { t } = useT();
  const [replie, setReplie] = useState(false);
  const fondActif = accent === 'orange' ? 'bg-orange-500' : 'bg-blue-600';
  const texteCount = accent === 'orange' ? 'text-orange-100' : 'text-blue-100';

  // Le choix de repli est une commodite : s'il n'est pas relisible (navigation
  // privee, stockage bloque), on repart deploye plutot que de planter.
  useEffect(() => {
    try { setReplie(localStorage.getItem(clePli(espace)) === '1'); } catch { /* ignore */ }
  }, [espace]);

  const basculerRepli = () => {
    setReplie((v) => {
      const n = !v;
      try { localStorage.setItem(clePli(espace), n ? '1' : '0'); } catch { /* ignore */ }
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

  const lien = (tab: AdminTabItem) => {
    const on = actif === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => { onSelect(tab.id); onFermerMobile(); }}
        title={replie ? tab.label : undefined}
        aria-current={on ? 'page' : undefined}
        className={`relative w-full flex items-center gap-3 rounded-xl text-sm font-semibold transition-colors
          ${replie ? 'lg:justify-center lg:px-0 px-3' : 'px-3'} py-2.5
          ${on ? `${fondActif} text-white` : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        {tab.icone}
        <span className={replie ? 'lg:hidden' : ''}>
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className={`ms-1 font-normal ${on ? texteCount : 'text-gray-400'}`}>({tab.count})</span>
          )}
        </span>
        {!!tab.alerte && tab.alerte > 0 && (
          <span
            className={`absolute ${replie ? 'lg:top-1 lg:end-1' : ''} top-1.5 end-2 min-w-[18px] h-[18px] px-1
              rounded-full text-[11px] font-bold text-white flex items-center justify-center
              ${tab.alerteCouleur === 'orange' ? 'bg-orange-500' : 'bg-red-500'}`}
          >
            {tab.alerte}
          </span>
        )}
      </button>
    );
  };

  const contenu = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 px-3 py-4 ${replie ? 'lg:justify-center' : ''}`}>
        <span className={`font-bold text-gray-900 truncate ${replie ? 'lg:hidden' : ''}`}>{titre}</span>
        <button
          onClick={basculerRepli}
          className="hidden lg:inline-flex ms-auto w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label={replie ? t('dash.menu.expand') : t('dash.menu.collapse')}
          title={replie ? t('dash.menu.expand') : t('dash.menu.collapse')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:-scale-x-100">
            <path d={replie ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
          </svg>
        </button>
        <button
          onClick={onFermerMobile}
          className="lg:hidden ms-auto w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label={t('dash.menu.close')}
        >
          <span className="text-xl leading-none">×</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">{tabs.map(lien)}</nav>

      {actions.length > 0 && (
        <div className="border-t border-gray-200 p-2 space-y-1">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              title={replie ? a.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-100
                ${a.discret ? 'text-gray-500' : 'text-gray-600'}
                ${replie ? 'lg:justify-center lg:px-0 px-3' : 'px-3'}`}
            >
              {a.icone}
              <span className={replie ? 'lg:hidden' : ''}>{a.label}</span>
            </button>
          ))}
        </div>
      )}
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
          aria-label={titre}
        >
          {contenu}
        </div>
      </div>
    </>
  );
};

export default DashboardSidebar;
