import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
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
              Le portail emploi de reference dans la region Souss-Massa. CDI, CDD, Stage a Agadir et environs.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Par secteur</h3>
            <nav className="flex flex-col gap-1.5 text-sm">
              <Link to="/offres?sector=informatique" className="hover:text-white transition-colors">Informatique & IT</Link>
              <Link to="/offres?sector=commercial" className="hover:text-white transition-colors">Commerce & Vente</Link>
              <Link to="/offres?sector=tourisme" className="hover:text-white transition-colors">Tourisme & Hotellerie</Link>
              <Link to="/offres?sector=industrie" className="hover:text-white transition-colors">Industrie</Link>
              <Link to="/offres?sector=administratif" className="hover:text-white transition-colors">Administration</Link>
              <Link to="/offres?sector=sante" className="hover:text-white transition-colors">Sante</Link>
              <Link to="/offres?sector=construction" className="hover:text-white transition-colors">BTP & Construction</Link>
              <Link to="/offres?sector=enseignement" className="hover:text-white transition-colors">Education</Link>
            </nav>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Par ville</h3>
            <nav className="flex flex-col gap-1.5 text-sm">
              <Link to="/offres?city=Agadir" className="hover:text-white transition-colors">Emploi Agadir</Link>
              <Link to="/offres?city=Inezgane" className="hover:text-white transition-colors">Emploi Inezgane</Link>
              <Link to="/offres?city=Taroudant" className="hover:text-white transition-colors">Emploi Taroudant</Link>
              <Link to="/offres?city=Marrakech" className="hover:text-white transition-colors">Emploi Marrakech</Link>
              <Link to="/offres?city=Essaouira" className="hover:text-white transition-colors">Emploi Essaouira</Link>
            </nav>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Navigation</h3>
            <nav className="flex flex-col gap-1.5 text-sm">
              <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
              <Link to="/offres" className="hover:text-white transition-colors">Toutes les offres</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} soussmassa-rh.com — Tous droits reserves</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
