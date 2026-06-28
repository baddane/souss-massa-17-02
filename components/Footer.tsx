import React from 'react';
import { Link } from 'react-router-dom';
import { useT, cityLabel } from '../src/i18n/LanguageContext';

const SECTOR_LINKS = [
  { key: 'informatique', sector: 'informatique' },
  { key: 'commercial', sector: 'commercial' },
  { key: 'tourisme', sector: 'tourisme' },
  { key: 'industrie', sector: 'industrie' },
  { key: 'administratif', sector: 'administratif' },
  { key: 'sante', sector: 'sante' },
  { key: 'construction', sector: 'construction' },
  { key: 'enseignement', sector: 'enseignement' },
];

const CITY_LINKS = ['Agadir', 'Inezgane', 'Taroudant', 'Marrakech', 'Essaouira'];

const Footer: React.FC = () => {
  const { t } = useT();

  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-1">
              <span className="text-lg font-bold text-white">SoussMassa</span>
              <span className="text-lg font-light text-blue-400">-RH</span>
            </Link>
            <p className="text-sm mt-2 leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">{t('footer.bySector')}</h3>
            <nav className="flex flex-col gap-1.5 text-sm">
              {SECTOR_LINKS.map(({ key, sector }) => (
                <Link key={sector} to={`/offres?sector=${sector}`} className="hover:text-white transition-colors">
                  {t(`sector.${key}`)}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">{t('footer.byCity')}</h3>
            <nav className="flex flex-col gap-1.5 text-sm">
              {CITY_LINKS.map((city) => (
                <Link key={city} to={`/offres?city=${city}`} className="hover:text-white transition-colors">
                  {t('footer.jobsIn', { city: cityLabel(t, city) })}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">{t('footer.navigation')}</h3>
            <nav className="flex flex-col gap-1.5 text-sm">
              <Link to="/" className="hover:text-white transition-colors">{t('footer.home')}</Link>
              <Link to="/offres" className="hover:text-white transition-colors">{t('nav.allOffers')}</Link>
              <Link to="/contact" className="hover:text-white transition-colors">{t('nav.contact')}</Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} soussmassa-rh.com — {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
