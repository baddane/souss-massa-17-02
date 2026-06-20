import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <Link to="/" className="flex items-center gap-1">
              <span className="text-lg font-bold text-white">SoussMassa</span>
              <span className="text-lg font-light text-blue-400">-RH</span>
            </Link>
            <p className="text-sm mt-1">Emploi et recrutement — Souss-Massa, Maroc</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <Link to="/offres" className="hover:text-white transition-colors">Offres d'emploi</Link>
            <Link to="/offres?city=Agadir" className="hover:text-white transition-colors">Emploi Agadir</Link>
            <Link to="/offres?city=Taroudant" className="hover:text-white transition-colors">Emploi Taroudant</Link>
            <Link to="/offres?city=Inezgane" className="hover:text-white transition-colors">Emploi Inezgane</Link>
          </nav>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          <p>© {new Date().getFullYear()} soussmassa-rh.com — Tous droits réservés</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
