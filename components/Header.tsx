import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useT } from '../src/i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useT();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-14 items-center">
          <Link to="/" className="flex items-center gap-1">
            <span className="text-xl font-bold text-blue-700">SoussMassa</span>
            <span className="text-xl font-light text-gray-400">-RH</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/offres"
              className={`text-sm font-semibold transition-colors ${
                location.pathname === '/offres' ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              {t('nav.allOffers')}
            </Link>
            <Link
              to="/contact"
              className={`text-sm font-semibold transition-colors ${
                location.pathname === '/contact' ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              {t('nav.contact')}
            </Link>
            <Link
              to="/espace-entreprise"
              className={`text-sm font-semibold transition-colors ${
                location.pathname.includes('entreprise') ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              {t('nav.companyArea')}
            </Link>
            <Link
              to="/offres"
              className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              {t('nav.findJob')}
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
          <Link to="/contact" className="block px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
            {t('nav.contact')}
          </Link>
          <Link to="/espace-entreprise" className="block px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
            {t('nav.companyArea')}
          </Link>
          <Link to="/offres" className="block bg-orange-500 text-white text-center py-3 rounded-lg font-bold">
            {t('nav.findJob')}
          </Link>
          <LanguageSwitcher variant="mobile" />
        </nav>
      )}
    </header>
  );
};

export default Header;
