import React from 'react';
import { Link } from 'react-router-dom';

// Bandeau de conversion « employeur » à placer sur les pages à fort trafic candidat
// (offres, observatoire) : capte les recruteurs et irrigue /recruter en interne.
const RecruiterCTA: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 my-10">
    <div className="bg-blue-600 rounded-3xl px-6 py-8 sm:px-10 flex flex-col sm:flex-row items-center gap-5 text-white">
      <div className="flex-1 text-center sm:text-start">
        <h2 className="text-xl sm:text-2xl font-black mb-1">Vous recrutez en Souss-Massa ?</h2>
        <p className="text-blue-100 text-sm">Publiez votre offre d’emploi gratuitement et accédez à la CVthèque régionale.</p>
      </div>
      <Link to="/recruter" className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors whitespace-nowrap">
        Déposer une offre
      </Link>
    </div>
  </div>
);

export default RecruiterCTA;
