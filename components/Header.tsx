import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useT } from '../src/i18n/LanguageContext';
import { useAccount } from '../src/hooks/useAccount';
import LanguageSwitcher from './LanguageSwitcher';

// Le menu s'adapte a qui regarde.
//
// Avant : sept entrees a plat, dont « Toutes les offres » et « Trouver un
// emploi » qui menaient a la MEME page — le bouton le plus visible du site etait
// donc un doublon — et un « Mon espace » qui presuppose la possession, affiche
// meme a un visiteur sans compte, et qui envoyait une entreprise vers l'espace
// candidat.
//
// Maintenant : les liens de navigation a gauche, et a droite deux actions
// symetriques, une par audience, formulees comme des ACTIONS et non comme des
// lieux — « Déposer une offre » / « Déposer mon CV ». Une fois connecte, le
// bouton devient l'espace correspondant au compte, sans ambiguite possible.

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useT();
  const account = useAccount();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLink = (to: string, label: string, active: boolean) => (
    <Link
      to={to}
      className={`text-sm font-semibold transition-colors ${
        active ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'
      }`}
    >
      {label}
    </Link>
  );

  // Bouton recruteur (contour). Une entreprise connectee va droit a son espace.
  const recruiter =
    account.kind === 'company'
      ? { to: '/espace-entreprise', label: t('nav.companySpace') }
      : { to: '/recruter', label: t('nav.postOffer') };

  // Bouton candidat (plein). Tant qu'on ne sait pas encore qui regarde, on
  // affiche l'action d'inscription : c'est vrai pour la majorite des visiteurs,
  // et un candidat connecte voit le libelle corrige en une fraction de seconde.
  const candidate =
    account.kind === 'candidate'
      ? { to: '/espace-candidat', label: t('nav.candidateSpaceFull') }
      : { to: '/inscription-candidat', label: t('nav.depositCv') };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-14 items-center">
          <Link to="/" className="flex items-center gap-1">
            <span className="text-xl font-bold text-blue-700">SoussMassa</span>
            <span className="text-xl font-light text-gray-400">-RH</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            {navLink('/offres', t('nav.allOffers'), location.pathname === '/offres')}
            {navLink('/observatoire', t('nav.observatoire'), location.pathname.startsWith('/observatoire'))}
            {navLink('/contact', t('nav.contact'), location.pathname === '/contact')}

            <span className="h-5 w-px bg-gray-200" aria-hidden="true" />

            <Link
              to={recruiter.to}
              className="inline-flex items-center gap-1.5 border-2 border-blue-600 text-blue-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {recruiter.label}
            </Link>
            <Link
              to={candidate.to}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              {candidate.label}
            </Link>
            <LanguageSwitcher />
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600"
            aria-label={t('nav.menu')}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="md:hidden bg-white border-t border-gray-100 py-3 px-4 space-y-2">
          <Link to="/offres" className="block px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
            {t('nav.allOffers')}
          </Link>
          <Link to="/observatoire" className="block px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
            {t('nav.observatoire')}
          </Link>
          <Link to="/contact" className="block px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
            {t('nav.contact')}
          </Link>
          <Link
            to={recruiter.to}
            className="flex items-center justify-center gap-1.5 border-2 border-blue-600 text-blue-700 text-center py-2.5 rounded-lg font-bold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {recruiter.label}
          </Link>
          <Link to={candidate.to} className="block bg-orange-500 text-white text-center py-3 rounded-lg font-bold">
            {candidate.label}
          </Link>
          <LanguageSwitcher variant="mobile" />
        </nav>
      )}
    </header>
  );
};

export default Header;
